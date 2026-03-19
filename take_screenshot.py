import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        await page.goto('http://localhost:3000/')
        # Wait for menu to load
        await page.wait_for_timeout(3000)
        await page.screenshot(path='c:/Users/khoal/OneDrive/Máy tính/cafe_qr_production_backup/debug_screenshot.png')
        await browser.close()
        print("Screenshot taken at debug_screenshot.png")

asyncio.run(main())
