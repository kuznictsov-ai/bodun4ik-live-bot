import { TikTokLiveConnection } from "tiktok-live-connector";
import fs from "fs";

const TIKTOK_USERNAME = "bodun4ik_";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = "@Bodun4ik_Live";

const stateFile = "state.json";

let wasLive = false;

if (fs.existsSync(stateFile)) {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  wasLive = state.wasLive || false;
}

const connection = new TikTokLiveConnection(TIKTOK_USERNAME);

const isLive = await connection.fetchIsLive();

console.log(`TikTok LIVE: ${isLive}`);

if (isLive && !wasLive) {
  const text =
    "🔴 <b>Bodun4ik_ вийшов у TikTok LIVE!</b>\n\n" +
    "🎮 Заходь на стрім та підтримай ❤️\n\n" +
    "▶️ <a href=\"https://www.tiktok.com/@bodun4ik_\">ДИВИТИСЯ LIVE</a>";

  const url =
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: false
    })
  });

  console.log("Telegram notification sent!");
}

fs.writeFileSync(
  stateFile,
  JSON.stringify({ wasLive: isLive }, null, 2)
);
