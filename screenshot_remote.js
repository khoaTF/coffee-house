const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.log(`[PAGE ERROR] ${err.message}`);
    });
    
    try {
        await page.goto('https://coffee-house-topaz.vercel.app/admin', { waitUntil: 'networkidle' });
        console.log("Saving screenshot...");
        await page.screenshot({ path: 'remote_admin.png', fullPage: true });
    } catch (e) {
        console.error("Goto error:", e.message);
    }
    await browser.close();
})();
