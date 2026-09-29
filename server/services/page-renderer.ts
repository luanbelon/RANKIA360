import type { Browser } from "puppeteer";

const RENDER_TIMEOUT_MS = 15_000;
const MAX_CONCURRENT_RENDERS = 2;
const BLOCKED_RESOURCES = new Set(["image", "media", "font", "stylesheet", "texttrack", "eventsource", "manifest"]);

let browserPromise: Promise<Browser> | null = null;
let activeRenders = 0;
const waiting: Array<() => void> = [];

export type UrlGuard = (url: URL) => Promise<boolean>;

function renderingEnabled() {
  return (process.env.AUDIT_BROWSER_RENDER ?? "on").toLowerCase() !== "off";
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = import("puppeteer")
      .then(({ default: puppeteer }) => puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run", "--mute-audio"],
      }))
      .then(browser => {
        browser.on("disconnected", () => { browserPromise = null; });
        return browser;
      })
      .catch(error => {
        browserPromise = null;
        throw error;
      });
  }
  return browserPromise;
}

async function acquireSlot() {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders += 1;
    return;
  }
  await new Promise<void>(resolve => waiting.push(resolve));
  activeRenders += 1;
}

function releaseSlot() {
  activeRenders -= 1;
  waiting.shift()?.();
}

/**
 * Opens the page in a headless browser and returns the DOM after JavaScript runs.
 * Every request the page makes (scripts, XHR, redirects) must pass `isAllowed`, which keeps
 * the browser from reaching private networks. Returns null when rendering is unavailable.
 */
export async function renderPage(url: URL, isAllowed: UrlGuard, userAgent: string): Promise<string | null> {
  if (!renderingEnabled()) return null;
  await acquireSlot();
  let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent(userAgent);
    await page.setRequestInterception(true);
    const decisions = new Map<string, Promise<boolean>>();
    page.on("request", request => {
      void (async () => {
        try {
          if (BLOCKED_RESOURCES.has(request.resourceType())) return request.abort();
          const target = new URL(request.url());
          if (target.protocol === "data:" || target.protocol === "blob:") return request.continue();
          const key = `${target.protocol}//${target.host}`;
          if (!decisions.has(key)) decisions.set(key, isAllowed(target).catch(() => false));
          return (await decisions.get(key)) ? request.continue() : request.abort();
        } catch {
          if (!request.isInterceptResolutionHandled()) await request.abort().catch(() => undefined);
        }
      })();
    });
    try {
      await page.goto(url.toString(), { waitUntil: "networkidle2", timeout: RENDER_TIMEOUT_MS });
    } catch {
      // Slow pages still get whatever has rendered so far.
    }
    return await page.content();
  } catch (error) {
    console.warn("[Audit] Browser rendering unavailable:", error instanceof Error ? error.message : error);
    return null;
  } finally {
    await page?.close().catch(() => undefined);
    releaseSlot();
  }
}
