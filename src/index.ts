import * as fs from 'fs';
import { uploadFolderToS3 } from "@utils/s3";
import { generateSeriesImages } from "@/series";
import { initDB } from "@/db";
import { bytesToGb, bytesToKb } from "@utils";
import { generateMovieImages } from '@/movies';

require('dotenv').config();

const main = async () => {
    const db = await initDB();
    const movieConvertStats = await generateMovieImages(db);

    const statsToStore = {
        ...movieConvertStats,
        totalSizeGb: bytesToGb(movieConvertStats.totalSizeBytes),
        totalOriginalSizeGb: bytesToGb(movieConvertStats.totalOriginalSizeBytes),
        averageOriginalSizeKb: bytesToKb(movieConvertStats.totalOriginalSizeBytes / movieConvertStats.totalConverted).toFixed(2),
        averageConvertedSizeKb: bytesToKb(movieConvertStats.totalSizeBytes / movieConvertStats.totalConverted).toFixed(2),
    }

    console.log("------------------------------------");
    console.log('Movie Images Conversion Stats:', statsToStore);
    console.log("------------------------------------");

    // store statsToStore in a file
    fs.writeFileSync(`./data/stats-movies-${Date.now()}.json`, JSON.stringify(statsToStore, null, 2));

    
    const seriesConvertStats = await generateSeriesImages(db);

    const statsToStoreSeries = {
        ...seriesConvertStats,
        totalSizeGb: bytesToGb(seriesConvertStats.totalSizeBytes),
        totalOriginalSizeGb: bytesToGb(seriesConvertStats.totalOriginalSizeBytes),
        averageOriginalSizeKb: bytesToKb(seriesConvertStats.totalOriginalSizeBytes / seriesConvertStats.totalConverted).toFixed(2),
        averageConvertedSizeKb: bytesToKb(seriesConvertStats.totalSizeBytes / seriesConvertStats.totalConverted).toFixed(2),
    }

    console.log("------------------------------------");
    console.log('Series Images Conversion Stats:', statsToStoreSeries);
    console.log("------------------------------------");

    // store statsToStore in a file
    fs.writeFileSync(`./data/stats-series-${Date.now()}.json`, JSON.stringify(statsToStoreSeries, null, 2));

    // await uploadFolderToS3('./data/images', process.env.AWS_S3_BUCKET_NAME!);
}

if (!fs.existsSync('./data/images')) {
    fs.mkdirSync('./data/images', { recursive: true });
}

main();
