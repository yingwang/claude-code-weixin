import { aesDecrypt } from "./aes-ecb.js";
import { logger } from "../util/logger.js";
/**
 * Download and decrypt a media file from WeChat CDN.
 */
export async function downloadMedia(fileUrl, aesKey) {
    logger.debug(`Downloading media from CDN: ${fileUrl}`);
    const res = await fetch(fileUrl);
    if (!res.ok) {
        throw new Error(`CDN download failed: ${res.status} ${res.statusText}`);
    }
    const encrypted = Buffer.from(await res.arrayBuffer());
    const decrypted = aesDecrypt(encrypted, aesKey);
    logger.debug(`Downloaded and decrypted media: ${encrypted.length} -> ${decrypted.length} bytes`);
    return decrypted;
}
//# sourceMappingURL=download.js.map