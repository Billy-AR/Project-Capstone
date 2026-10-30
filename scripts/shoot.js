const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE || "http://localhost:3000";
const OUT = path.join(__dirname, "..", "shots");

const pages = [
  { name: "home", url: "/", wait: 1200 },
  { name: "upload", url: "/upload", wait: 1200 },
  { name: "preview", url: "/preview", wait: 1200 },
  { name: "scan", url: "/scan", wait: 1400, seed: true },
  { name: "results", url: "/results", wait: 1200 },
  { name: "detail-layer", url: "/results/layer-cut", wait: 1200 },
  { name: "detail-longwave", url: "/results/long-wave", wait: 1200 },
  { name: "detail-hime", url: "/results/hime-cut", wait: 1200 },
  { name: "error", url: "/error", wait: 1200 },
  { name: "detail-modal", url: "/results/layer-cut", wait: 1000, openModal: true },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--hide-scrollbars", "--disable-gpu", "--no-sandbox"],
  });

  for (const p of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: 402, height: 874, deviceScaleFactor: 2 });
    if (p.seed) {
      await page.evaluateOnNewDocument(() => {
        try {
          sessionStorage.setItem("mona:photo", "/assets/user-photo.jpg");
        } catch (e) {}
      });
    }
    await page.goto(BASE + p.url, { waitUntil: "networkidle0", timeout: 60000 });
    await new Promise((r) => setTimeout(r, p.wait));

    if (p.openModal) {
      // click the hairstyle preview image button (first button in main)
      await page.evaluate(() => {
        const btn = document.querySelector("button[aria-label^='Perbesar']");
        if (btn) btn.click();
      });
      await new Promise((r) => setTimeout(r, 600));
    }

    await page.screenshot({ path: path.join(OUT, p.name + ".png"), fullPage: true });
    console.log("shot", p.name);
    await page.close();
  }

  await browser.close();
})();
