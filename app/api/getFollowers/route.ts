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
        args: [
          ...chromium.args,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--single-process", // Important for Vercel's serverless environment
        ],
        executablePath,
      };
      console.log("Launching browser with executable path:", executablePath);
    } else {
      // Local: Use regular puppeteer with bundled Chromium
      puppeteer = await import("puppeteer");
    }

    console.log("Launching browser...");
    browser = await puppeteer.launch(launchOptions);
    console.log("Browser launched, creating page...");
    const page = await browser.newPage();

    // Set a reasonable timeout for the entire operation (60 seconds)
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // Block unnecessary resources to speed up page load
    await page.setRequestInterception(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    page.on("request", (req: any) => {
      const resourceType = req.resourceType();
      // Block heavy resources but allow images (needed for profile pic) and essential resources
      if (
        ["document", "script", "stylesheet", "xhr", "fetch", "image"].includes(
          resourceType
        )
      ) {
        req.continue();
      } else {
        req.abort();
      }
    });

    // Use 'domcontentloaded' instead of 'networkidle2' - much faster
    console.log("Navigating to page...");
    await page.goto("https://x.com/" + username, {
      waitUntil: "domcontentloaded",
      timeout: 30000, // 30 second timeout for page load
    });
    console.log("Page loaded, waiting for selector...");

    const selector = `a[href="/${username}/verified_followers"] span span`;
    await page.waitForSelector(selector, { timeout: 20000 }); // 20 second timeout
    const raw = await page.$eval(
      selector,
      (el: Element) => el.textContent?.trim() || ""
    );

    const followers = parseFollowerCount(raw);

    const photoSelector = `a[href="/${username}/photo"] img`;

    await page.waitForSelector(photoSelector, { timeout: 10000 }); // 10 second timeout
    const profileImage = await page.$eval(photoSelector, (el: Element) =>
      el.getAttribute("src")
    );

    if (followers > 100000) {
      return Response.json({ error: "too many followers, cant render" });
    }

    return Response.json({ followers, profileImage });
  } catch (error) {
    console.error("Error in POST /api/getFollowers:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    // Check if it's a timeout error
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("Timeout") ||
      errorMessage.includes("Navigation timeout")
    ) {
      return new Response(
        JSON.stringify({ error: "Request timed out. Please try again." }),
        {
          status: 504,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
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
