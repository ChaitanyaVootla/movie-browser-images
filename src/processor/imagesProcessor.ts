import { DEFAULT_IMAGE_QUALITY } from "../constants/imageConstants";
import { getRecordByIdAndType, upsertRecord } from "../src/db";
import { convertImage } from "../src/imageConverter";
import { getMovieImages, getSeriesImages, getTmdbImagePath } from "../utils";
import { DB_IMAGE_ITEM, IMAGE_FORMAT, IMAGE_TYPE, ITEM_TPYE, TMDB_IMAGE } from "../typings";
import { CONVERT_PAYLOAD, CONVERT_RESULT, ITEM_CONVERT_STATS } from "../typings/imageConvert";

export const updateImages = async (db: any, itemID: string, type: ITEM_TPYE): Promise<ITEM_CONVERT_STATS> => {
    let itemConvertStats = {
        averageCompressionRatio: 0,
        totalConverted: 0,
        totalFailed: 0,
        totalOriginalSizeBytes: 0,
        totalSizeBytes: 0,
    } as ITEM_CONVERT_STATS;
    let data = {} as TMDB_IMAGE;
    switch (type) {
        case ITEM_TPYE.MOVIE:
            data = await getMovieImages(itemID);
            break;
        case ITEM_TPYE.SERIES:
            data = await getSeriesImages(itemID);
            break;
        default:
            throw new Error('Invalid type');
    }

    let dbItem = await getRecordByIdAndType(db, itemID, type);

    if (!dbItem?.id) {
        dbItem = {
            id: itemID,
            type: type,
            lastUpdated: new Date().toISOString(),
        }
    }

    const targetPrefix = `${type}/${data.id}/`;
    const imagesToUpdate = getImagesToUpdate(dbItem, data, targetPrefix);

    const updatePayload = dbItem;

    const promises: Promise<CONVERT_RESULT>[] = [];
    imagesToUpdate.forEach((convertPayload) => {
        promises.push(convertImage(convertPayload));
    });

    const results = await Promise.all(promises);
    results.forEach((result) => {
        itemConvertStats.totalConverted += result.success ? 1 : 0;
        itemConvertStats.totalFailed += result.success ? 0 : 1;
        itemConvertStats.totalOriginalSizeBytes += result.originalSizeBytes;
        itemConvertStats.totalSizeBytes += result.sizeBytes;

        if (result.success) {
            updatePayload[result.imageType] = {
                original: result.originalPath,
                originalFullPath: result.original,
                updatedAt: new Date().toISOString(),
            };
        }
    });

    if (results.length > 0) {
        updatePayload.lastUpdated = new Date().toISOString();
    }

    upsertRecord(db, updatePayload);

    itemConvertStats.averageCompressionRatio = itemConvertStats.totalSizeBytes / itemConvertStats.totalOriginalSizeBytes;

    return itemConvertStats;
}

const getImagesToUpdate = (dbItem: DB_IMAGE_ITEM, tmdbItem: TMDB_IMAGE, targetPrefix: string): CONVERT_PAYLOAD[] => {
    const imagesToUpdate: CONVERT_PAYLOAD[] = [];
    if (tmdbItem.poster && (tmdbItem.poster !== dbItem.poster?.original)) {
        imagesToUpdate.push(...[IMAGE_FORMAT.WEBP, IMAGE_FORMAT.AVIF].map((format) => ({
            original: getTmdbImagePath(tmdbItem.poster, IMAGE_TYPE.POSTER),
            originalPath: tmdbItem.poster,
            target: targetPrefix + IMAGE_TYPE.POSTER,
            imageType: IMAGE_TYPE.POSTER,
            type: format,
            quality: DEFAULT_IMAGE_QUALITY[format],
        })));
    }
    if (tmdbItem.backdrop && (tmdbItem.backdrop !== dbItem.backdrop?.original)) {
        imagesToUpdate.push(...[IMAGE_FORMAT.WEBP, IMAGE_FORMAT.AVIF].map((format) => ({
            original: getTmdbImagePath(tmdbItem.backdrop, IMAGE_TYPE.BACKDROP),
            originalPath: tmdbItem.backdrop,
            target: targetPrefix + IMAGE_TYPE.BACKDROP,
            imageType: IMAGE_TYPE.BACKDROP,
            type: format,
            quality: DEFAULT_IMAGE_QUALITY[format],
        })));
    }
    if (tmdbItem.logo && (tmdbItem.logo !== dbItem.logo?.original)) {
        imagesToUpdate.push(...[IMAGE_FORMAT.WEBP, IMAGE_FORMAT.AVIF].map((format) => ({
            original: getTmdbImagePath(tmdbItem.logo, IMAGE_TYPE.LOGO),
            originalPath: tmdbItem.logo,
            target: targetPrefix + IMAGE_TYPE.LOGO,
            imageType: IMAGE_TYPE.LOGO,
            type: format,
            quality: DEFAULT_IMAGE_QUALITY[format],
        })));
    }
    if (tmdbItem.widePoster && (tmdbItem.widePoster !== dbItem.widePoster?.original)) {
        imagesToUpdate.push(...[IMAGE_FORMAT.WEBP, IMAGE_FORMAT.AVIF].map((format) => ({
            original: getTmdbImagePath(tmdbItem.widePoster, IMAGE_TYPE.WIDE_POSTER),
            originalPath: tmdbItem.widePoster,
            target: targetPrefix + IMAGE_TYPE.WIDE_POSTER,
            imageType: IMAGE_TYPE.WIDE_POSTER,
            type: format,
            quality: DEFAULT_IMAGE_QUALITY[format],
        })));
    }

    return imagesToUpdate;
}
