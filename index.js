import { TikTokLiveConnection } from "tiktok-live-connector";
import fs from "fs";

const TIKTOK_USERNAME = "bodun4ik_";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = "@Bodun4ik_Live";

const STATE_FILE = "state.json";

if (!TELEGRAM_TOKEN) {
  throw new Error("TELEGRAM_TOKEN is not configured");
}

// -------------------------
// Load previous state
// -------------------------

let wasLive = false;

if (fs.existsSync(STATE_FILE)) {
  try {
    const state = JSON.parse(
      fs.readFileSync(STATE_FILE, "utf8")
    );

    wasLive = state.wasLive === true;
  } catch (error) {
    console.log("Could not read state.json. Starting with wasLive=false.");
    wasLive = false;
  }
}

// -------------------------
// Check TikTok LIVE
// -------------------------

let isLive = false;

try {
  const connection = new TikTokLiveConnection(
    TIKTOK_USERNAME,
    {
      processInitialData: false,
      fetchRoomInfoOnConnect: false
    }
  );

  isLive = await connection.fetchIsLive();

  console.log(`TikTok LIVE: ${isLive}`);
} catch (error) {
  console.error("TikTok check failed:");
  console.error(error);

  // Do NOT send a Telegram notification if TikTok check failed.
  process.exit(1);
}

// -------------------------
// Send Telegram notification
// only when state changes:
// false -> true
// -------------------------

if (isLive && !wasLive) {
  console.log("LIVE started! Sending Telegram notification...");

  const telegramUrl =
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  const response = await fetch(telegramUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text:
        "🔴 <b>Bodun4ik_ вийшов у TikTok LIVE!</b>\n\n" +
        "🎮 Заходь на стрім та підтримай ❤️\n\n" +
        "▶️ <a href=\"https://www.tiktok.com/@bodun4ik_/live\">ДИВИТИСЯ LIVE</a>",
      parse_mode: "HTML",
      disable_web_page_preview: false
    })
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    console.error("Telegram API error:");
    console.error(result);

    throw new Error("Telegram notification failed");
  }

  console.log("Telegram notification sent successfully!");
} else if (isLive && wasLive) {
  console.log("Still LIVE. Notification already sent.");
} else {
  console.log("Not LIVE.");
}

// -------------------------
// Save current state
// -------------------------

fs.writeFileSync(
  STATE_FILE,
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
