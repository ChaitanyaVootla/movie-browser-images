export const bytesToKb = (bytes: number): number => {
    return bytes / 1024;
}

export const bytesToGb = (bytes: number): number => {
    return bytes / (1024 * 1024 * 1024);
}
