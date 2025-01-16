import { bulkUpsertRecords, initDB } from '@/db';
import { getLatestMovieData } from '@/tmdb_dump';
import { DB_IMAGE_ITEM, ITEM_TYPE, TMDB_IMAGE } from '@/typings';
import axios from 'axios';
import http from 'http';
import https from 'https';

require('dotenv').config();

const BATCH_SIZE = 200;
const TEST_BATCHES = 20;
const ETA_WINDOW_SIZE = 5; // Number of recent batches to average for ETA calculation
const MAX_RETRIES = 5; // Maximum retries for exponential backoff
const INITIAL_DELAY_MS = 100; // Initial delay in milliseconds for backoff

const axiosInstance = axios.create({
  baseURL: 'https://api.themoviedb.org/3/movie/',
  timeout: 5000,
  params: { api_key: process.env.TMDB_API_KEY, append_to_response: 'images' },
  httpAgent: new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 5000,
    maxSockets: 100,
    maxFreeSockets: 10,
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 5000,
    maxSockets: 100,
    maxFreeSockets: 10,
  }),
});

// Retry function with exponential backoff
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> => {
  let attempt = 0;
  let delay = INITIAL_DELAY_MS;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.response?.status === 429 && attempt < retries) {
        console.warn(`Retrying... Attempt ${attempt + 1}, Delay: ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        attempt++;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
};

export const getMovieImages = async (movieId: string): Promise<TMDB_IMAGE> => {
  try {
    const { data: movie }: any = await retryWithBackoff(() => axiosInstance.get(`${movieId}`));
    const poster = movie.poster_path;
    const backdrop = movie.backdrop_path;
    const logo = movie.images.logos.find(({ iso_639_1 }: { iso_639_1: string }) => iso_639_1 === 'en')?.file_path;
    const widePoster = movie.images.backdrops.find(({ iso_639_1 }: { iso_639_1: string }) => iso_639_1 === 'en')?.file_path;

    return {
      name: movie.title,
      id: movie.id,
      imdb_id: movie.imdb_id,
      poster,
      backdrop,
      logo,
      widePoster,
    };
  } catch (error: any) {
    console.error('Error fetching movie data:', error.message);
    return {} as TMDB_IMAGE;
  }
};

const processBatch = async (movieIds: string[], db: any): Promise<void> => {
  const results = await Promise.all(movieIds.map(getMovieImages));
  const dbUpdates = results
    .filter((result) => result.id)
    .map((result) => ({
      id: result.id,
      type: ITEM_TYPE.MOVIE,
      logo: { original: result.logo },
      poster: { original: result.poster },
      backdrop: { original: result.backdrop },
      widePoster: { original: result.widePoster },
      lastUpdated: new Date().toISOString(),
    } as DB_IMAGE_ITEM));
  await bulkUpsertRecords(db, dbUpdates);
};

const main = async () => {
  const db = await initDB();
  console.log(`Batch size: ${BATCH_SIZE}, Test batches: ${TEST_BATCHES}`);
  console.log('Starting benchmark...');

  const movieIds = (await getLatestMovieData()).map(({ id }) => id);
  const totalBatches = Math.ceil(movieIds.length / BATCH_SIZE);
  const startTime = Date.now();

  let batchCount = 0;
  const recentBatchTimes: number[] = []; // Track recent batch durations

  for (let i = 0; i < movieIds.length; i += BATCH_SIZE) {
    const batch = movieIds.slice(i, i + BATCH_SIZE);
    const batchStartTime = Date.now();

    try {
      await processBatch(batch, db);
    } catch (error: any) {
      console.error(`Failed to process batch ${batchCount + 1}:`, error.message);
    }

    batchCount++;
    const batchDuration = Date.now() - batchStartTime;
    recentBatchTimes.push(batchDuration);

    // Limit the size of recentBatchTimes for ETA calculation
    if (recentBatchTimes.length > ETA_WINDOW_SIZE) {
      recentBatchTimes.shift();
    }

    const avgTimePerBatch = recentBatchTimes.reduce((a, b) => a + b, 0) / recentBatchTimes.length;
    const remainingBatches = totalBatches - batchCount;
    const eta = avgTimePerBatch * remainingBatches / 1000; // Convert to seconds

    console.log(
      `Batch ${batchCount} of ${totalBatches} completed in ${batchDuration} ms. ` +
        `Elapsed: ${(Date.now() - startTime) / 1000}s, ETA: ${eta.toFixed(2)}s`
    );
  }

  console.log('Benchmark completed.');
};

main().catch((err) => console.error('Error in benchmark:', err));
