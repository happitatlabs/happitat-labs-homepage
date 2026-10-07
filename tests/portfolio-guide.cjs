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
      const trigger = page.getByRole('button', { name: '멜 안내 열기' });
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.getByRole('dialog').count(), 0);
      await page.screenshot({path:path.join(output, `idle-${viewport.width}.png`)});
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      await trigger.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: '안녕하세요, 멜이에요' });
      await dialog.waitFor();
      assert.equal(await dialog.getByRole('textbox').count(), 0);
      assert.equal(await dialog.locator('form, input, textarea').count(), 0);
      const storageBefore = await page.evaluate(() => ({local: {...localStorage}, session: {...sessionStorage}, cookie: document.cookie}));
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'guide-question-projects');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'guide-question-person');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'guide-question-projects');
      const qs = ['person','projects','skills','career','contact'];
      const expected = ['김혜인','SQL Diagnoser','React','AI Product Builder','이메일'];
      for (let i = 0; i < qs.length; i++) {
        await page.locator(`#guide-question-${qs[i]}`).click();
        const answer = page.locator(`#guide-answer-${qs[i]}`);
        assert.equal(await answer.isVisible(), true);
        assert.ok((await answer.innerText()).includes(expected[i]));
        assert.equal(await page.locator('.guide-answer:not([hidden])').count(), 1);
        assert.ok(await answer.getByRole('navigation').getByRole('link').count() >= 1);
        for (const link of await answer.getByRole('link').all()) {
          const box = await link.boundingBox();
          assert.ok(box.height >= 44);
        }
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
      assert.equal(await page.locator('.guide-bubble').getAttribute('inert'), '');
      await page.locator('.guide-bubble').waitFor({state:'detached'});
      await trigger.click();
      await page.getByRole('button', {name:'멜 안내 닫기', exact:true}).click();
      assert.equal(await page.getByRole('dialog').count(), 0);
      await trigger.click();
      await page.getByRole('button', {name:'멜 안내 접기', exact:true}).click();
      assert.equal(await page.getByRole('dialog').count(), 0);
      await trigger.click();
      await page.locator('.brand').focus();
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.deepEqual(requests, []);
      assert.deepEqual(await page.evaluate(() => ({local: {...localStorage}, session: {...sessionStorage}, cookie: document.cookie})), storageBefore);
      await trigger.click();
      // Rapid close/reopen must cancel the pending exit and restore focus.
      await page.getByRole('button', {name:'멜 안내 접기', exact:true}).click();
      await trigger.click();
      await page.waitForTimeout(250);
      assert.equal(await dialog.count(), 1);
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'guide-question-projects');
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
      assert.equal(await dialog.evaluate(el => getComputedStyle(el).animationName), 'none');
      await page.getByRole('button', {name:'멜 안내 닫기', exact:true}).click();
      assert.equal(await page.locator('.guide-bubble').count(), 0);
      const animation = await page.locator('.guide-character').evaluate(el => getComputedStyle(el).animationName);
      assert.equal(animation, 'none');
      // A smaller visual viewport must still leave the close control accessible.
      await page.setViewportSize({width:viewport.width, height:420});
      await trigger.click();
      const smallBox = await dialog.boundingBox();
      assert.ok(smallBox.y >= 0 && smallBox.y + smallBox.height <= 420);
      const closeBox = await page.getByRole('button',{name:'멜 안내 닫기',exact:true}).boundingBox();
      assert.ok(closeBox.width >= 44 && closeBox.height >= 44);
      await page.getByRole('button',{name:'멜 안내 닫기',exact:true}).click();
      assert.deepEqual(errors, []);
      results.push({viewport, checks:'Mel, 5 topics, source links, no text input, CTA size, bounds, keyboard, focus, exit, rapid reopen, no requests or storage changes, themes, reduced motion, resized viewport: PASS'});
      await context.close();
    }
    const page = await browser.newPage({viewport:{width:390,height:844}, reducedMotion:'reduce'});
    await page.route('**/api/lab-notes', route => route.fulfill({json:{notes:[]}}));
    const openTopic = async (id) => {
      await page.getByRole('button',{name:'멜 안내 열기'}).click();
      await page.locator(`#guide-question-${id}`).click();
    };
    await page.goto(baseUrl);
    const targets = [];
    for (const id of ['projects','person','skills','career','contact']) {
      await openTopic(id);
      targets.push(...await page.locator(`#guide-answer-${id} a`).evaluateAll(links => links.map(a => ({href:a.getAttribute('href'), target:a.target, rel:a.rel}))));
      await page.keyboard.press('Escape');
    }
    const notion = targets.find(link => link.href.startsWith('https://'));
    assert.equal(notion.href, 'https://kimhyein.notion.site/AI-28df11285b02807e839bf0764cdef515');
    assert.equal(notion.target, '_blank');
    assert.ok(notion.rel.includes('noopener'));
    assert.ok(targets.some(link => link.href === 'mailto:pletta@naver.com'));
    for (const href of new Set(targets.map(link => link.href).filter(href => href.startsWith('/')))) {
      const response = await page.goto(new URL(href, baseUrl).href);
      if (response) assert.ok(response.ok());
      assert.equal(new URL(page.url()).pathname + new URL(page.url()).hash, href);
      assert.ok(!(await page.locator('h1').innerText()).includes('준비 중'));
      const hash = new URL(page.url()).hash;
      if (hash) {
        await page.locator(hash).waitFor({state:'visible'});
        await page.waitForFunction(selector => {
          const top = document.querySelector(selector).getBoundingClientRect().top;
          const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
          return top >= header - 1 && top < header + 25;
        }, hash);
      }
    }
    // Cross-page Contact navigation, then repeated same-hash navigation and focus.
    await page.goto(new URL('/products/sql-diagnoser', baseUrl).href);
    await openTopic('contact');
    await page.getByRole('link',{name:'Contact로 이동',exact:true}).click();
    await page.waitForURL('**/#contact');
    await page.locator('#contact').waitFor({state:'visible'});
    await page.evaluate(() => scrollTo(0,0));
    await openTopic('contact');
    await page.getByRole('link',{name:'Contact로 이동',exact:true}).press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'contact');
    await page.waitForFunction(() => document.querySelector('#contact').getBoundingClientRect().top < 200);
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.goto(baseUrl);
    await openTopic('projects');
    await page.getByRole('link',{name:'SQL Diagnoser: 프로젝트 보기',exact:true}).click();
    await page.waitForURL('**/products/sql-diagnoser');
    await openTopic('skills');
    await page.getByRole('link',{name:'Frontend / Product Engineering: 구현 기술 보기',exact:true}).click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'sql-stack');
    results.push({navigation:'all CTA routes/anchors, project click, same/cross-page hash navigation, target focus, Notion and email: PASS'});
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
