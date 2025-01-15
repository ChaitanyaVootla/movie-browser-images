import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { DB_IMAGE_ITEM, ITEM_TYPE } from '@/typings';

// Open the SQLite database or create it if it doesn't exist
const initDB = async () => {
  const db = await open({
    filename: './images.db',
    driver: sqlite3.Database,
  });

  // Create the table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS movies_series_images (
      id TEXT NOT NULL,
      type TEXT NOT NULL,
      logo TEXT,
      logoLight TEXT,
      logoDark TEXT,
      poster TEXT,
      backdrop TEXT,
      widePoster TEXT,
      lastUpdated TEXT,
      UNIQUE(id, type)
    );
  `);

  return db;
};

// Add or update a record
const upsertRecord = async (db: sqlite3.Database, data: DB_IMAGE_ITEM) => {
  const query = `
    INSERT INTO movies_series_images (id, type, logo, logoLight, logoDark, poster, backdrop, widePoster, lastUpdated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id, type) DO UPDATE SET
      logo = excluded.logo,
      logoLight = excluded.logoLight,
      logoDark = excluded.logoDark,
      poster = excluded.poster,
      backdrop = excluded.backdrop,
      widePoster = excluded.widePoster,
      lastUpdated = excluded.lastUpdated;
  `;

  await db.run(query, [
    data.id,
    data.type,
    JSON.stringify(data.logo) || null,
    JSON.stringify(data.logoLight) || null,
    JSON.stringify(data.logoDark) || null,
    JSON.stringify(data.poster) || null,
    JSON.stringify(data.backdrop) || null,
    JSON.stringify(data.widePoster) || null,
    data.lastUpdated,
  ]);
};

// Bulk add or update records
const bulkUpsertRecords = async (db: sqlite3.Database, data: DB_IMAGE_ITEM[]) => {
  const query = `
    INSERT INTO movies_series_images (id, type, logo, logoLight, logoDark, poster, backdrop, widePoster, lastUpdated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id, type) DO UPDATE SET
      logo = excluded.logo,
      logoLight = excluded.logoLight,
      logoDark = excluded.logoDark,
      poster = excluded.poster,
      backdrop = excluded.backdrop,
      widePoster = excluded.widePoster,
      lastUpdated = excluded.lastUpdated;
  `;

  try {
    await db.exec('BEGIN TRANSACTION');

    for (const record of data) {
      await db.run(query, [
        record.id,
        record.type,
        JSON.stringify(record.logo) || null,
        JSON.stringify(record.logoLight) || null,
        JSON.stringify(record.logoDark) || null,
        JSON.stringify(record.poster) || null,
        JSON.stringify(record.backdrop) || null,
        JSON.stringify(record.widePoster) || null,
        record.lastUpdated,
      ]);
    }

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('Error during bulk upsert:', error);
  }
};

const getRecordByIdAndType = async (db: sqlite3.Database, id: string, type: ITEM_TYPE): Promise<DB_IMAGE_ITEM> => {
  const result: any = await db.get(
    `SELECT * FROM movies_series_images WHERE id = ? AND type = ?`,
    [id, type]
  );
  if (result) {
    if (result.logo) {
      result.logo = JSON.parse(result.logo);
    }
    if (result.logoLight) {
      result.logoLight = JSON.parse(result.logoLight);
    }
    if (result.logoDark) {
      result.logoDark = JSON.parse(result.logoDark);
    }
    if (result.poster) {
      result.poster = JSON.parse(result.poster);
    }
    if (result.backdrop) {
      result.backdrop = JSON.parse(result.backdrop);
    }
    if (result.widePoster) {
      result.widePoster = JSON.parse(result.widePoster);
    }
  }
  return result as unknown as DB_IMAGE_ITEM;
};

const getAllRecords = async (db: sqlite3.Database) => {
  return await db.all(`SELECT * FROM movies_series_images`);
};

export { initDB, upsertRecord, bulkUpsertRecords, getRecordByIdAndType, getAllRecords };
