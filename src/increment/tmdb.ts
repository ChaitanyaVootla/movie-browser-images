import { bulkUpsertRecords, getRecordsByIdsAndType, initDB } from '@/db';
import { DB_IMAGE_ITEM, ITEM_TYPE } from '@/typings';
import { getChangesByItemAndDays, getItemImages } from '@/utils';

require('dotenv').config();

const BATCH_SIZE = 200; // Number of items to process in each batch
const ETA_WINDOW_SIZE = 10; // Number of recent batches to average for ETA calculation

const processBatch = async (itemIds: string[], db: any, itemType: ITEM_TYPE): Promise<void> => {
  const results = await Promise.all(itemIds.map(itemId => getItemImages(itemId, itemType)));
  const dbItems = await getRecordsByIdsAndType(db, itemIds, itemType);
  const dbItemsToUpsert: DB_IMAGE_ITEM[] = [];
  const stats = {
    create: 0,
    update: 0,
  }

  results.forEach((result) => {
    if (!result.id) {
      return;
    }

    const dbItem = dbItems.find((item) => item.id == result.id);
    if (!dbItem) {
      dbItemsToUpsert.push({
        id: result.id,
        type: itemType,
        logo: { original: result.logo },
        poster: { original: result.poster },
        backdrop: { original: result.backdrop },
        widePoster: { original: result.widePoster },
        lastUpdated: new Date().toISOString(),
      });
      stats.create++;
    } else {
      let isUpdated = false
      if (result.logo && (!dbItem.logo?.original || dbItem.logo.original !== result.logo)) {
        dbItem.logo = { original: result.logo };
        isUpdated = true;
      }
      if (result.poster && (!dbItem.poster?.original || dbItem.poster.original !== result.poster)) {
        dbItem.poster = { original: result.poster };
        isUpdated = true;
      }
      if (result.backdrop && (!dbItem.backdrop?.original || dbItem.backdrop.original !== result.backdrop)) {
        dbItem.backdrop = { original: result.backdrop };
        isUpdated = true;
      }
      if (result.widePoster && (!dbItem.widePoster?.original || dbItem.widePoster.original !== result.widePoster)) {
        dbItem.widePoster = { original: result.widePoster };
        isUpdated = true;
      }
      if (isUpdated) {
        stats.update++;
        dbItem.lastUpdated = new Date().toISOString();
        dbItemsToUpsert.push(dbItem);
      }
    }
  });
  if (dbItemsToUpsert.length) {
    await bulkUpsertRecords(db, dbItemsToUpsert);
  }

  console.log(`----------------Upserting ${dbItemsToUpsert.length} stats: ${JSON.stringify(stats)}`);
};

const init = async (itemType: ITEM_TYPE) => {
  const db = await initDB();
  console.log(`Batch size: ${BATCH_SIZE}`);

  const daysToFetch = process.env.CHANGE_DAYS ? parseInt(process.env.CHANGE_DAYS) : 1;
  const itemIds = await getChangesByItemAndDays(itemType, daysToFetch);
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

  console.log(`All ${itemType} items incremented in ${(Date.now() - startTime) / 1000}s`);
};

init(ITEM_TYPE.MOVIE).catch((err) => console.error(`Error in incrementing movies:`, err))
  .then(() => init(ITEM_TYPE.SERIES).catch((err) => console.error(`Error in incrementing series:`, err)));
