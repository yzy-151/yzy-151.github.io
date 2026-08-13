const { chromium } = require("playwright");
const path = require("path");

async function checkViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  const failed = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => failed.push(request.url()));
  await page.goto("http://127.0.0.1:8088/", { waitUntil: "networkidle" });
  const layout = await page.evaluate(() => ({
    title: document.title,
    width: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    images: [...document.images].map((image) => ({ src: image.src, complete: image.complete, width: image.naturalWidth })),
  }));
  if (layout.width > layout.viewport) throw new Error(`${name}: horizontal overflow ${layout.width} > ${layout.viewport}`);
  if (layout.images.some((image) => !image.complete || image.width === 0)) throw new Error(`${name}: broken image`);
  if (errors.length || failed.length) throw new Error(`${name}: console=${errors.join(" | ")} failed=${failed.join(" | ")}`);

  await page.locator('[data-filter="agent"]').click();
  const visibleCards = await page.locator(".repo-card:visible").count();
  if (visibleCards !== 2) throw new Error(`${name}: expected 2 filtered cards, got ${visibleCards}`);
  await page.locator('[data-filter="all"]').click();
  await page.screenshot({ path: path.join(process.env.PORTFOLIO_SHOTS, `${name}.png`), fullPage: true });
  await page.close();
  return { name, title: layout.title, visibleCards, images: layout.images.length, width: layout.width };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_PATH,
  });
  try {
    const results = [];
    results.push(await checkViewport(browser, "desktop", { width: 1440, height: 1000 }));
    results.push(await checkViewport(browser, "mobile", { width: 390, height: 844 }));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
