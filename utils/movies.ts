import { convertToAvif } from "./avif";
import { IMAGE_TYPES } from "./constants";
import { getMovieImages, getTmdbImagePath } from "./tmdb";
import { getLatestMovieData } from "./tmdb_dump";
import { convertToWebp } from "./webp";
import { SingleBar, Presets } from "cli-progress";

const POPULARITY_THRESHOLD = 20;
const CHUNK_SIZE = 10;

export const getPopularMovieIds = async (): Promise<number[]> => {
    const moviesData = await getLatestMovieData();
    return moviesData
        .filter(({ popularity }) => popularity > POPULARITY_THRESHOLD)
        .map(({ id }) => id);
};

export const generateWebpImages = async (movieIds: number[]): Promise<void> => {
    const totalChunks = Math.ceil(movieIds.length / CHUNK_SIZE);

    const progressBar = new SingleBar(
        {
            format: 'Progress |{bar}| {percentage}% | ETA: {eta_formatted} | {value}/{total} Chunks',
        },
        Presets.shades_classic
    );
    progressBar.start(totalChunks, 0);

    for (let i = 0; i < movieIds.length; i += CHUNK_SIZE) {
        const chunk = movieIds.slice(i, i + CHUNK_SIZE);
        await Promise.all(
            chunk.map(async (movieId) => {
                const movieImages = await getMovieImages(movieId);
                const posterPath = getTmdbImagePath(movieImages.poster, IMAGE_TYPES.POSTER);
                const backdropPath = getTmdbImagePath(movieImages.backdrop, IMAGE_TYPES.BACKDROP);
                const logoPath = getTmdbImagePath(movieImages.english_logo, IMAGE_TYPES.LOGO);
                const wideCardPath = getTmdbImagePath(movieImages.english_wide_card, IMAGE_TYPES.WIDE_CARD);

                const targetPrefix = `movie/${movieImages.id}/`;
                const promises: Promise<any>[] = [];
                if (posterPath) {
                    promises.push(convertToWebp(posterPath, targetPrefix + 'poster'));
                    promises.push(convertToAvif(posterPath, targetPrefix + 'poster'));
                }
                if (backdropPath) {
                    promises.push(convertToWebp(backdropPath, targetPrefix + 'backdrop'));
                    promises.push(convertToAvif(backdropPath, targetPrefix + 'backdrop'));
                }
                if (logoPath) {
                    promises.push(convertToWebp(logoPath, targetPrefix + 'logo'));
                    promises.push(convertToAvif(logoPath, targetPrefix + 'logo'));
                }
                if (wideCardPath) {
                    promises.push(convertToWebp(wideCardPath, targetPrefix + 'wide_card'));
                    promises.push(convertToAvif(wideCardPath, targetPrefix + 'wide_card'));
                }

                return Promise.all(promises);
            })
        );

        progressBar.update(Math.floor(i / CHUNK_SIZE) + 1);
    }

    progressBar.stop();
};

export const generateMovieImages = async () => {
    try {
        const movieIds = await getPopularMovieIds();
        console.log(`Generating images for ${movieIds.length} popular Movies...`);
        await generateWebpImages(movieIds);
        console.log('Images generated successfully!');
    } catch (error) {
        console.error('Error generating images:', error);
    }
};
