const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3025";
const OUT = path.join(__dirname, "..", "shots");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--hide-scrollbars", "--disable-gpu", "--no-sandbox"],
  });

  const cases = [
    { name: "mobile-home", url: "/", width: 390, height: 844 },
    { name: "mobile-upload", url: "/upload", width: 390, height: 844 },
    { name: "desktop-home", url: "/", width: 1280, height: 900 },
  ];

  for (const c of cases) {
    const page = await browser.newPage();
    await page.setViewport({ width: c.width, height: c.height, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument(() => {
      try {
        sessionStorage.setItem("mona:photo", "/assets/user-photo.jpg");
      } catch (e) {}
    });
    await page.goto(BASE + c.url, { waitUntil: "networkidle0", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUT, c.name + ".png") });
    console.log("shot", c.name);
    await page.close();
  }

  await browser.close();
})();
