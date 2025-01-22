import { uploadFile } from "@/utils";

require('dotenv').config();

const uploadDb = async () => {
    uploadFile('./images.db', process.env.AWS_S3_BUCKET_NAME as string, './', true);
}

uploadDb();
