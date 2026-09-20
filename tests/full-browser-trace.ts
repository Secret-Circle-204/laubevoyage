import { chromium } from '@playwright/test';

async function runBrowserTrace() {
  console.log('========================================================================');
  console.log('AUTOMATED DEVTOOLS NETWORK & BROWSER FORENSIC TRACE OVER LAN');
  console.log('Target: http://172.20.192.1:3000/login');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  let reqCounter = 0;

  page.on('request', (req) => {
    reqCounter++;
    (req as any).__reqId = reqCounter;
    console.log(`\n>>> [REQ #${reqCounter}] ${req.method()} ${req.url()}`);
    const origin = req.headers()['origin'];
    const cookie = req.headers()['cookie'];
    const nextAction = req.headers()['next-action'];
    if (origin) console.log(`    Origin: ${origin}`);
    if (cookie) console.log(`    Cookie: ${cookie}`);
    if (nextAction) console.log(`    Next-Action: ${nextAction}`);
    if (req.method() === 'POST') {
      const postData = req.postData();
      if (postData) console.log(`    POST Data: ${postData.slice(0, 200)}`);
    }
  });

  page.on('response', async (res) => {
    const req = res.request();
    const reqId = (req as any).__reqId;
    console.log(`<<< [RES #${reqId}] ${res.status()} ${res.statusText()} for ${res.url()}`);
    const loc = res.headers()['location'];
    const setCookie = res.headers()['set-cookie'];
    if (loc) console.log(`    Location: ${loc}`);
    if (setCookie) console.log(`    Set-Cookie: ${setCookie}`);
  });

  console.log('\n--- Step 1: Navigating to http://172.20.192.1:3000/login ---');
  await page.goto('http://172.20.192.1:3000/login');
  
  // Wait for React hydration (wait 2 seconds)
  await page.waitForTimeout(2000);
  console.log('Page loaded and hydrated. Current URL:', page.url());

  console.log('\n--- Step 2: Filling in Credentials ---');
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await emailInput.click();
  await emailInput.fill('nonomazen202@gmail.com');
  
  await passwordInput.click();
  await passwordInput.fill('nonomazen202@gmail.com');

  console.log('\n--- Step 3: Clicking Sign In Button ---');
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  console.log('\n--- Step 4: Waiting for Navigation / Network Settlement (6 seconds) ---');
  await page.waitForTimeout(6000);

  const finalUrl = page.url();
  const finalTitle = await page.title();
  console.log('\n========================================================================');
  console.log('FINAL BROWSER STATE AFTER SUBMISSION:');
  console.log('Final URL:', finalUrl);
  console.log('Final Page Title:', finalTitle);
  console.log('========================================================================\n');

  const cookies = await context.cookies();
  console.log('--- Cookies Stored in Browser Context ---');
  console.log(JSON.stringify(cookies, null, 2));

  console.log('\n--- Step 6: Testing in-browser fetch("/api/customers/me") ---');
  const meResult = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/customers/me');
      const data = await res.json();
      return { status: res.status, data };
    } catch (e: any) {
      return { error: e.message };
    }
  });
  console.log('Result of in-browser /api/customers/me:', JSON.stringify(meResult, null, 2));

  const screenshotPath = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/b2cd8242-dae3-4dba-91b1-570d51d98464/final_browser_trace_screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });

  await browser.close();
}

runBrowserTrace().catch((err) => {
  console.error(err);
  process.exit(1);
});
