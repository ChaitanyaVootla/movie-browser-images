import axios from "axios";
import { TMDB_IMAGE, IMAGE_TYPE, ITEM_TYPE } from "@typings";
import { IMAGE_SIZE_DEFAULTS, IMAGES_CONST } from "@constants/imageConstants";
import { axiosInstance, retryWithBackoff } from "./axios";

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const getMovieImages = async (movieId: string): Promise<TMDB_IMAGE> => {
    try {
        const {data: movie}: any = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${process.env.TMDB_API_KEY
            }&append_to_response=images`);
        const poster = movie.poster_path;
        const backdrop = movie.backdrop_path;
        const logo = movie.images?.logos.find((logo: any) => logo.iso_639_1 === 'en')?.file_path;
        const widePoster = movie.images?.backdrops.find((backdrop: any) => backdrop.iso_639_1 === 'en')?.file_path;

        return {
            name: movie.title,
            id: movie.id,
            imdb_id: movie.imdb_id,
            poster,
            backdrop,
            logo,
            widePoster,
        };
    } catch (error) {
        console.error('Error fetching movie data:', error);
        return {} as TMDB_IMAGE;
    }
};

export const getSeriesImages = async (seriesId: string): Promise<TMDB_IMAGE> => {
    const {data: series}: any = await axios.get(`${TMDB_BASE_URL}/tv/${seriesId}?api_key=${process.env.TMDB_API_KEY
        }&append_to_response=images`).catch((error) => {
            console.error('Error fetching series data:', error);
            return {};
        }
    );
    const poster = series.poster_path;
    const backdrop = series.backdrop_path;
    const logo = series.images?.logos.find((logo: any) => logo.iso_639_1 === 'en')?.file_path;
    const widePoster = series.images?.backdrops.find((backdrop: any) => backdrop.iso_639_1 === 'en')?.file_path;

    return {
        name: series.name,
        id: series.id,
        imdb_id: series.imdb_id,
        poster,
        backdrop,
        logo,
        widePoster,
    };
};

export const getItemImages = async (itemId: string, itemType: ITEM_TYPE): Promise<TMDB_IMAGE> => {
  try {
    const { data: item }: any = await retryWithBackoff(() => axiosInstance.get(`${itemType === ITEM_TYPE.MOVIE ? 'movie' : 'tv'}/${itemId}`));
    const poster = item.poster_path;
    const backdrop = item.backdrop_path;
    const logo = item.images?.logos.find(({ iso_639_1 }: { iso_639_1: string }) => iso_639_1 === 'en')?.file_path;
    const widePoster = item.images?.backdrops.find(({ iso_639_1 }: { iso_639_1: string }) => iso_639_1 === 'en')?.file_path;

    return {
      name: item.title,
      id: item.id,
      imdb_id: item.imdb_id,
      poster,
      backdrop,
      logo,
      widePoster,
    };
  } catch (error: any) {
    console.error(`Error fetching ${itemType} data for id ${itemId}:`, error.message);
    return {} as TMDB_IMAGE;
  }
};

export const getTmdbImagePath = (path: string, imageType: IMAGE_TYPE) => {
    if (!path) {
        return '';
    }
    switch (imageType) {
        case IMAGE_TYPE.POSTER:
            return `${IMAGES_CONST.base_url}${IMAGE_SIZE_DEFAULTS.poster}${path}`;
        case IMAGE_TYPE.BACKDROP:
            return `${IMAGES_CONST.base_url}${IMAGE_SIZE_DEFAULTS.backdrop}${path}`;
        case IMAGE_TYPE.LOGO:
            return `${IMAGES_CONST.base_url}${IMAGE_SIZE_DEFAULTS.logo}${path}`;
        default:
            return `${IMAGES_CONST.base_url}${IMAGES_CONST.poster_sizes.w500}${path}`;
    }
}

export const getChangesByItemAndDays = async (itemType: ITEM_TYPE, days: number = 1): Promise<string[]> => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`Fetching ${itemType} changes from ${startDate} to ${tomorrow}`);
    const results = [];

    const { data: firstChanges } = await retryWithBackoff(() => axiosInstance.get(`${itemType === ITEM_TYPE.MOVIE ? 'movie' : 'tv'}/changes`, {
        params: {
            start_date: startDate,
            end_date: tomorrow,
        },
    }));
    console.log(`Fetched page 1 of ${firstChanges.total_pages}`);
    const pagesCount = firstChanges.total_pages;
    results.push(...firstChanges.results);

    for (let i = 2; i <= pagesCount; i++) {
        const { data: changes } = await retryWithBackoff(() => axiosInstance.get(`${itemType === ITEM_TYPE.MOVIE ? 'movie' : 'tv'}/changes`, {
            params: {
                start_date: startDate,
                end_date: tomorrow,
                page: i,
            },
        }));
        console.log(`Fetched page ${i} of ${pagesCount}`);
        results.push(...changes.results);
    }

    return results.map(({ id }: { id: string }) => id);
};