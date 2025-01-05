import { convertToAvif } from "./avif";
import { IMAGE_TYPES } from "./constants";
import { getSeriesImages, getTmdbImagePath } from "./tmdb";
import { getLatestSeriesData } from "./tmdb_dump";
import { convertToWebp } from "./webp";
import { SingleBar, Presets } from "cli-progress";

const POPULARITY_THRESHOLD = 100;
const CHUNK_SIZE = 10;

export const getPopularSeriesIds = async (): Promise<number[]> => {
    const seriesData = await getLatestSeriesData();
    return seriesData
        .filter(({ popularity }) => popularity > POPULARITY_THRESHOLD)
        .map(({ id }) => id);
};

export const generateWebpImages = async (seriesIds: number[]): Promise<void> => {
    const totalChunks = Math.ceil(seriesIds.length / CHUNK_SIZE);

    const progressBar = new SingleBar(
        {
            format: 'Progress |{bar}| {percentage}% | ETA: {eta_formatted} | {value}/{total} Chunks',
        },
        Presets.shades_classic
    );
    progressBar.start(totalChunks, 0);

    for (let i = 0; i < seriesIds.length; i += CHUNK_SIZE) {
        const chunk = seriesIds.slice(i, i + CHUNK_SIZE);
        await Promise.all(
            chunk.map(async (seriesId) => {
                const seriesImages = await getSeriesImages(seriesId);
                const posterPath = getTmdbImagePath(seriesImages.poster, IMAGE_TYPES.POSTER);
                const backdropPath = getTmdbImagePath(seriesImages.backdrop, IMAGE_TYPES.BACKDROP);
                const logoPath = getTmdbImagePath(seriesImages.english_logo, IMAGE_TYPES.LOGO);
                const wideCardPath = getTmdbImagePath(seriesImages.english_wide_card, IMAGE_TYPES.WIDE_CARD);

                const targetNamePrefix = `tv/${seriesImages.id}/`;
                const promises: Promise<any>[] = [];
                if (posterPath) {
                    promises.push(convertToWebp(posterPath, targetNamePrefix + 'poster'));
                    promises.push(convertToAvif(posterPath, targetNamePrefix + 'poster'));
                }
                if (backdropPath) {
                    promises.push(convertToWebp(backdropPath, targetNamePrefix + 'backdrop'));
                    promises.push(convertToAvif(backdropPath, targetNamePrefix + 'backdrop'));
                }
                if (logoPath) {
                    promises.push(convertToWebp(logoPath, targetNamePrefix + 'logo'));
                    promises.push(convertToAvif(logoPath, targetNamePrefix + 'logo'));
                }
                if (wideCardPath) {
                    promises.push(convertToWebp(wideCardPath, targetNamePrefix + 'wide_card'));
                    promises.push(convertToAvif(wideCardPath, targetNamePrefix + 'wide_card'));
                }

                return Promise.all(promises);
            })
        );

        progressBar.update(Math.floor(i / CHUNK_SIZE) + 1);
    }

    progressBar.stop();
};

export const generateSeriesImages = async () => {
    try {
        const seriesIds = await getPopularSeriesIds();
        console.log(`Generating images for ${seriesIds.length} popular Series...`);
        await generateWebpImages(seriesIds);
        console.log('Images generated successfully!');
    } catch (error) {
        console.error('Error generating images:', error);
    }
};
