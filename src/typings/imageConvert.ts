import { IMAGE_FORMAT, IMAGE_TYPE, ITEM_TYPE } from "./ImageItem";

export interface CONVERT_PAYLOAD {
    original: string;
    id: string;
    itemType: ITEM_TYPE,
    target: string;
    originalPath: string;
    imageType: IMAGE_TYPE;
    type: IMAGE_FORMAT;
    quality: number;
}

export interface CONVERT_RESULT {
    original: string;
    id: string;
    itemType: ITEM_TYPE,
    target: string;
    originalPath: string;
    imageType: IMAGE_TYPE;
    type: IMAGE_FORMAT;
    success: boolean;
    originalSizeBytes: number;
    sizeBytes: number;
    compressionRatio: number;
}

export interface ITEM_CONVERT_STATS {
    totalConverted: number;
    totalFailed: number;
    totalOriginalSizeBytes: number;
    totalSizeBytes: number;
    averageCompressionRatio: number;
}

export interface GENERATE_IMAGE_DB_DATA {
    id: string;
    type: ITEM_TYPE;
    imageType: IMAGE_TYPE;
    original: string;
}