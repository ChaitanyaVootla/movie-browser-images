import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import { CONVERT_PAYLOAD, CONVERT_RESULT } from "../typings/imageConvert";

const BASE_STORE_PATH = "./data/images";

export const convertImage = async (payload: CONVERT_PAYLOAD): Promise<CONVERT_RESULT> => {
    const result: CONVERT_RESULT = {
        ...payload,
        success: true,
        originalSizeBytes: 0,
        sizeBytes: 0,
        compressionRatio: 0,
    };

    try {
        // Fetch the image
        // if image is svg, modify path to png as svgs can be extremely large in dimensions
        if (payload.original.endsWith('.svg')) {
            payload.original = payload.original.replace('.svg', '.png');
        }
        const response = await fetch(payload.original);
        if (!response.ok) {
            throw new Error(`Failed to fetch image ${payload.original}: ${response.statusText}`);
        }

        // Convert the image to a buffer
        const buffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);

        let resultBuffer: Buffer;
        switch (payload.type) {
            case "webp":
                resultBuffer = await sharp(imageBuffer).webp({ quality: payload.quality }).toBuffer();
                break;
            case "avif":
                resultBuffer = await sharp(imageBuffer).avif({ quality: payload.quality }).toBuffer();
                break;
            default:
                throw new Error(`Invalid image type: ${payload.type}`);
        }

        const filePath = path.join(BASE_STORE_PATH, `${payload.target}.${payload.type}`);

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }
        fs.writeFileSync(filePath, resultBuffer);

        result.originalSizeBytes = imageBuffer.byteLength;
        result.sizeBytes = resultBuffer.byteLength;
        result.compressionRatio = result.sizeBytes / result.originalSizeBytes;

        return result;
    } catch (error) {
        console.error("Error converting image to AVIF:", error, payload.original, payload.target);
        result.success = false;
        return result;
    }
};
