import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createGame, serialize, rentFor } from '../src/game.ts';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (!process.env.CI && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const base = process.env.TEST_URL || 'http://127.0.0.1:5173';
const quick=process.argv.includes('--quick');
const sizes = quick?[[390,844]]:[[320,568], [360,740], [390,844], [430,932], [768,1024], [844,390]];
mkdirSync('test-results', { recursive: true });
try {
  for (const [width,height] of sizes) {
    const context = await browser.newContext({ viewport:{width,height}, isMobile:true, hasTouch:true, deviceScaleFactor:1, colorScheme:width===390||width===430?'dark':'light' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
    page.on('response', response => { if(response.status()>=400) errors.push(`${response.status()} ${response.url()}`); });
    const fixture = serialize(createGame(17));
    await page.addInitScript(value => {
      if(!sessionStorage.getItem('mobile-test-ready')) {
        localStorage.setItem('adventurers-shop-v1', value);
        sessionStorage.setItem('mobile-test-ready','true');
      }
    }, fixture);
    const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('adventurers-shop-v1')));
    const tab = name => page.locator(`.mobile-nav [data-tab="${name}"]`);
    const noOverflow = async () => {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=window.innerWidth&&window.innerWidth===window.visualViewport.width), `page overflows at ${width}×${height}`);
      assert.ok(await page.locator('.table-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth), `goods require horizontal scrolling at ${width}`);
    };
    const fixedAction = async () => {
      const box = await page.locator('#main-action').boundingBox();
      assert.ok(box&&box.height>=44&&box.y>=0&&box.y+box.height<=height, 'day action must remain visible and tappable');
      assert.equal(await page.locator('#main-action').evaluate(el=>el.parentElement.id),'mobile-action-slot');
    };
    await page.clock.install();
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await fixedAction();
    await tab('goods').tap();
    await page.clock.runFor(250);
    assert.equal(await tab('goods').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#goods tr').count(),6);
    await noOverflow();
    for(const element of await page.locator('.buy-controls button, .price-step, .mobile-nav button, .topbar button, .speed-controls button').all()) {
      const box = await element.boundingBox();
      const label = await element.getAttribute('aria-label') || await element.innerText();
      // A translating button can report 43.99999 px even with a 44 px CSS height.
      assert.ok(box&&Math.round(box.width)>=44&&Math.round(box.height)>=44,`touch target smaller than 44 px: ${label} ${JSON.stringify(box)}`);
    }
    const buyPotion = page.locator('[data-action="buy"][data-item="1"][data-qty="1"]');
    await buyPotion.tap();
    const bought = await state();
    assert.equal(bought.stock[1].qty,1);
    assert.equal(bought.cash,200-bought.costs[1]);
    const price = page.getByRole('spinbutton',{name:'Цена: Зелье здоровья'});
    assert.ok(await price.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16),'price input would zoom on iOS');
    await price.fill('33');
    // Blurring a field by tapping another control must apply both changes on the first tap.
    await page.locator('[data-action="buy"][data-item="0"][data-qty="1"]').tap();
    assert.equal((await state()).stock[0].qty,1);
    assert.equal((await state()).stock[1].price,33);
    await page.getByRole('button',{name:'Повысить цену: Зелье здоровья',exact:true}).tap();
    assert.equal((await state()).stock[1].price,34);
    await page.getByRole('button',{name:'Снизить цену: Зелье здоровья',exact:true}).tap();
    assert.equal((await state()).stock[1].price,33);
    await price.fill('1');await price.press('Enter');
    assert.equal(await page.getByRole('button',{name:'Снизить цену: Зелье здоровья',exact:true}).isDisabled(),true);
    await price.fill('28');await price.blur();
    await page.locator('#goods tr').last().scrollIntoViewIfNeeded();
    await fixedAction();await noOverflow();
    if(width===390&&!quick) {
      await tab('goods').tap();
      await page.screenshot({path:'test-results/mobile-goods.png',animations:'disabled'});
    }
    await tab('upgrades').tap();
    assert.ok(await page.locator('.event-card').isVisible());
    assert.doesNotMatch(await page.locator('#event-desc').innerText(),/×\s*\d|спрос[^.]*\d/i);
    await page.locator('[data-action="upgrade"][data-id="ads"]').tap();
    assert.equal((await state()).upgrades.ads,1);
    await tab('goods').tap();
    await page.locator('#main-action').tap();
    assert.equal((await state()).phase,'sales');
    assert.equal(await tab('shop').getAttribute('aria-pressed'),'true');
    await page.clock.runFor(6000);
    assert.ok((await page.locator('#journal').innerText()).includes('·'));
    await tab('goods').tap();
    assert.equal(await price.isDisabled(),false);
    assert.equal(await buyPotion.isDisabled(),false);
    await page.locator('#main-action').tap();
    const beforeUrgent=await state(), urgentCost=Math.ceil(beforeUrgent.costs[1]*115/100);
    assert.match(await page.locator('#goods tr').nth(1).innerText(),/15%/);
    await buyPotion.tap();
    const urgent=await state();
    assert.equal(urgent.cash,beforeUrgent.cash-urgentCost);
    assert.equal(urgent.stock[1].qty,beforeUrgent.stock[1].qty+1);
    assert.equal(urgent.stock[1].lots.at(-1).cost,urgentCost);
    assert.equal(urgent.stats.procurement,beforeUrgent.stats.procurement+urgentCost);
    await page.locator('[data-action="speed"][data-speed="3"]').tap();
    assert.equal((await state()).speed,3);
    await page.clock.runFor(2000);assert.equal((await state()).elapsed,urgent.elapsed);
    await page.locator('#main-action').tap();
    const quoted=structuredClone((await state()).visits);
    await price.fill('31');await page.clock.runFor(1500);
    assert.equal(await price.inputValue(),'31','Visitor updates must not erase a draft price');
    assert.ok(await price.evaluate(el=>el===document.activeElement),'Typing must retain input focus');
    await price.press('Enter');assert.equal((await state()).stock[1].price,31);
    assert.ok((await state()).elapsed>=urgent.elapsed+4.5,'3× advances at least 4.5 game seconds in 1.5 real seconds');
    assert.deepEqual((await state()).visits.slice(0,quoted.length),quoted,'Existing guests keep their arrival prices');
    await page.getByRole('button',{name:'Повысить цену: Зелье здоровья',exact:true}).tap();
    assert.equal((await state()).stock[1].price,32);
    await page.locator('[data-action="market"]').tap();
    assert.equal((await state()).stock[1].price,(await state()).markets[1]);
    await fixedAction();
    await page.locator('#main-action').tap();
    const paused = await state();assert.equal(paused.paused,true);
    await price.fill('30');await price.press('Enter');assert.equal((await state()).stock[1].price,30);
    await page.clock.runFor(4000);assert.equal((await state()).elapsed,paused.elapsed);
    await page.reload();assert.equal((await state()).paused,true);assert.equal((await state()).speed,3);assert.equal((await state()).stock[1].price,30);
    await page.getByRole('button',{name:'Правила игры',exact:true}).tap();
    assert.ok(await page.locator('.help-modal').isVisible());
    assert.ok(await page.locator('#mobile-controls').evaluate(el=>el.inert));
    await page.locator('[data-action="close-help"]').tap();
    await fixedAction();
    if(width===390&&!quick)await page.screenshot({path:'test-results/mobile-shop.png',animations:'disabled'});
    // Confirmation freezes time, cancellation preserves the prior pause, and early closing uses the normal report.
    const beforeClose=await state();
    await page.locator('[data-action="end-day"]').tap();
    await page.clock.runFor(3000);assert.equal((await state()).elapsed,beforeClose.elapsed);
    await page.locator('[data-action="cancel-end"]').tap();assert.equal((await state()).paused,true);
    await page.locator('#main-action').tap();
    await page.locator('[data-action="end-day"]').tap();
    await page.locator('[data-action="cancel-end"]').tap();assert.equal((await state()).paused,false);
    await page.locator('#main-action').tap();
    const closing=await state();
    await page.locator('[data-action="end-day"]').tap();
    await page.locator('[data-action="confirm-end"]').tap();
    const closed=await state();
    assert.equal(closed.phase,'summary');assert.equal(closed.elapsed,closing.elapsed);
    assert.equal(closed.cash,closing.cash-rentFor(1));
    assert.deepEqual(closed.visits,closing.visits);
    await page.locator('.summary-modal [data-action="next"]').tap();
    assert.equal((await state()).day,2);assert.equal((await state()).speed,3);
    assert.equal(await tab('goods').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.urgent-label').count(),0);
    await fixedAction();await noOverflow();
    if(width===390&&!quick) {
      // Reflow to desktop must restore the same action and the full table.
      await page.setViewportSize({width:1280,height:1000});
      await page.clock.runFor(100);
      await page.waitForFunction(()=>document.getElementById('main-action').parentElement.id==='desktop-action-slot');
      assert.equal(await page.locator('#main-action').evaluate(el=>el.parentElement.id),'desktop-action-slot');
      assert.equal(await page.locator('#time-controls').evaluate(el=>el.parentElement.id),'desktop-time-slot');
      assert.ok(await page.locator('.shop-card').isVisible());
      assert.ok(await page.locator('.inventory-card').isVisible());
      assert.ok(await page.locator('aside').isVisible());
      assert.equal(await page.locator('table').evaluate(el=>getComputedStyle(el).display),'table');
    }
    assert.deepEqual(errors,[]);
    console.log(`Mobile passed ${width}×${height}: touch purchases, first-tap price commit, price steps, upgrades, urgent FIFO purchases, 3× time, pause, save, early-close confirmation, next day, no horizontal overflow.`);
    await context.close();
  }
} finally { await browser.close(); }
