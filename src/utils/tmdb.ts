import axios from "axios";
import { TMDB_IMAGE, IMAGE_TYPE } from "@typings";
import { IMAGE_SIZE_DEFAULTS, IMAGES_CONST } from "@constants/imageConstants";

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const getMovieImages = async (movieId: string): Promise<TMDB_IMAGE> => {
    const {data: movie}: any = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${process.env.TMDB_API_KEY
        }&append_to_response=images`).catch((error) => {
            console.error('Error fetching movie data:', error);
            return {};
        }
    );
    const poster = movie.poster_path;
    const backdrop = movie.backdrop_path;
    const logo = movie.images.logos.find((logo: any) => logo.iso_639_1 === 'en')?.file_path;
    const widePoster = movie.images.backdrops.find((backdrop: any) => backdrop.iso_639_1 === 'en')?.file_path;

    return {
        name: movie.title,
        id: movie.id,
        imdb_id: movie.imdb_id,
        poster,
        backdrop,
        logo,
        widePoster,
    };
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
    const logo = series.images.logos.find((logo: any) => logo.iso_639_1 === 'en')?.file_path;
    const widePoster = series.images.backdrops.find((backdrop: any) => backdrop.iso_639_1 === 'en')?.file_path;

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
