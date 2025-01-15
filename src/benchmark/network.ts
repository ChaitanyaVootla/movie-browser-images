import { bulkUpsertRecords, initDB } from '@/db';
import { getLatestMovieData } from '@/tmdb_dump';
import { DB_IMAGE_ITEM, ITEM_TYPE, TMDB_IMAGE } from '@/typings';
import axios from 'axios';
import http from 'http';
import https from 'https';

require('dotenv').config();

const BATCH_SIZE = 200;
const TEST_BATCHES = 20;

const axiosInstance = axios.create({
  baseURL: 'https://api.themoviedb.org/3/movie/',
  timeout: 5000,
  params: { api_key: process.env.TMDB_API_KEY, append_to_response: "images" },
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

export const getMovieImages = async (movieId: string): Promise<TMDB_IMAGE> => {
    try {
        const {data: movie}: any = await axiosInstance.get(`${movieId}`);
        const poster = movie.poster_path;
        const backdrop = movie.backdrop_path;
        const logo = movie.images.logos.find(({ iso_639_1 }: { iso_639_1: string}) => iso_639_1 === 'en')?.file_path;
        const widePoster = movie.images.backdrops.find(({ iso_639_1 }: { iso_639_1: string}) => iso_639_1 === 'en')?.file_path;

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

// Process batch of BATCH_SIZE parallel calls
const processBatch = async (movieIds: string[], db: any): Promise<void> => {

  // BATCH_SIZE parallel requests
  const results = await Promise.all(movieIds.map(getMovieImages));

  const dbUpdates = [] as DB_IMAGE_ITEM[];
  results.forEach((result) => {
    if (result.id) {
      dbUpdates.push({
        id: result.id,
        type: ITEM_TYPE.MOVIE,
        logo: { original: result.logo },
        poster: { original: result.poster },
        backdrop: { original: result.backdrop },
        widePoster: { original: result.widePoster },
        lastUpdated: new Date().toISOString(),
      });
    }
  });

  await bulkUpsertRecords(db, dbUpdates);
};

const main = async () => {
    const db = await initDB();
    console.log(`Batch size: ${BATCH_SIZE}, Test batches: ${TEST_BATCHES}`);
    console.log('Starting benchmark...');
  
    const movieIds = (await getLatestMovieData()).map(({ id }) => id);
  
    // // Limit to TEST_BATCHES batches for testing
    // movieIds.length = TEST_BATCHES * BATCH_SIZE;
  
    const totalBatches = Math.ceil(movieIds.length / BATCH_SIZE);
    const startTime = Date.now(); // Track the start time
    let batchCount = 0;
  
    for (let i = 0; i < movieIds.length; i += BATCH_SIZE) {
      const batch = movieIds.slice(i, i + BATCH_SIZE);
      const batchStartTime = Date.now();
  
      // Process the batch
      await processBatch(batch, db);
  
      batchCount++;
  
      // Calculate elapsed time and ETA
      const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
      const avgTimePerBatch = elapsedTime / batchCount;
      const remainingBatches = totalBatches - batchCount;
      const eta = avgTimePerBatch * remainingBatches;
  
      // Log progress
      console.log(
        `Batch ${batchCount} of ${totalBatches} completed in ${
          Date.now() - batchStartTime
        } ms. Elapsed: ${elapsedTime.toFixed(2)}s, ETA: ${eta.toFixed(2)}s`
      );
    }
  
    console.log('Benchmark completed.');
};
  

main().catch((err) => console.error('Error in benchmark:', err));
