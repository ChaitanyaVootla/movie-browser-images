import { generateMovieImages } from "./src/movies";
import * as fs from 'fs';
import { uploadFolderToS3 } from "./utils/s3";
import { generateSeriesImages } from "./src/series";
import { initDB } from "./src/db";

require('dotenv').config();

const main = async () => {
    const db = await initDB();
    const movieConvertStats = await generateMovieImages(db);
    // const seriesConvertStats = await generateSeriesImages(db);

    console.log('Movie Images Conversion Stats:', movieConvertStats);
    // console.log('Series Images Conversion Stats:', seriesConvertStats);

    // await uploadFolderToS3('./data/images', process.env.AWS_S3_BUCKET_NAME!);
}

if (!fs.existsSync('./data/images')) {
    fs.mkdirSync('./data/images', { recursive: true });
}

main();
