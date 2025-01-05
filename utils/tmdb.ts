import axios from "axios";
import { IMAGE_SIZE_DEFAULTS, IMAGE_TYPES, IMAGES_CONST } from "./constants";

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const getMovieImages = async (movieId: number) => {
    const {data: movie}: any = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}&append_to_response=images`);
    const poster = movie.poster_path;
    const backdrop = movie.backdrop_path;
    const english_logo = movie.images.logos.find((logo: any) => logo.iso_639_1 === 'en')?.file_path;
    const english_wide_card = movie.images.backdrops.find((backdrop: any) => backdrop.iso_639_1 === 'en')?.file_path;

    return {
        name: movie.title,
        id: movie.id,
        imdb_id: movie.imdb_id,
        poster,
        backdrop,
        english_logo,
        english_wide_card,
    };
};

export const getSeriesImages = async (seriesId: number) => {
    const {data: series}: any = await axios.get(`${TMDB_BASE_URL}/tv/${seriesId}?api_key=${process.env.TMDB_API_KEY}&append_to_response=images`);
    const poster = series.poster_path;
    const backdrop = series.backdrop_path;
    const english_logo = series.images.logos.find((logo: any) => logo.iso_639_1 === 'en')?.file_path;
    const english_wide_card = series.images.backdrops.find((backdrop: any) => backdrop.iso_639_1 === 'en')?.file_path;

    return {
        name: series.name,
        id: series.id,
        imdb_id: series.imdb_id,
        poster,
        backdrop,
        english_logo,
        english_wide_card,
    };
};


export const getTmdbImagePath = (path: string, imageType: IMAGE_TYPES) => {
    if (!path) {
        return '';
    }
    switch (imageType) {
        case IMAGE_TYPES.POSTER:
            return `${IMAGES_CONST.base_url}${IMAGE_SIZE_DEFAULTS.poster}${path}`;
        case IMAGE_TYPES.BACKDROP:
            return `${IMAGES_CONST.base_url}${IMAGE_SIZE_DEFAULTS.backdrop}${path}`;
        case IMAGE_TYPES.LOGO:
            return `${IMAGES_CONST.base_url}${IMAGE_SIZE_DEFAULTS.logo}${path}`;
        default:
            return `${IMAGES_CONST.base_url}${IMAGES_CONST.poster_sizes.w500}${path}`;
    }
}
