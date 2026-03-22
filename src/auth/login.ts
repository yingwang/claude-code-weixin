import qrcode from "qrcode-terminal";
import { WeixinLoginApi } from "../weixin/api.js";
import { saveBotToken } from "../channel-config.js";
import { logger } from "../util/logger.js";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 120_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Interactive QR code login flow.
 * 1. Fetch QR code URL from iLink API (bot_type=3)
 * 2. Display QR code in terminal
 * 3. Poll for scan status until confirmed or timeout
 * 4. Save bot_token to ~/.claude/channels/weixin/.env
 */
export async function loginFlow(
  apiBaseUrl = "https://ilinkai.weixin.qq.com"
): Promise<string> {
  const api = new WeixinLoginApi(apiBaseUrl);

  console.log("\n正在获取登录二维码...\n");

  const qrRes = await api.getQrCode();
  if (qrRes.ret !== 0 || !qrRes.qrcode) {
    throw new Error(
      `获取二维码失败: ret=${qrRes.ret} ${qrRes.err_msg || ""}`
    );
  }

  const qrcodeId = qrRes.qrcode;
  if (!qrRes.qrcode_img_content) {
    throw new Error("获取二维码失败: 未返回二维码内容");
  }
  const qrcodeUrl = qrRes.qrcode_img_content;

  // Display QR code in terminal
  qrcode.generate(qrcodeUrl, { small: true }, (code: string) => {
    console.log(code);
  });

  console.log(`\n请使用微信扫描上方二维码登录\n`);

  // Poll for scan status
  const deadline = Date.now() + TIMEOUT_MS;
  let lastStatus = "";

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    let status;
    try {
      status = await api.getQrCodeStatus(qrcodeId);
    } catch (err) {
      logger.debug("QR status poll error:", err);
      continue;
    }

    if (status.ret !== 0) {
      logger.debug(`QR status ret=${status.ret}`);
      continue;
    }

    const currentStatus = status.status;

    if (currentStatus === "wait") {
      // Still waiting for scan
    } else if (currentStatus === "scanned") {
      if (lastStatus !== "scanned") {
        console.log("已扫描，请在手机上确认...");
      }
    } else if (currentStatus === "confirmed" || currentStatus === "login") {
      if (!status.bot_token) {
        throw new Error("登录成功但未返回 bot_token");
      }
      console.log("\n登录成功！\n");
      saveBotToken(status.bot_token);
      return status.bot_token;
    } else if (currentStatus === "expired" || currentStatus === "timeout") {
      throw new Error("二维码已过期，请重新登录");
    }

    if (currentStatus) {
      lastStatus = currentStatus;
    }
  }

  throw new Error("登录超时，请重试");
}
