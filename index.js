import fs from "fs";

const USERNAME = "bodun4ik_";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = "@Bodun4ik_Live";

const STATE_FILE = "state.json";

let wasLive = false;

if (fs.existsSync(STATE_FILE)) {
  try {
    wasLive = JSON.parse(fs.readFileSync(STATE_FILE)).wasLive ?? false;
  } catch {}
}

async function isLive() {
  try {
    const res = await fetch(
      `https://www.tiktok.com/@${USERNAME}/live`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
        }
      }
    );

    const html = await res.text();

    return (
      html.includes('"status":2') ||
      html.includes('"LIVE"') ||
      html.includes('"liveRoomId"')
    );
  } catch (e) {
    console.log(e);
    return false;
  }
}

const live = await isLive();

console.log("LIVE:", live);

if (live && !wasLive) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      parse_mode: "HTML",
      text:
`🔴 <b>Bodun4ik почав TikTok LIVE!</b>

🎮 Заходь підтримати!

https://www.tiktok.com/@${USERNAME}/live`
    })
  });

  console.log("Повідомлення відправлено.");
}

fs.writeFileSync(
  STATE_FILE,
  JSON.stringify({ wasLive: live }, null, 2)
);
