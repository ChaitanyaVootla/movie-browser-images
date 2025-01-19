import { DEFAULT_IMAGE_QUALITY } from "@/constants";
import { getImagesToGenerate, initDB, setGeneratedByIdTypeAndImageType } from "@/db";
import { convertImage } from "@/imageConverter";
import { CONVERT_PAYLOAD, CONVERT_RESULT, IMAGE_FORMAT, ITEM_TYPE } from "@/typings"
import { getTmdbImagePath } from "@/utils";

const BATCH_SIZE = 200;
const ETA_WINDOW_SIZE = 10; // Number of recent batches to average for ETA calculation
const TARGET_FORMATS = [IMAGE_FORMAT.WEBP];

const generateImages = async (itemType: ITEM_TYPE) => {
    const db: any = await initDB();
    const imagesToGenerate = await getImagesToGenerate(db, itemType);
    const imageCountByType = imagesToGenerate.reduce((acc, item) => {
        acc[item.imageType] = acc[item.imageType] ? acc[item.imageType] + 1 : 1;
        return acc;
    }, {} as any);
    console.log(`Images to generate of type ${itemType}: ${imagesToGenerate.length}`);
    console.log(`Images counts: ${JSON.stringify(imageCountByType)}`);

    const conversion_payloads: CONVERT_PAYLOAD[] = imagesToGenerate.map((item) => {
        return TARGET_FORMATS.map(imageFormat => ({
            original: getTmdbImagePath(item.original, item.imageType),
            target: `${item.type}/${item.id}/${item.imageType}`,
            imageType: item.imageType,
            id: item.id,
            itemType: item.type,
            type: imageFormat,
            quality: DEFAULT_IMAGE_QUALITY[imageFormat],
        } as CONVERT_PAYLOAD));
    }).flat();

    const batches = [];
    const recentBatchTimes: number[] = []; // Track recent batch durations
    const startTime = Date.now();

    for (let i = 0; i < conversion_payloads.length; i += BATCH_SIZE) {
        batches.push(conversion_payloads.slice(i, i + BATCH_SIZE));
    }

    const totalBatches = batches.length;
    let currentBatch = 0;
    console.log(`Processing ${batches.length} batches of ${BATCH_SIZE} images`);

    for (const batch of batches) {
        const batchStartTime = Date.now();
        currentBatch++;

        const promises: Promise<CONVERT_RESULT>[] = [];
        batch.forEach((convertPayload) => {
            promises.push(convertImage(convertPayload));
        });
        const results = await Promise.all(promises);

        results.forEach(async (result) => {
            if (!result.success) {
                console.error(`Error converting image: ${result.original}`);
            }
            await setGeneratedByIdTypeAndImageType(db, result.id, result.itemType, result.imageType, result.success);
        });
        const batchDuration = Date.now() - batchStartTime;
        recentBatchTimes.push(batchDuration);
        // Limit the size of recentBatchTimes for ETA calculation
        if (recentBatchTimes.length > ETA_WINDOW_SIZE) {
          recentBatchTimes.shift();
        }

        const avgTimePerBatch = recentBatchTimes.reduce((a, b) => a + b, 0) / recentBatchTimes.length;
        const remainingBatches = totalBatches - currentBatch;
        const eta = avgTimePerBatch * remainingBatches / 1000; // Convert to seconds

        console.log(
          `Batch ${currentBatch} of ${totalBatches} completed in ${batchDuration} ms. ` +
            `Elapsed: ${(Date.now() - startTime) / 1000}s, ETA: ${eta.toFixed(2)}s`
        );
    }

    console.log(`All ${itemType} images generated in ${(Date.now() - startTime) / 1000}s`);
}

generateImages(ITEM_TYPE.MOVIE).then(() =>
    generateImages(ITEM_TYPE.SERIES)
);
