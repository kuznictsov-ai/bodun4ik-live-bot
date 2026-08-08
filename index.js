import { TikTokLiveConnection } from "tiktok-live-connector";
import fs from "fs";

const TIKTOK_USERNAME = "bodun4ik_";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = "@Bodun4ik_Live";

const stateFile = "state.json";

// Перевіряємо Telegram token
if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN is missing!");
  process.exit(1);
}

// Читаємо попередній стан
let wasLive = false;

if (fs.existsSync(stateFile)) {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    wasLive = state.wasLive === true;
  } catch {
    console.log("⚠️ Не вдалося прочитати state.json, починаємо з false");
    wasLive = false;
  }
}

console.log(`Previous state: ${wasLive}`);

// ВАЖЛИВО:
// Передаємо options другим параметром,
// щоб tiktok-live-connector не падав на processInitialData.
const connection = new TikTokLiveConnection(TIKTOK_USERNAME, {
  processInitialData: false
});

let isLive = false;

try {
  isLive = await connection.fetchIsLive();

  console.log(`TikTok LIVE: ${isLive}`);

  if (isLive && !wasLive) {
    console.log("🔴 LIVE started! Sending Telegram notification...");

    const text =
      "🔴 <b>Bodun4ik_ вийшов у TikTok LIVE!</b>\n\n" +
      "🎮 Заходь на стрім та підтримай ❤️\n\n" +
      '▶️ <a href="https://www.tiktok.com/@bodun4ik_">ДИВИТИСЯ LIVE</a>';

    const url =
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

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

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error("❌ Telegram error:", result);
      throw new Error("Telegram notification failed");
    }

    console.log("✅ Telegram notification sent successfully!");
  } else if (isLive && wasLive) {
    console.log("🟢 LIVE is still running. No notification needed.");
  } else {
    console.log("⚫ Not LIVE.");
  }

  // Зберігаємо стан
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

  console.log("✅ State saved.");
} catch (error) {
  console.error("❌ TikTok check failed:");
  console.error(error);
  process.exit(1);
}
