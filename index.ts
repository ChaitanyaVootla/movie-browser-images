import { generateMovieImages } from "./utils/movies";
import * as fs from 'fs';
import { uploadFolderToS3 } from "./utils/s3";
import { generateSeriesImages } from "./utils/series";

require('dotenv').config();

const main = async () => {
    await generateMovieImages();
    await generateSeriesImages();
    await uploadFolderToS3('./data/images', process.env.AWS_S3_BUCKET_NAME!);
}

if (!fs.existsSync('./data/images')) {
    fs.mkdirSync('./data/images', { recursive: true });
}

main();
