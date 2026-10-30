const puppeteer = require("puppeteer-core");
const path = require("path");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE || "http://localhost:3025";
const SAMPLE = path.join(__dirname, "..", "public", "assets", "model-face.png");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function ok(name, cond) {
  results.push({ name, pass: !!cond });
  console.log((cond ? "PASS " : "FAIL ") + name);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 402, height: 874, deviceScaleFactor: 1 });

  // 1. Landing -> upload via CTA
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  const cta = await page.$("a[href='/upload']");
  ok("landing has Mulai Konsultasi CTA", !!cta);
  await cta.click();
  await page.waitForFunction(() => location.pathname === "/upload", { timeout: 15000 });
  ok("CTA navigates to /upload", page.url().endsWith("/upload"));

  // 2. Upload a file via the gallery input
  const inputs = await page.$$("input[type=file]");
  ok("upload has a gallery file input", inputs.length === 1);
  await inputs[0].uploadFile(SAMPLE);
  await page.waitForFunction(() => location.pathname === "/preview", { timeout: 15000 });
  ok("file select navigates to /preview", page.url().endsWith("/preview"));
  const stored = await page.evaluate(() => sessionStorage.getItem("mona:photo"));
  ok("photo stored in sessionStorage", !!stored && stored.startsWith("data:"));

  // 3. Preview -> Gunakan Foto -> scan -> auto results
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((x) => x.textContent.includes("Gunakan Foto"));
    b && b.click();
  });
  await page.waitForFunction(() => location.pathname === "/scan", { timeout: 15000 });
  ok("Gunakan Foto goes to /scan", page.url().endsWith("/scan"));
  await page.waitForFunction(() => location.pathname === "/results", { timeout: 15000 });
  ok("scan auto-redirects to /results", page.url().endsWith("/results"));

  // 4. Results -> click a recommendation card -> detail
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find((x) =>
      x.textContent.trim().startsWith("Long Wave")
    );
    b && b.click();
  });
  await page.waitForFunction(() => location.pathname === "/results/long-wave", { timeout: 15000 });
  ok("recommendation card opens /results/long-wave", page.url().endsWith("/results/long-wave"));

  // 5. Detail preview modal open + close
  await page.evaluate(() => {
    const btn = document.querySelector("button[aria-label^='Perbesar']");
    btn && btn.click();
  });
  await sleep(400);
  const modalOpen = await page.evaluate(() => !!document.querySelector("button[aria-label='Tutup Preview Gambar']"));
  ok("preview modal opens", modalOpen);
  await page.evaluate(() => {
    const b = document.querySelector("button[aria-label='Tutup Preview Gambar']");
    b && b.click();
  });
  await sleep(300);
  const modalClosed = await page.evaluate(() => !document.querySelector("button[aria-label='Tutup Preview Gambar']"));
  ok("preview modal closes", modalClosed);

  // 6. Invalid flow: simulate a face that cannot be detected -> /error
  await page.evaluate(() => {
    sessionStorage.setItem("mona:photo", "/assets/user-photo.jpg");
    sessionStorage.setItem("mona:invalid", "1");
  });
  await page.goto(BASE + "/scan", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => location.pathname === "/error", { timeout: 15000 });
  ok("invalid simulation redirects to /error", page.url().endsWith("/error"));

  // 7. Error retry opens the in-app camera
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find((x) =>
      x.textContent.includes("Ambil Ulang Foto")
    );
    b && b.click();
  });
  await page.waitForFunction(() => !!document.body.textContent?.includes("Kamera Mona Salon"), {
    timeout: 15000,
  });
  ok("error retry opens camera modal", true);

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
