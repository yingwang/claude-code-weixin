import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { WeixinApi } from "../weixin/api.js";
import { aesEncrypt, generateAesKey } from "./aes-ecb.js";
import { logger } from "../util/logger.js";

export interface UploadResult {
  fileId: string;
  fileUrl: string;
  aesKey: string;
  fileSize: number;
  fileName: string;
}

/**
 * Upload a file to WeChat CDN with AES encryption.
 * 1. Generate AES key
 * 2. Encrypt the file
 * 3. Get pre-signed upload URL
 * 4. PUT encrypted data to CDN
 */
export async function uploadFile(
  api: WeixinApi,
  filePath: string
): Promise<UploadResult> {
  const fileName = basename(filePath);
  const rawData = readFileSync(filePath);
  const aesKey = generateAesKey();
  const encrypted = aesEncrypt(rawData, aesKey);

  logger.debug(
    `Uploading ${fileName} (${rawData.length} bytes, encrypted: ${encrypted.length} bytes)`
  );

  const { data, errcode, errmsg } = await api.getUploadUrl(
    fileName,
    encrypted.length,
    aesKey
  );

  if (errcode !== 0 || !data) {
    throw new Error(`getUploadUrl failed: ${errcode} ${errmsg}`);
  }

  // PUT encrypted file to CDN
  const putRes = await fetch(data.upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(encrypted.length),
    },
    body: encrypted as unknown as BodyInit,
  });

  if (!putRes.ok) {
    throw new Error(`CDN upload failed: ${putRes.status} ${putRes.statusText}`);
  }

  logger.info(`Uploaded ${fileName} -> ${data.file_id}`);

  return {
    fileId: data.file_id,
    fileUrl: data.file_url,
    aesKey,
    fileSize: rawData.length,
    fileName,
  };
}
