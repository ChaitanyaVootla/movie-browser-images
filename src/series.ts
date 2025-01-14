import { updateImages } from "@processor/imagesProcessor";
import { ITEM_TYPE, ITEM_CONVERT_STATS } from "@typings";
import { getLatestSeriesData } from "./tmdb_dump";
import { SingleBar, Presets } from "cli-progress";

const CHUNK_SIZE = 10;

export const generateImages = async (seriesIds: string[], db: any): Promise<ITEM_CONVERT_STATS> => {
    const convertStats: ITEM_CONVERT_STATS = {
        totalConverted: 0,
        totalFailed: 0,
        totalOriginalSizeBytes: 0,
        totalSizeBytes: 0,
        averageCompressionRatio: 0,
    }
    const totalChunks = Math.ceil(seriesIds.length / CHUNK_SIZE);

    const progressBar = new SingleBar(
        {
            format: 'Progress |{bar}| {percentage}% | Elapsed: {duration_formatted} | ETA: {eta_formatted} | {value}/{total} Chunks',
        },
        Presets.shades_classic
    );
    progressBar.start(totalChunks, 0);

    for (let i = 0; i < seriesIds.length; i += CHUNK_SIZE) {
        const chunk = seriesIds.slice(i, i + CHUNK_SIZE);
        const updateResults = await Promise.all(
            chunk.map(async (seriesId) => updateImages(db, seriesId, ITEM_TYPE.SERIES))
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

export const generateSeriesImages = async (db: any): Promise<ITEM_CONVERT_STATS> => {
    try {
        const seriesData = await getLatestSeriesData();
        const seriesIds = seriesData.map(({ id }) => id);
        if (process.env.TEST_LIMIT) {
            seriesIds.length = parseInt(process.env.TEST_LIMIT);
        }
        console.log(`Generating images for ${seriesIds.length} popular Series...`);
        const convertStats = await generateImages(seriesIds, db);
        console.log('Images generated successfully!');
        return convertStats;
    } catch (error) {
        console.error('Error generating images:', error);
        throw error;
    }
};
