import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const BASE_STORE_PATH = "./data/images";

export const convertToWebp = async (
    image: string,
    targetName: string,
    quality: number = 80): Promise<string | undefined> => {
    // check if the image already exists
    const filePath = path.join(BASE_STORE_PATH, `${targetName}.webp`);
    if (fs.existsSync(filePath)) {
        return filePath;
    }

    try {
        // Fetch the image
        // if image is svg, modify path to png
        if (image.endsWith('.svg')) {
            image = image.replace('.svg', '.png');
        }
        const response = await fetch(image);
        if (!response.ok) {
            throw new Error(`Failed to fetch image ${image}: ${response.statusText}`);
        }

        // Convert the image to a buffer
        const buffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);

        // Convert the image to WebP
        const webpBuffer = await sharp(imageBuffer)
            .webp({ quality })
            .toBuffer();

        const filePath = path.join(BASE_STORE_PATH, `${targetName}.webp`);

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }
        fs.writeFileSync(filePath, webpBuffer);

        return filePath;
    } catch (error) {
        console.error("Error converting image to WebP:", error, image, targetName);
        return undefined;
    }
};
