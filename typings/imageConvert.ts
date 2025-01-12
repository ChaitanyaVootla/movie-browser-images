import { IMAGE_FORMAT, IMAGE_TYPE } from "./ImageItem";

export interface CONVERT_PAYLOAD {
    original: string;
    target: string;
    originalPath: string;
    imageType: IMAGE_TYPE;
    type: IMAGE_FORMAT;
    quality: number;
}

export interface CONVERT_RESULT {
    original: string;
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
