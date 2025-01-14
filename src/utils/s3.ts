import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import * as mime from 'mime-types';
import { SingleBar, Presets } from 'cli-progress';

const s3Client = new S3Client({});

// Utility function to get all files in a folder recursively
const getAllFiles = (dir: string, folderPath: string[] = []): string[] => {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, folderPath);
        } else {
            folderPath.push(fullPath);
        }
    });
    return folderPath;
};

const resolveContentType = (fileName: string): string =>
  mime.lookup(fileName) || 'application/octet-stream';

// Function to upload a file to S3
const uploadFile = async (filePath: string, bucketName: string, basePath: string): Promise<void> => {
    const fileContent = fs.readFileSync(filePath);
    const relativePath = path.relative(basePath, filePath).replace(/\\/g, '/');

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: relativePath,
            Body: fileContent,
            ContentType: resolveContentType(filePath),
            CacheControl: 'public, max-age=86400, stale-while-revalidate=3600',
        })
    );
};

// Main function to upload folder
export const uploadFolderToS3 = async (folderPath: string, bucketName: string, chunkSize: number = 200): Promise<void> => {
    console.log('Counting files and calculating total size...');
    const files = getAllFiles(folderPath);
    const totalSize = files.reduce((acc, file) => acc + fs.statSync(file).size, 0);
    console.log(`Total files: ${files.length}, Total size: ${totalSize} bytes`);

    let uploadedChunks = 0;
    const totalChunks = Math.ceil(files.length / chunkSize);

    const progressBar = new SingleBar({
        hideCursor: true,
        clearOnComplete: false,
        format: 'Progress |{bar}| {percentage}% | ETA: {eta_formatted} | {value}/{total} Chunks'
    }, Presets.shades_classic);

    progressBar.start(totalChunks, 0);

    const uploadQueue = async (fileBatch: string[]) => {
        return Promise.all(fileBatch.map(async (file) => {
            try {
                await uploadFile(file, bucketName, folderPath);
            } catch (error) {
                console.error(`Error uploading ${file}:`, error);
            }
        }));
    };

    for (let i = 0; i < files.length; i += chunkSize) {
        const fileBatch = files.slice(i, i + chunkSize);
        await uploadQueue(fileBatch);
        uploadedChunks++;
        progressBar.update(uploadedChunks);
    }

    progressBar.stop();
    console.log('Folder upload complete.');
};
