const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const logFile = fs.createWriteStream('remote_logs.txt');
    
    page.on('console', msg => {
        const text = `[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}\n`;
        console.log(text.trim());
        logFile.write(text);
    });
    
    page.on('pageerror', err => {
        const text = `[PAGE ERROR] ${err.message}\n`;
        console.log(text.trim());
        logFile.write(text);
    });
    
    page.on('requestfailed', request => {
        const text = `[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}\n`;
        console.log(text.trim());
        logFile.write(text);
    });

    try {
        await page.goto('https://coffee-house-topaz.vercel.app/admin', { waitUntil: 'networkidle', timeout: 15000 });
        console.log("Navigation finished");
    } catch (e) {
        console.error("Goto error:", e.message);
        logFile.write(`[GOTO ERROR] ${e.message}\n`);
    }

    await browser.close();
})();
