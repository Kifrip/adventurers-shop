import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { createGame, startDay, tick, serialize } from '../src/game.ts';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (!process.env.CI && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true, args:['--no-sandbox','--disable-dev-shm-usage'],
});
const base = process.env.TEST_URL || 'http://127.0.0.1:5173';
mkdirSync('test-results', {recursive:true});
function luminance(rgb) {
  const linear = rgb.map(value=>{const x=value/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
}
async function readable(page, textSelector, backgroundSelector) {
  const colors = await page.evaluate(([text,background])=>[getComputedStyle(document.querySelector(text)).color,getComputedStyle(document.querySelector(background)).backgroundColor],[textSelector,backgroundSelector]);
  const [a,b] = colors.map(color=>luminance(color.match(/[\d.]+/g).slice(0,3).map(Number)));
  assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`Insufficient dark-theme text contrast: ${textSelector} ${colors}`);
}
try {
  for(const mobile of [false,true]) {
    const width=mobile?320:1440;
    const context=await browser.newContext({viewport:{width,height:mobile?740:1100},isMobile:mobile,hasTouch:mobile,colorScheme:mobile?'dark':'light'});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.clock.install();await page.goto(base);await page.waitForSelector('#theme-toggle');await page.evaluate(()=>document.fonts.ready);
    const theme=()=>page.locator('html').getAttribute('data-theme');
    const toggle=page.getByRole('button',{name:'Тёмная тема',exact:true});
    assert.equal(await theme(),mobile?'dark':'light');
    if(!mobile) {
      await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
      await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
    }
    if(mobile)await page.locator('.mobile-nav [data-tab="goods"]').tap();
    await page.locator('[data-action="buy"][data-item="0"][data-qty="1"]').click();
    const before=await page.evaluate(()=>localStorage.getItem('adventurers-shop-v1'));
    if(await theme()==='dark')await toggle.click();
    assert.equal(await theme(),'light');
    if(mobile)await page.locator('.mobile-nav [data-tab="shop"]').tap();
    await page.clock.runFor(250);
    const lightPixel=await page.locator('canvas').evaluate(canvas=>Array.from(canvas.getContext('2d').getImageData(25,30,1,1).data).slice(0,3));
    await toggle.click();await page.clock.runFor(250);
    assert.equal(await theme(),'dark');assert.equal(await toggle.getAttribute('aria-pressed'),'true');
    const darkPixel=await page.locator('canvas').evaluate(canvas=>Array.from(canvas.getContext('2d').getImageData(25,30,1,1).data).slice(0,3));
    assert.ok(luminance(darkPixel)<luminance(lightPixel),'Canvas must use evening colors');
    assert.equal(await page.evaluate(()=>localStorage.getItem('adventurers-shop-v1')),before,'Theme must not change the game save');
    assert.equal(await page.evaluate(()=>localStorage.getItem('adventurers-shop-theme')),'dark');
    await page.emulateMedia({colorScheme:'light'});assert.equal(await theme(),'dark','Explicit selection overrides system changes');
    await page.reload();assert.equal(await theme(),'dark');
    assert.equal(await page.evaluate(()=>localStorage.getItem('adventurers-shop-v1')),before);
    assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#131c18');
    assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).colorScheme),'dark');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    if(mobile) {
      for(const button of await page.locator('.topbar button').all()) {
        const box=await button.boundingBox();assert.ok(box&&Math.round(box.width)>=44&&Math.round(box.height)>=44&&box.x>=0&&box.x+box.width<=width,'Theme/help controls must fit on a small phone');
      }
    }
    await readable(page,'.wallet strong','html');
    await readable(page,'.event-card p','.event-card');
    if(mobile)await page.locator('.mobile-nav [data-tab="goods"]').tap();
    await readable(page,'.product strong','#goods tr');
    await readable(page,'.price-input input','.price-input');
    await page.screenshot({path:`test-results/theme-${mobile?'mobile':'desktop'}-dark.png`,animations:'disabled',fullPage:!mobile});
    await page.getByRole('button',{name:'Правила игры',exact:true}).click();
    await readable(page,'.help-modal p','.help-modal');
    assert.equal(await page.locator('.modal').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(29, 42, 34)');
    await page.locator('[data-action="close-help"]').click();
    await toggle.click();assert.equal(await theme(),'light');await page.reload();assert.equal(await theme(),'light');
    assert.deepEqual(errors,[]);
    console.log(`Themes passed ${mobile?'320 px touch':'desktop'}: system preference, night scene, contrast, toggle, persisted selection, unchanged game save, dialogs, no overflow.`);
    await context.close();
  }
  // Reports must have the same theme even when restored directly from a save.
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'light'});
  const page=await context.newPage();const game=createGame(17);startDay(game);tick(game,90);
  await page.addInitScript(save=>{localStorage.setItem('adventurers-shop-theme','dark');localStorage.setItem('adventurers-shop-v1',save);},serialize(game));
  await page.goto(base);await page.waitForSelector('.summary-modal');
  await readable(page,'.summary-grid span','.summary-grid');
  assert.equal(await page.locator('.summary-modal').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(29, 42, 34)');
  await page.screenshot({path:'test-results/theme-report-dark.png',animations:'disabled'});
  await page.locator('.summary-modal [data-action="next"]').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await context.close();
  const blocked=await browser.newContext({colorScheme:'dark'});const blockedPage=await blocked.newPage();
  await blockedPage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked','SecurityError');}}));
  await blockedPage.goto(base);await blockedPage.waitForSelector('#theme-toggle');
  assert.equal(await blockedPage.locator('html').getAttribute('data-theme'),'dark');
  await blockedPage.locator('#theme-toggle').click();assert.equal(await blockedPage.locator('html').getAttribute('data-theme'),'light');
  await blocked.close();
  console.log('Themes passed: restored day report and unavailable browser storage.');
} finally {await browser.close();}
