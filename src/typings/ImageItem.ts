export interface DB_IMAGE_ITEM {
    id: string;
    type: ITEM_TYPE;
    logo?: IMAGE_OBJECT;
    logoLight?: IMAGE_OBJECT;
    logoDark?: IMAGE_OBJECT;
    poster?: IMAGE_OBJECT;
    backdrop?: IMAGE_OBJECT;
    widePoster?: IMAGE_OBJECT;
    lastUpdated: string;
}

export interface IMAGE_OBJECT {
    original: string;
    originalFullPath?: string;
    updatedAt?: string;
}

export enum ITEM_TYPE {
    MOVIE = 'movie',
    SERIES = 'series',
}

export enum IMAGE_TYPE {
    POSTER = 'poster',
    BACKDROP = 'backdrop',
    LOGO = 'logo',
    WIDE_POSTER = 'widePoster',
}

export enum IMAGE_FORMAT {
    WEBP = 'webp',
    AVIF = 'avif',
}