const fs = require("fs");
const path = require("path");
const https = require("https");

const { TikTokLiveConnection } = require("tiktok-live-connector");

// ============================================================
// SETTINGS
// ============================================================

const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const STATE_FILE = path.join(__dirname, "state.json");

// ============================================================
// CHECK ENVIRONMENT
// ============================================================

if (!TIKTOK_USERNAME) {
    console.error("ERROR: TIKTOK_USERNAME is not set");
    process.exit(1);
}

if (!TELEGRAM_BOT_TOKEN) {
    console.error("ERROR: TELEGRAM_BOT_TOKEN is not set");
    process.exit(1);
}

if (!TELEGRAM_CHAT_ID) {
    console.error("ERROR: TELEGRAM_CHAT_ID is not set");
    process.exit(1);
}

console.log("Environment variables OK.");

// ============================================================
// STATE
// ============================================================

function loadState() {
    try {
        if (!fs.existsSync(STATE_FILE)) {
            console.log("state.json does not exist. Using default state.");

            return {
                wasLive: false,
                checkedAt: null
            };
        }

        const data = fs.readFileSync(STATE_FILE, "utf8");
        const state = JSON.parse(data);

        return {
            wasLive: Boolean(state.wasLive),
            checkedAt: state.checkedAt || null
        };

    } catch (error) {
        console.log("Could not read state.json.");
        console.log("Using default state.");

        return {
            wasLive: false,
            checkedAt: null
        };
    }
}

function saveState(wasLive) {
    const state = {
        wasLive: Boolean(wasLive),
        checkedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        STATE_FILE,
        JSON.stringify(state, null, 2) + "\n",
        "utf8"
    );

    console.log("State saved.");
}

// ============================================================
// TELEGRAM
// ============================================================

function sendTelegramMessage(message) {
    return new Promise((resolve, reject) => {

        const postData = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            disable_web_page_preview: false
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

        const request = https.request(options, (response) => {

            let body = "";

            response.on("data", (chunk) => {
                body += chunk;
            });

            response.on("end", () => {

                try {
                    const result = JSON.parse(body);

                    if (!result.ok) {
                        reject(
                            new Error(
                                `Telegram API error: ${
                                    result.description || body
                                }`
                            )
                        );

                        return;
                    }

                    console.log("Telegram API response: OK");

                    resolve(result);

                } catch (error) {

                    reject(
                        new Error(
                            `Invalid Telegram response: ${body}`
                        )
                    );
                }
            });
        });

        request.on("error", (error) => {
            reject(error);
        });

        request.write(postData);
        request.end();
    });
}

// ============================================================
// TIKTOK LIVE CHECK
// ============================================================

async function checkTikTokLive() {

    console.log(
        `Checking TikTok LIVE for @${TIKTOK_USERNAME}...`
    );

    const connection = new TikTokLiveConnection(
        TIKTOK_USERNAME,
        {
            fetchRoomInfoOnConnect: false
        }
    );

    try {

        const isLive = await connection.fetchIsLive();

        console.log(`TikTok LIVE: ${isLive}`);

        return Boolean(isLive);

    } catch (error) {

        console.error("TikTok check failed:");

        console.error(
            error?.message || error
        );

        throw error;
    }
}

// ============================================================
// MAIN
// ============================================================

async function main() {

    console.log("========================================");
    console.log("TikTok LIVE checker");
    console.log(`Username: @${TIKTOK_USERNAME}`);
    console.log("========================================");

    // --------------------------------------------------------
    // LOAD PREVIOUS STATE
    // --------------------------------------------------------

    const previousState = loadState();

    console.log(
        `Previous state: ${previousState.wasLive}`
    );

    // --------------------------------------------------------
    // CHECK TIKTOK
    // --------------------------------------------------------

    let isLive;

    try {

        isLive = await checkTikTokLive();

    } catch (error) {

        console.error(
            "Unable to reliably check TikTok LIVE."
        );

        console.error(
            "State was NOT changed."
        );

        process.exit(1);
    }

    // --------------------------------------------------------
    // OFFLINE -> LIVE
    // --------------------------------------------------------

    if (isLive && !previousState.wasLive) {

        console.log("========================================");
        console.log("LIVE STARTED!");
        console.log("========================================");

        const message =
            `🔴 TikTok LIVE розпочався!\n\n` +
            `@${TIKTOK_USERNAME}\n\n` +
            `👉 https://www.tiktok.com/@${TIKTOK_USERNAME}/live`;

        console.log(
            "Sending Telegram notification..."
        );

        try {

            await sendTelegramMessage(message);

            console.log(
                "Telegram notification sent successfully!"
            );

        } catch (error) {

            console.error(
                "Telegram notification failed:"
            );

            console.error(
                error?.message || error
            );

            // Не записуємо LIVE=true,
            // щоб наступний запуск спробував ще раз.

            process.exit(1);
        }
    }

    // --------------------------------------------------------
    // LIVE -> OFFLINE
    // --------------------------------------------------------

    if (!isLive && previousState.wasLive) {

        console.log("LIVE ended.");
    }

    // --------------------------------------------------------
    // LIVE -> LIVE
    // --------------------------------------------------------

    if (isLive && previousState.wasLive) {

        console.log(
            "Still LIVE. No notification needed."
        );
    }

    // --------------------------------------------------------
    // OFFLINE -> OFFLINE
    // --------------------------------------------------------

    if (!isLive && !previousState.wasLive) {

        console.log("Not LIVE.");
    }

    // --------------------------------------------------------
    // SAVE STATE
    // --------------------------------------------------------

    saveState(isLive);

    console.log("Done.");
}

// ============================================================
// RUN
// ============================================================

main().catch((error) => {

    console.error("Fatal error:");

    console.error(
        error?.message || error
    );

    process.exit(1);
});
