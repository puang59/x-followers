import puppeteer from 'puppeteer'

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
    const followers = await page.$eval(
      selector,
      el => el.textContent?.trim() || ""
    );

    return new Response(JSON.stringify({ followers: followers }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in POST /api/getFollowers:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

}
