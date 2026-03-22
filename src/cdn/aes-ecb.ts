import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-128-ecb";

/** Generate a random 16-byte AES key, returned as hex string */
export function generateAesKey(): string {
  return randomBytes(16).toString("hex");
}

/** Encrypt a buffer with AES-128-ECB */
export function aesEncrypt(data: Buffer, keyHex: string): Buffer {
  const key = Buffer.from(keyHex, "hex");
  const cipher = createCipheriv(ALGORITHM, key, null);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

/** Decrypt a buffer with AES-128-ECB */
export function aesDecrypt(data: Buffer, keyHex: string): Buffer {
  const key = Buffer.from(keyHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, null);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
