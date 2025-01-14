import { getLatestMovieData } from "./tmdb_dump";
import { SingleBar, Presets } from "cli-progress";
import { ITEM_TPYE } from '@typings';
import { updateImages } from "@processor/imagesProcessor";
import { ITEM_CONVERT_STATS } from "@typings";

const CHUNK_SIZE = 30;

export const generateImages = async (movieIds: string[], db: any): Promise<ITEM_CONVERT_STATS> => {
    const convertStats: ITEM_CONVERT_STATS = {
        totalConverted: 0,
        totalFailed: 0,
        totalOriginalSizeBytes: 0,
        totalSizeBytes: 0,
        averageCompressionRatio: 0,
    }
    const totalChunks = Math.ceil(movieIds.length / CHUNK_SIZE);

    const progressBar = new SingleBar(
        {
            format: 'Progress |{bar}| {percentage}% | Elapsed: {duration_formatted} | ETA: {eta_formatted} | {value}/{total} Chunks',
        },
        Presets.shades_classic
    );
    progressBar.start(totalChunks, 0);

    for (let i = 0; i < movieIds.length; i += CHUNK_SIZE) {
        const chunk = movieIds.slice(i, i + CHUNK_SIZE);
        const updateResults = await Promise.all(
            chunk.map(async (movieId) => updateImages(db, movieId, ITEM_TPYE.MOVIE))
        );

        updateResults.forEach((result) => {
            convertStats.totalConverted += result.totalConverted;
            convertStats.totalFailed += result.totalFailed;
            convertStats.totalOriginalSizeBytes += result.totalOriginalSizeBytes;
            convertStats.totalSizeBytes += result.totalSizeBytes;
        });

        convertStats.averageCompressionRatio = convertStats.totalSizeBytes / convertStats.totalOriginalSizeBytes;

        progressBar.update(Math.floor(i / CHUNK_SIZE) + 1);
    }

    progressBar.stop();

    return convertStats;
};

export const generateMovieImages = async (db: any): Promise<ITEM_CONVERT_STATS> => {
    try {
        const moviesData = await getLatestMovieData();
        const movieIds = moviesData.map(({ id }) => id);
        if (process.env.TEST_LIMIT) {
            movieIds.length = parseInt(process.env.TEST_LIMIT);
        }
        console.log(`Generating images for ${movieIds.length} Movies...`);
        const convertStats = await generateImages(movieIds, db);
        console.log('Images generated successfully!');
        return convertStats;
    } catch (error) {
        console.error('Error generating images:', error);
        throw error;
    }
};
