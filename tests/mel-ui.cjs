const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.GUIDE_BASE_URL || 'http://127.0.0.1:4185';
const output = process.env.GUIDE_SCREENSHOTS || '.tmp-mel-ui';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{width:1440,height:1000}, {width:390,height:844}, {width:320,height:568}, {width:667,height:375}]) {
      const context = await browser.newContext({viewport, reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      const turns = [];
      let sessions = 0;
      let widgetLoads = 0;
      let verified = false;
      let acceptChallenge = false;
      let mode = 'ok';
      let remaining = 3;
      const resetAt = new Date(Date.now()+86400_000).toISOString();
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/lab-notes', route => route.fulfill({json:{notes:[]}}));
      await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', route => {
        widgetLoads++;
        return route.fulfill({contentType:'application/javascript',body:`window.turnstile={
          render(element,options){const button=document.createElement('button');button.type='button';
            button.textContent='테스트 보안 확인';button.id='synthetic-challenge';
            button.onclick=()=>options.callback('synthetic-token-'+crypto.randomUUID());element.append(button);return button.id;},
          remove(id){document.getElementById(id)?.remove();}
        };`});
      });
      await page.route('**/api/mel/session', async route => {
        sessions++;
        const data = route.request().postDataJSON();
        if(!verified && !data.challenge) return route.fulfill({status:403,json:{code:'challenge_required'}});
        if(!verified && !acceptChallenge) return route.fulfill({status:403,json:{code:'challenge_failed'}});
        verified = true;
        await route.fulfill({json:{remaining,resetAt}});
      });
      await page.route('**/api/mel/turn', async route => {
        const data = route.request().postDataJSON();
        turns.push(data);
        assert.deepEqual(Object.keys(data).sort(), ['question','requestId']);
        if (mode === 'disconnect') return route.abort('failed');
        if (mode === 'pending') return route.fulfill({status:202,json:{code:'pending',remaining:2,resetAt}});
        if (mode === 'rate') return route.fulfill({status:429,json:{code:'rate_limited'},headers:{'Retry-After':'60'}});
        if (mode === 'failed') return route.fulfill({status:503,json:{code:'failed',remaining,resetAt}});
        if (mode === 'global') return route.fulfill({status:429,json:{code:'global_limit',remaining,resetAt}});
        if (mode === 'hostile') return route.fulfill({json:{remaining:2,resetAt,answer:{id:'fake',reply:'FAKE_UNREVIEWED',sources:[{title:'bad',url:'javascript:alert(1)'}]}}});
        remaining--;
        return route.fulfill({json:{remaining,resetAt,answer:{id:'person',reply:'김혜인은 사용자 문제를 구조화하고 제품으로 만들어요.',sources:[{title:'Founder 보기',url:'https://happitatlabs.com/#founder'}]}}});
      });
      await page.goto(base);
      await page.getByRole('button',{name:'멜 안내 열기'}).click();
      const dialog = page.getByRole('dialog');
      await page.getByRole('button',{name:'AI로 질문하기',exact:true}).click();
      assert.equal(sessions, 0);
      assert.equal(turns.length, 0);
      assert.equal(widgetLoads, 0);
      await page.getByRole('button',{name:'확인하고 시작하기'}).click();
      await page.getByRole('button',{name:'테스트 보안 확인'}).waitFor();
      assert.equal(widgetLoads,1);
      assert.equal(await page.getByRole('textbox',{name:'궁금한 점'}).count(),0);
      await page.screenshot({path:path.join(output,`challenge-${viewport.width}.png`)});
      await page.getByRole('button',{name:'테스트 보안 확인'}).click();
      await page.getByRole('status').filter({hasText:'결과를 확인하지 못했어요'}).waitFor();
      const rejectedSessions = sessions;
      await page.waitForTimeout(250);
      assert.equal(sessions,rejectedSessions);
      acceptChallenge = true;
      await page.getByRole('button',{name:'보안 확인 다시 하기'}).click();
      await page.getByRole('button',{name:'테스트 보안 확인'}).click();
      await page.getByRole('textbox',{name:'궁금한 점'}).waitFor();
      assert.equal(sessions, 3);
      const input = page.getByRole('textbox',{name:'궁금한 점'});
      const submit = () => page.getByRole('button',{name:/^(질문 보내기|답변 확인)$/}).click();
      await input.fill('어떤 일을 하세요?');
      await submit();
      await page.getByLabel('멜의 답변',{exact:true}).waitFor();
      await page.waitForFunction(() => document.activeElement?.className === 'guide-ai-answer');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'guide-ai-answer');
      const source = page.getByRole('navigation',{name:'답변 근거'}).getByRole('link');
      assert.equal(await source.getAttribute('href'),'https://happitatlabs.com/#founder');
      assert.equal(await source.getAttribute('target'),'_blank');
      assert.ok((await source.getAttribute('rel')).includes('noopener'));
      await page.screenshot({path:path.join(output,`answer-${viewport.width}.png`)});
      const rect = await dialog.boundingBox();
      assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= viewport.width+1 && rect.y+rect.height<=viewport.height+1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
      assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length),0);
      // Network uncertainty must preserve idempotency and not silently resubmit.
      mode = 'disconnect';
      await input.fill('프로젝트 소개');
      await submit();
      await page.getByRole('status').filter({hasText:'연결이 끊겨'}).waitFor();
      const failedId = turns.at(-1).requestId;
      const count = turns.length;
      await page.waitForTimeout(250);
      assert.equal(turns.length,count);
      assert.equal(await input.getAttribute('readonly'),'');
      mode = 'rate';
      await submit();
      await page.getByRole('status').filter({hasText:'1분 뒤'}).waitFor();
      assert.equal(turns.at(-1).requestId,failedId);
      assert.equal(await input.getAttribute('readonly'),'');
      mode = 'pending';
      await submit();
      await page.getByRole('status').filter({hasText:'아직 답변'}).waitFor();
      assert.equal(turns.at(-1).requestId,failedId);
      mode = 'ok';
      await submit();
      await page.getByLabel('멜의 답변',{exact:true}).waitFor();
      assert.equal(turns.at(-1).requestId,failedId);
      // Failures and daily limits keep static navigation and close accessible.
      for (const errorMode of ['failed','rate','global','hostile']) {
        mode = errorMode;
        await input.fill('다른 질문');
        await submit();
        await page.getByRole('status').filter({hasText: errorMode === 'failed' ? '차감하지' : errorMode === 'rate' ? '1분 뒤' : errorMode === 'global' ? '마감' : '연결할 수'}).waitFor();
        assert.equal(await page.getByText('FAKE_UNREVIEWED',{exact:true}).count(),0);
        if (errorMode === 'hostile') break;
      }
      const close = page.getByRole('button',{name:'멜 안내 닫기',exact:true});
      assert.equal(await close.isVisible(),true);
      const box = await close.boundingBox();
      assert.ok(box.width>=44 && box.height>=44);
      await input.focus();
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(),0);
      assert.equal(await page.getByRole('button',{name:'멜 안내 열기'}).evaluate(el=>el===document.activeElement),true);
      await page.getByRole('button',{name:'멜 안내 열기'}).click();
      await page.locator('#guide-question-projects').click();
      assert.ok((await page.locator('#guide-answer-projects').innerText()).includes('SQL Diagnoser'));
      for (const theme of ['dawn','day','dusk','night']) {
        await page.evaluate(value => document.documentElement.dataset.timeTheme=value,theme);
        assert.equal(await dialog.evaluate(el=>getComputedStyle(el).animationName),'none');
      }
      await page.setViewportSize({width:viewport.width,height:420});
      await page.waitForFunction(() => {
        const box = document.querySelector('.guide-bubble').getBoundingClientRect();
        return box.y >= 0 && box.bottom <= innerHeight;
      });
      const small = await dialog.boundingBox();
      assert.ok(small.y>=0 && small.y+small.height<=420);
      assert.deepEqual(errors,[]);
      await context.close();
      console.log(`PASS ${viewport.width}x${viewport.height}: opt-in, source links, requests, retry, failures, bounds, focus, reduced motion, static navigation`);
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
