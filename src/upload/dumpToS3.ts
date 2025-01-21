import { uploadFolderToS3 } from "@/utils";
require('dotenv').config();

const dumpImages = async () => {
    await uploadFolderToS3('./data/images', process.env.AWS_S3_BUCKET_NAME!, 500);
}

dumpImages();
