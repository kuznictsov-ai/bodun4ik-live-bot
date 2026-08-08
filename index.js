import { TikTokLiveConnection } from "tiktok-live-connector";
import fs from "fs";

const TIKTOK_USERNAME = "bodun4ik_";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = "@Bodun4ik_Live";

const stateFile = "state.json";

let wasLive = false;

// ===============================
// LOAD STATE
// ===============================

if (fs.existsSync(stateFile)) {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    wasLive = state.wasLive === true;
  } catch (error) {
    console.log("Could not read state.json. Starting with wasLive = false.");
    wasLive = false;
  }
}

console.log(`Previous state: ${wasLive}`);

// ===============================
// CHECK TELEGRAM TOKEN
// ===============================

if (!TELEGRAM_TOKEN) {
  console.error("ERROR: TELEGRAM_TOKEN is not set!");
  process.exit(1);
}

// ===============================
// CHECK TIKTOK LIVE
// ===============================

const connection = new TikTokLiveConnection(TIKTOK_USERNAME);

let isLive = false;

try {
  isLive = await connection.fetchIsLive();
} catch (error) {
  console.error("TikTok check error:");
  console.error(error);
  process.exit(1);
}

console.log(`TikTok LIVE: ${isLive}`);

// ===============================
// SEND TELEGRAM
// ===============================

async function sendTelegramMessage() {
  const text =
    "🔴 <b>Bodun4ik_ вийшов у TikTok LIVE!</b>\n\n" +
    "🎮 Заходь на стрім та підтримай ❤️\n\n" +
    "▶️ <a href=\"https://www.tiktok.com/@bodun4ik_\">ДИВИТИСЯ LIVE</a>";

  const url =
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  console.log("Sending Telegram notification...");
  console.log(`Telegram chat: ${TELEGRAM_CHAT_ID}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false
      })
    });

    const data = await response.json();

    console.log(`Telegram HTTP status: ${response.status}`);
    console.log("Telegram API response:");
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok || data.ok !== true) {
      console.error("❌ Telegram rejected the message!");
      return false;
    }

    console.log("✅ Telegram accepted the message!");

    if (data.result) {
      console.log(`Telegram message ID: ${data.result.message_id}`);
      console.log(`Telegram chat ID: ${data.result.chat?.id}`);
      console.log(`Telegram chat type: ${data.result.chat?.type}`);
    }

    return true;

  } catch (error) {
    console.error("❌ Telegram request failed:");
    console.error(error);
    return false;
  }
}

// ===============================
// LIVE STATE LOGIC
// ===============================

if (isLive && !wasLive) {
  console.log("🟢 NEW LIVE DETECTED!");

  const sent = await sendTelegramMessage();

  if (sent) {
    console.log("Telegram notification sent successfully!");
  } else {
    console.log("Telegram notification was NOT sent.");
  }

} else if (isLive && wasLive) {
  console.log("LIVE is still active. No duplicate notification.");

} else if (!isLive && wasLive) {
  console.log("🔵 LIVE ended.");

} else {
  console.log("Not LIVE.");
}

// ===============================
// SAVE STATE
// ===============================

fs.writeFileSync(
  stateFile,
  JSON.stringify(
    {
      wasLive: isLive,
      checkedAt: new Date().toISOString()
    },
    null,
    2
  )
);

console.log("State saved.");
