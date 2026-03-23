/** Generate a random 16-byte AES key, returned as hex string */
export declare function generateAesKey(): string;
/** Encrypt a buffer with AES-128-ECB */
export declare function aesEncrypt(data: Buffer, keyHex: string): Buffer;
/** Decrypt a buffer with AES-128-ECB */
export declare function aesDecrypt(data: Buffer, keyHex: string): Buffer;
