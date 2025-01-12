import { IMAGE_FORMAT } from "../typings";

export const IMAGES_CONST = {
    base_url: 'http://image.tmdb.org/t/p/',
    secure_base_url: 'https://image.tmdb.org/t/p/',
    backdrop_sizes: {
        w300: 'w300',
        w780: 'w780',
        w1280: 'w1280',
        original: 'original',
    },
    logo_sizes: {
        w45: 'w45',
        w92: 'w92',
        w154: 'w154',
        w185: 'w185',
        w300: 'w300',
        w500: 'w500',
        original: 'original',
    },
    poster_sizes: {
        w92: 'w92',
        w154: 'w154',
        w185: 'w185',
        w342: 'w342',
        w500: 'w500',
        w780: 'w780',
        original: 'original',
    },
    profile_sizes: {
        w45: 'w45',
        w185: 'w185',
        h632: 'h632',
        original: 'original',
    },
    still_sizes: {
        w92: 'w92',
        w185: 'w185',
        w300: 'w300',
        original: 'original',
    },
};

export const IMAGE_SIZE_DEFAULTS = {
    backdrop: IMAGES_CONST.backdrop_sizes.w1280,
    logo: IMAGES_CONST.backdrop_sizes.w1280,
    poster: IMAGES_CONST.poster_sizes.w342,
    profile: IMAGES_CONST.profile_sizes.w185,
}

export const DEFAULT_IMAGE_QUALITY = {
    [IMAGE_FORMAT.WEBP]: 80,
    [IMAGE_FORMAT.AVIF]: 50,
};
