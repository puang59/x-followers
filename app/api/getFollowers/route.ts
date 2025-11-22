import puppeteer from 'puppeteer'
import { parseFollowerCount } from '@/app/utils/parser'

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    console.log("Received username:", username);
    const page = await browser.newPage();

    await page.goto("https://x.com/" + username, {
      waitUntil: 'networkidle2',
    });

    const selector = `a[href="/${username}/verified_followers"] span span`;
    await page.waitForSelector(selector);
    const raw = await page.$eval(
      selector,
      el => el.textContent?.trim() || ""
    );

    const followers = parseFollowerCount(raw);

    const photoSelector = `a[href="/${username}/photo"] img`;

    await page.waitForSelector(photoSelector, { timeout: 5000 });
    const profileImage = await page.$eval(photoSelector, el => el.getAttribute("src"));

    if (followers > 100000) {
      return Response.json({ error: "too many followers, cant render" });
    }

    return Response.json({ followers, profileImage });
  } catch (error) {
    console.error("Error in POST /api/getFollowers:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

}
