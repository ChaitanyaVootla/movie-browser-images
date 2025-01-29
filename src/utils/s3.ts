import { PutObjectCommand, S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from "@smithy/node-http-handler";
import fs from 'fs';
import { createWriteStream } from "fs";
import path from 'path';
import * as mime from 'mime-types';
import { SingleBar, Presets } from 'cli-progress';
import { promisify } from "util";
import { pipeline } from "stream";

// Promisify the stream pipeline
const streamPipeline = promisify(pipeline);

const s3Client = new S3Client({
    requestHandler: new NodeHttpHandler({
        socketTimeout: 180000,
        socketAcquisitionWarningTimeout: 180000,
        connectionTimeout: 180000,
        requestTimeout: 180000,
    }),
});

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

// Function to check if a file exists in S3 with the same size
const fileExistsInS3 = async (bucketName: string, key: string, localFileSize: number): Promise<boolean> => {
    try {
        const headObject = await s3Client.send(
            new HeadObjectCommand({ Bucket: bucketName, Key: key })
        );
        return headObject.ContentLength === localFileSize;
    } catch (error: any) {
        if (error.name === 'NotFound') {
            return false;
        }
        throw error;
    }
};

// Function to upload a file to S3
export const uploadFile = async (filePath: string, bucketName: string, basePath: string, force: boolean): Promise<void> => {
    const fileContent = fs.readFileSync(filePath);
    const relativePath = path.relative(basePath, filePath).replace(/\\/g, '/');

    if (!force) {
        // Check if the file already exists in S3
        const fileSize = fs.statSync(filePath).size;
        const exists = await fileExistsInS3(bucketName, relativePath, fileSize);

        if (exists) {
            return;
        }
    }

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
export const uploadFolderToS3 = async (folderPath: string, bucketName: string, chunkSize: number = 200, force=true): Promise<void> => {
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
        return Promise.allSettled(fileBatch.map(async (file) => {
            return uploadFile(file, bucketName, folderPath, force).then(() => fs.unlinkSync(file))
                .catch((error) => console.error(`Error uploading ${file}:`, error));
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

// Function to download a file from S3
export const downloadFile = async (bucketName: string, key: string, destinationPath: string) => {
    try {
      // Create a GetObjectCommand
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
  
      // Send the command to S3
      const response = await s3Client.send(command);
  
      // Ensure the response body is not null
      if (!response.Body) {
        throw new Error("No content in response body");
      }
  
      // Create a write stream to the local file
      const fileStream = createWriteStream(destinationPath);
  
      // Pipe the response body to the file
      // @ts-ignore
      await streamPipeline(response.Body, fileStream);
  
      console.log(`File downloaded successfully to ${destinationPath}`);
    } catch (error: any) {
      console.error("Error downloading file:", error.message);
    }
  }