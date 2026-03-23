import { WeixinApi } from "../weixin/api.js";
export interface UploadResult {
    downloadParam: string;
    aesKey: string;
    fileSize: number;
    ciphertextSize: number;
    fileName: string;
}
/**
 * Upload a file to WeChat CDN with AES encryption.
 * Follows the OpenClaw protocol:
 * 1. Generate AES key + filekey
 * 2. Encrypt the file
 * 3. Get upload_param from API
 * 4. POST encrypted data to CDN
 * 5. Return x-encrypted-param for use in sendMessage
 */
export declare function uploadFile(api: WeixinApi, filePath: string, toUserId: string, mediaType?: number): Promise<UploadResult>;
