import os from 'os';
import { Queue, Worker, Job } from 'bullmq';
import { SingleBar, Presets } from 'cli-progress';
import { updateImages } from '@/processor/imagesProcessor';
import { ITEM_CONVERT_STATS, ITEM_TYPE } from '@typings';
import { getLatestMovieData } from '@/tmdb_dump';

const queueName = 'movie-image-queue';
const movieImageQueue = new Queue(queueName);
const connection = { host: 'localhost', port: 6379 };

const startWorker = (db: any) => {
  const concurrency = os.cpus().length * 2;
  console.log(`Starting worker with concurrency = ${concurrency}`);

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const { movieId } = job.data;
      return updateImages(db, movieId, ITEM_TYPE.MOVIE);
    },
    {
      concurrency,
      connection
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error: ${err}`);
  });

  return worker;
};

export const generateMovieImages = async (db: any): Promise<ITEM_CONVERT_STATS> => {
  // Start the worker
  const worker = startWorker(db);

  // Fetch and optionally limit movieIds
  const moviesData = await getLatestMovieData();
  let movieIds = moviesData.map((m) => m.id);
  if (process.env.TEST_LIMIT) {
    movieIds = movieIds.slice(0, parseInt(process.env.TEST_LIMIT, 10));
  }

  console.log(`Enqueuing jobs for ${movieIds.length} movies...`);

  // Enqueue jobs
  for (const movieId of movieIds) {
    await movieImageQueue.add('movieImageConvert', { movieId });
  }
  console.log(`All ${movieIds.length} jobs have been enqueued.`);

  // Setup progress bar
  const totalJobs = movieIds.length;
  const progressBar = new SingleBar(
    {
      format: 'Progress |{bar}| {percentage}% | Elapsed: {duration_formatted} | ETA: {eta_formatted} | {value}/{total} jobs',
    },
    Presets.shades_classic
  );
  progressBar.start(totalJobs, 0);

  // Stats aggregator
  const aggregator: ITEM_CONVERT_STATS = {
    totalConverted: 0,
    totalFailed: 0,
    totalOriginalSizeBytes: 0,
    totalSizeBytes: 0,
    averageCompressionRatio: 0,
  };

  return new Promise<ITEM_CONVERT_STATS>((resolve) => {
    // On each completion, update stats + progress
    worker.on('completed', (_job, result: ITEM_CONVERT_STATS) => {
      aggregator.totalConverted += result.totalConverted;
      aggregator.totalFailed += result.totalFailed;
      aggregator.totalOriginalSizeBytes += result.totalOriginalSizeBytes;
      aggregator.totalSizeBytes += result.totalSizeBytes;

      if (aggregator.totalOriginalSizeBytes > 0) {
        aggregator.averageCompressionRatio =
          aggregator.totalSizeBytes / aggregator.totalOriginalSizeBytes;
      }

      progressBar.increment();

      // If all jobs completed, stop + log + resolve
      if (progressBar.getProgress() == 1) {
        progressBar.stop();
        console.log('All jobs completed!');
        console.log('Aggregated Stats:', aggregator);
        worker.close();
        resolve(aggregator);
      }
    });
  });
};
