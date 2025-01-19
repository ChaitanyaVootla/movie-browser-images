import axios from "axios";
import http from 'http';
import https from 'https';

require('dotenv').config();

const MAX_RETRIES = 5; // Maximum retries for exponential backoff
const INITIAL_DELAY_MS = 100; // Initial delay in milliseconds for backoff

export const axiosInstance = axios.create({
    baseURL: 'https://api.themoviedb.org/3/',
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
export const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> => {
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