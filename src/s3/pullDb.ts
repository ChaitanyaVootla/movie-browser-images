import { downloadFile } from "@/utils";

require('dotenv').config();

const downloadDb = async () => {
    downloadFile(process.env.AWS_S3_BUCKET_NAME as string, 'images.db', './images.db');
}

downloadDb();
