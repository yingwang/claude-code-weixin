/**
 * Download and decrypt a media file from WeChat CDN.
 */
export declare function downloadMedia(fileUrl: string, aesKey: string): Promise<Buffer>;
