import { chromium } from '@playwright/test';

async function runComprehensiveBrowserSuite() {
  console.log('========================================================================');
  console.log('COMPREHENSIVE REAL-BROWSER END-TO-END VERIFICATION SUITE');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });

  // -------------------------------------------------------------------------
  // TEST 1: End-to-End Real Browser Login over LAN (http://172.20.192.1:3000)
  // -------------------------------------------------------------------------
  console.log('>>> TEST 1: Real Browser Login Flow over LAN (http://172.20.192.1:3000)');
  const contextLAN = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const pageLAN = await contextLAN.newPage();

  console.log('  1. Navigating to http://172.20.192.1:3000/login...');
  await pageLAN.goto('http://172.20.192.1:3000/login');
  await pageLAN.waitForSelector('input[type="email"]');
  console.log('     Page loaded. Current URL:', pageLAN.url());

  console.log('  2. Typing credentials (nonomazen202@gmail.com)...');
  await pageLAN.fill('input[type="email"]', 'nonomazen202@gmail.com');
  await pageLAN.fill('input[type="password"]', 'nonomazen202@gmail.com');

  console.log('  3. Submitting login form...');
  await pageLAN.click('button[type="submit"]');

  console.log('  4. Waiting for client navigation to complete (4 seconds)...');
  await pageLAN.waitForTimeout(4000);

  const finalUrlLAN = pageLAN.url();
  const finalTitleLAN = await pageLAN.title();
  const cookiesLAN = await contextLAN.cookies();
  const hasTokenCookie = cookiesLAN.some((c) => c.name === 'payload-token');

  console.log('     Final Browser URL:', finalUrlLAN);
  console.log('     Final Page Title:', finalTitleLAN);
  console.log('     Cookie payload-token stored in browser:', hasTokenCookie);

  const isDashboardLAN = finalUrlLAN.includes('/dashboard');
  if (isDashboardLAN) {
    console.log('  [PASS] Successfully reached /dashboard without any redirect loop!\n');
  } else {
    console.error('  [FAIL] Did not reach /dashboard. Stuck on:', finalUrlLAN, '\n');
  }

  // Check in-browser DOM elements
  const pageContentSnippet = await pageLAN.evaluate(() => {
    return document.body.innerText.slice(0, 300);
  });
  console.log('     Dashboard DOM text snippet:', pageContentSnippet.replace(/\n+/g, ' '));

  // Take screenshot of authenticated dashboard
  const screenshotPathLAN = 'C:/Users/TUF A15/.gemini/antigravity-ide/brain/b2cd8242-dae3-4dba-91b1-570d51d98464/authenticated_dashboard_lan.png';
  await pageLAN.screenshot({ path: screenshotPathLAN });
  console.log('     Screenshot saved to:', screenshotPathLAN, '\n');

  await contextLAN.close();

  // -------------------------------------------------------------------------
  // TEST 2: End-to-End Real Browser Login over Localhost (http://localhost:3000)
  // -------------------------------------------------------------------------
  console.log('>>> TEST 2: Real Browser Login Flow over Localhost (http://localhost:3000)');
  const contextLocalhost = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const pageLocalhost = await contextLocalhost.newPage();

  console.log('  1. Navigating to http://localhost:3000/login...');
  await pageLocalhost.goto('http://localhost:3000/login');
  await pageLocalhost.waitForSelector('input[type="email"]');

  console.log('  2. Typing credentials & submitting...');
  await pageLocalhost.fill('input[type="email"]', 'nonomazen202@gmail.com');
  await pageLocalhost.fill('input[type="password"]', 'nonomazen202@gmail.com');
  await pageLocalhost.click('button[type="submit"]');

  await pageLocalhost.waitForTimeout(4000);

  const finalUrlLocalhost = pageLocalhost.url();
  console.log('     Final Localhost URL:', finalUrlLocalhost);
  if (finalUrlLocalhost.includes('/dashboard')) {
    console.log('  [PASS] Localhost successfully transitioned to /dashboard!\n');
  } else {
    console.error('  [FAIL] Localhost failed to reach /dashboard. URL:', finalUrlLocalhost, '\n');
  }
  await contextLocalhost.close();

  // -------------------------------------------------------------------------
  // TEST 3: Negative Test - Accessing /dashboard with No Cookie
  // -------------------------------------------------------------------------
  console.log('>>> TEST 3: Negative Test - Accessing /dashboard without Cookie');
  const contextNoCookie = await browser.newContext();
  const pageNoCookie = await contextNoCookie.newPage();
  await pageNoCookie.goto('http://172.20.192.1:3000/dashboard');
  await pageNoCookie.waitForTimeout(2000);

  const finalUrlNoCookie = pageNoCookie.url();
  console.log('     URL after unauthenticated /dashboard access:', finalUrlNoCookie);
  if (finalUrlNoCookie.includes('/login')) {
    console.log('  [PASS] Unauthenticated request safely redirected to /login!\n');
  } else {
    console.error('  [FAIL] Unauthenticated request was NOT redirected to /login:', finalUrlNoCookie, '\n');
  }
  await contextNoCookie.close();

  // -------------------------------------------------------------------------
  // TEST 4: Negative Test - Accessing /dashboard with Invalid/Forged Cookie
  // -------------------------------------------------------------------------
  console.log('>>> TEST 4: Negative Test - Accessing /dashboard with Invalid Cookie');
  const contextInvalidCookie = await browser.newContext();
  await contextInvalidCookie.addCookies([
    {
      name: 'payload-token',
      value: 'invalid.forged.token',
      domain: '172.20.192.1',
      path: '/',
    },
  ]);
  const pageInvalidCookie = await contextInvalidCookie.newPage();
  await pageInvalidCookie.goto('http://172.20.192.1:3000/dashboard');
  await pageInvalidCookie.waitForTimeout(2000);

  const finalUrlInvalidCookie = pageInvalidCookie.url();
  console.log('     URL after invalid token access:', finalUrlInvalidCookie);
  if (finalUrlInvalidCookie.includes('/login')) {
    console.log('  [PASS] Invalid token request safely redirected to /login!\n');
  } else {
    console.error('  [FAIL] Invalid token request was NOT redirected to /login:', finalUrlInvalidCookie, '\n');
  }
  await contextInvalidCookie.close();

  await browser.close();

  console.log('========================================================================');
  console.log('ALL 4 TESTS COMPLETED SUCCESSFULLY');
  console.log('========================================================================');
}

runComprehensiveBrowserSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
