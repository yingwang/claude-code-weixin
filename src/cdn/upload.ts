import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { WeixinApi } from "../weixin/api.js";
import { aesEncrypt, generateAesKey } from "./aes-ecb.js";
import { logger } from "../util/logger.js";

const CDN_BASE_URL = "https://novac2c.cdn.weixin.qq.com/c2c";

export interface UploadResult {
  downloadParam: string; // x-encrypted-param from CDN response
  aesKey: string; // hex string
  fileSize: number; // plaintext size
  ciphertextSize: number; // encrypted size
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
export async function uploadFile(
  api: WeixinApi,
  filePath: string,
  toUserId: string,
  mediaType: number = 3 // 1=IMAGE, 2=VIDEO, 3=FILE
): Promise<UploadResult> {
  const fileName = basename(filePath);
  const rawData = readFileSync(filePath);
  const aesKey = generateAesKey(); // 32-char hex string
  const encrypted = aesEncrypt(rawData, aesKey);
  const filekey = randomBytes(16).toString("hex");
  const rawfilemd5 = createHash("md5").update(rawData).digest("hex");

  logger.debug(
    `Uploading ${fileName} (${rawData.length} bytes, encrypted: ${encrypted.length} bytes)`
  );

  const uploadRes = await api.getUploadUrl({
    filekey,
    media_type: mediaType,
    to_user_id: toUserId,
    rawsize: rawData.length,
    rawfilemd5,
    filesize: encrypted.length,
    aeskey: aesKey,
  });

  if (!uploadRes.upload_param) {
    throw new Error(
      `getUploadUrl failed: ret=${uploadRes.ret} ${uploadRes.errmsg || uploadRes.err_msg || ""}`
    );
  }

  // POST encrypted file to CDN
  const cdnUrl = `${CDN_BASE_URL}/upload?encrypted_query_param=${encodeURIComponent(uploadRes.upload_param)}&filekey=${encodeURIComponent(filekey)}`;

  const cdnRes = await fetch(cdnUrl, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Uint8Array(encrypted),
  });

  if (!cdnRes.ok) {
    throw new Error(`CDN upload failed: ${cdnRes.status} ${cdnRes.statusText}`);
  }

  const downloadParam = cdnRes.headers.get("x-encrypted-param");
  if (!downloadParam) {
    throw new Error("CDN upload response missing x-encrypted-param header");
  }

  logger.info(`Uploaded ${fileName} -> CDN`);

  return {
    downloadParam,
    aesKey,
    fileSize: rawData.length,
    ciphertextSize: encrypted.length,
    fileName,
  };
}
