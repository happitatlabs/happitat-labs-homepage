const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const output = process.env.GUIDE_SCREENSHOTS || path.resolve('.tmp-guide-checks');
const baseUrl = process.env.GUIDE_BASE_URL || 'http://127.0.0.1:4181';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of [{width:1440,height:1000}, {width:390,height:844}, {width:320,height:568}, {width:667,height:375}]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      await page.route('**/api/lab-notes', route => route.fulfill({ json: { notes: [] } }));
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(baseUrl);
      await page.waitForTimeout(800);
      await page.evaluate(() => document.documentElement.dataset.timeTheme = 'day');
      const trigger = page.getByRole('button', { name: '포트폴리오 안내 열기' });
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.getByRole('dialog').count(), 0);
      await page.screenshot({path:path.join(output, `idle-${viewport.width}.png`)});
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      await trigger.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: '작업실 안내' });
      await dialog.waitFor();
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'guide-question-person');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'guide-question-projects');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'guide-question-person');
      const qs = ['person','projects','skills'];
      const expected = ['김혜인','SQL Diagnoser','React'];
      for (let i = 0; i < qs.length; i++) {
        await page.locator(`#guide-question-${qs[i]}`).click();
        const answer = page.locator(`#guide-answer-${qs[i]}`);
        assert.equal(await answer.isVisible(), true);
        assert.ok((await answer.innerText()).includes(expected[i]));
        assert.equal(await page.locator('.guide-answer:not([hidden])').count(), 1);
        const rect = await dialog.boundingBox();
        assert.ok(rect.x >= 0 && rect.y >= 0);
        assert.ok(rect.x + rect.width <= viewport.width + 1);
        assert.ok(rect.y + rect.height <= viewport.height + 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
      await page.locator('#guide-question-person').click();
      await page.screenshot({path:path.join(output, `answer-${viewport.width}.png`)});
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
      await trigger.click();
      await page.getByRole('button', {name:'안내 닫기', exact:true}).click();
      assert.equal(await page.getByRole('dialog').count(), 0);
      await trigger.click();
      await page.getByRole('button', {name:'포트폴리오 안내 닫기', exact:true}).click();
      assert.equal(await page.getByRole('dialog').count(), 0);
      await trigger.click();
      await page.locator('.brand').focus();
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.deepEqual(requests, []);
      await trigger.click();
      for (const theme of ['dawn','day','dusk','night']) {
        await page.evaluate(t => document.documentElement.dataset.timeTheme = t, theme);
        const colors = await dialog.evaluate(el => {
          const s = getComputedStyle(el);
          return {background:s.backgroundColor, text:s.color};
        });
        assert.notEqual(colors.background, colors.text);
        if (viewport.width === 1440) await page.screenshot({path:path.join(output, `theme-${theme}.png`)});
      }
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.getByRole('button', {name:'안내 닫기', exact:true}).click();
      const animation = await page.locator('.guide-character').evaluate(el => getComputedStyle(el).animationName);
      assert.equal(animation, 'none');
      assert.deepEqual(errors, []);
      results.push({viewport, checks:'questions, bounds, keyboard, focus, close, no requests, themes, reduced motion: PASS'});
      await context.close();
    }
    const page = await browser.newPage();
    await page.goto(new URL('/products/sql-diagnoser', baseUrl).href);
    await page.getByRole('button',{name:'포트폴리오 안내 열기'}).click();
    await page.getByRole('button',{name:'어떤 기술을 사용할 수 있어요?'}).click();
    assert.ok((await page.locator('#guide-answer-skills').innerText()).includes('Cloudflare Workers'));
    results.push({detail:'guide available on product route: PASS'});
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
