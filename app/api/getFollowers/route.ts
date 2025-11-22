import { parseFollowerCount } from "@/app/utils/parser";

// URL to the Chromium binary package hosted in /public
const CHROMIUM_PACK_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/chromium-pack.tar`
  : "https://github.com/gabenunez/puppeteer-on-vercel/raw/refs/heads/main/example/chromium-dont-use-in-prod.tar";

// Cache the Chromium executable path to avoid re-downloading on subsequent requests
let cachedExecutablePath: string | null = null;
let downloadPromise: Promise<string> | null = null;

/**
 * Downloads and caches the Chromium executable path.
 * Uses a download promise to prevent concurrent downloads.
 */
async function getChromiumPath(): Promise<string> {
  // Return cached path if available
  if (cachedExecutablePath) return cachedExecutablePath;

  // Prevent concurrent downloads by reusing the same promise
  if (!downloadPromise) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromium = (await import("@sparticuz/chromium-min")).default as any;
    downloadPromise = chromium
      .executablePath(CHROMIUM_PACK_URL)
      .then((path: string) => {
        cachedExecutablePath = path;
        console.log("Chromium path resolved:", path);
        return path;
      })
      .catch((error: unknown) => {
        console.error("Failed to get Chromium path:", error);
        downloadPromise = null; // Reset on error to allow retry
        throw error;
      });
  }

  return downloadPromise as Promise<string>;
}

export async function POST(request: Request) {
  let browser;
  try {
    const { username } = await request.json();
    console.log("Received username:", username);

    // Configure browser based on environment
    const isVercel = !!process.env.VERCEL_ENV;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let puppeteer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let launchOptions: any = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };

    if (isVercel) {
      // Vercel: Use puppeteer-core with downloaded Chromium binary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromium = (await import("@sparticuz/chromium-min")).default as any;
      puppeteer = await import("puppeteer-core");
      const executablePath = await getChromiumPath();
      launchOptions = {
        ...launchOptions,
        args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
        executablePath,
      };
      console.log("Launching browser with executable path:", executablePath);
    } else {
      // Local: Use regular puppeteer with bundled Chromium
      puppeteer = await import("puppeteer");
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.goto("https://x.com/" + username, {
      waitUntil: "networkidle2",
    });

    const selector = `a[href="/${username}/verified_followers"] span span`;
    await page.waitForSelector(selector);
    const raw = await page.$eval(
      selector,
      (el: Element) => el.textContent?.trim() || ""
    );

    const followers = parseFollowerCount(raw);

    const photoSelector = `a[href="/${username}/photo"] img`;

    await page.waitForSelector(photoSelector, { timeout: 5000 });
    const profileImage = await page.$eval(photoSelector, (el: Element) =>
      el.getAttribute("src")
    );

    if (followers > 100000) {
      return Response.json({ error: "too many followers, cant render" });
    }

    return Response.json({ followers, profileImage });
  } catch (error) {
    console.error("Error in POST /api/getFollowers:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    // Always clean up browser resources
    if (browser) {
      await browser.close();
    }
  }
}
