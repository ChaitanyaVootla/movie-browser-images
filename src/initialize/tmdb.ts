import { bulkUpsertRecords, getMissingRecordIdsByIdsAndType, initDB } from '@/db';
import { getLatestMovieData, getLatestSeriesData } from '@/tmdb_dump';
import { DB_IMAGE_ITEM, ITEM_TYPE } from '@/typings';
import { getItemImages } from '@/utils';

require('dotenv').config();

const BATCH_SIZE = 200; // Number of items to process in each batch
const ETA_WINDOW_SIZE = 10; // Number of recent batches to average for ETA calculation

const processBatch = async (itemIds: string[], db: any, itemType: ITEM_TYPE): Promise<void> => {
  const missingItemIds = await getMissingRecordIdsByIdsAndType(db, itemIds, itemType);
  const results = await Promise.all(missingItemIds.map(itemId => getItemImages(itemId, itemType)));
  const dbUpdates = results
    .filter((result) => result.id)
    .map((result) => ({
      id: result.id,
      type: itemType,
      logo: { original: result.logo },
      poster: { original: result.poster },
      backdrop: { original: result.backdrop },
      widePoster: { original: result.widePoster },
      lastUpdated: new Date().toISOString(),
    } as DB_IMAGE_ITEM));
  if (dbUpdates.length) {
    await bulkUpsertRecords(db, dbUpdates);
  }
};

const getItemIds = async (itemType: ITEM_TYPE): Promise<string[]> => {
  switch (itemType) {
    case ITEM_TYPE.MOVIE:
      return (await getLatestMovieData()).map(({ id }) => id);
    case ITEM_TYPE.SERIES:
      return (await getLatestSeriesData()).map(({ id }) => id);
    default:
      throw new Error(`Invalid item type: ${itemType}`);
  }
}

const init = async (itemType: ITEM_TYPE) => {
  const db = await initDB();
  console.log(`Batch size: ${BATCH_SIZE}`);

  const itemIds = await getItemIds(itemType);
  const totalBatches = Math.ceil(itemIds.length / BATCH_SIZE);
  const startTime = Date.now();

  let batchCount = 0;
  const recentBatchTimes: number[] = []; // Track recent batch durations

  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batch = itemIds.slice(i, i + BATCH_SIZE);
    const batchStartTime = Date.now();

    try {
      await processBatch(batch, db, itemType);
    } catch (error: any) {
      console.error(`Failed to process batch ${batchCount + 1}:`, error.message);
    }

    batchCount++;
    const batchDuration = Date.now() - batchStartTime;
    recentBatchTimes.push(batchDuration);

    // Limit the size of recentBatchTimes for ETA calculation
    if (recentBatchTimes.length > ETA_WINDOW_SIZE) {
      recentBatchTimes.shift();
    }

    const avgTimePerBatch = recentBatchTimes.reduce((a, b) => a + b, 0) / recentBatchTimes.length;
    const remainingBatches = totalBatches - batchCount;
    const eta = avgTimePerBatch * remainingBatches / 1000; // Convert to seconds

    console.log(
      `Batch ${batchCount} of ${totalBatches} completed in ${batchDuration} ms. ` +
        `Elapsed: ${(Date.now() - startTime) / 1000}s, ETA: ${eta.toFixed(2)}s`
    );
  }

  console.log(`All ${itemType} items initialized in ${(Date.now() - startTime) / 1000}s`);
};

init(ITEM_TYPE.MOVIE).catch((err) => console.error(`Error in initializing movies:`, err))
  .then(() => init(ITEM_TYPE.SERIES).catch((err) => console.error(`Error in initializing series:`, err)));
