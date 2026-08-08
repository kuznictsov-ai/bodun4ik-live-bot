const https = require("https");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN) {
    console.error("ERROR: TELEGRAM_BOT_TOKEN is not set");
    process.exit(1);
}

if (!TELEGRAM_CHAT_ID) {
    console.error("ERROR: TELEGRAM_CHAT_ID is not set");
    process.exit(1);
}

function sendTelegramMessage(message) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        });

        const options = {
            hostname: "api.telegram.org",
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });

            res.on("end", () => {
                try {
                    const result = JSON.parse(body);

                    console.log("Telegram response:", result);

                    if (!result.ok) {
                        reject(
                            new Error(
                                result.description || "Telegram API error"
                            )
                        );
                        return;
                    }

                    resolve(result);
                } catch (error) {
                    reject(
                        new Error(`Invalid Telegram response: ${body}`)
                    );
                }
            });
        });

        req.on("error", reject);

        req.write(postData);
        req.end();
    });
}

async function main() {
    console.log("========================================");
    console.log("Telegram test");
    console.log("========================================");

    await sendTelegramMessage(
        "🔔 ТЕСТОВЕ ПОВІДОМЛЕННЯ\n\n" +
        "Telegram-бот працює правильно! ✅"
    );

    console.log("Telegram message sent successfully! ✅");
}

main().catch((error) => {
    console.error("Telegram test failed:");
    console.error(error.message || error);
    process.exit(1);
});
