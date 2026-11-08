import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,existsSync} from 'node:fs';
import {simulate} from './balance.ts';
import {DAY_SECONDS,serialize} from '../src/game.ts';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(!process.env.CI&&existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} ${m.location().url}`);});
const base=process.env.TEST_URL||'http://127.0.0.1:5173';
const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('adventurers-shop-v1')));
try{
 await page.clock.install();await page.goto(base);await page.waitForSelector('[data-action="start"]');await page.evaluate(()=>document.fonts.ready);
 assert.equal((await snapshot()).cash,200);
 await page.locator('[data-action="start"]').click();assert.match(await page.locator('#toast').innerText(),/Полки пусты/);await page.locator('[data-action="cancel-empty"]').click();
 await page.locator('[data-action="buy"][data-item="1"][data-qty="5"]').click();
 await page.locator('[data-action="buy"][data-item="0"][data-qty="5"]').click();
 if(await page.locator('[data-action="buy"][data-item="2"][data-qty="1"]').isEnabled())await page.locator('[data-action="buy"][data-item="2"][data-qty="1"]').click();
 const input=page.getByRole('spinbutton',{name:'Цена: Зелье здоровья'});await input.fill('29');await input.blur();
 assert.equal((await snapshot()).stock[1].price,29);
 const before=await snapshot();assert.ok(before.cash<200);assert.ok(before.stock[1].qty===5);
 await page.reload();assert.equal((await snapshot()).cash,before.cash);assert.equal(await input.inputValue(),'29');
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/shop-desktop.png',fullPage:true});
 await page.locator('[data-action="start"]').click();
 await page.clock.runFor(6000);assert.ok((await page.locator('#journal').innerText()).includes('·'));
 const quoted=structuredClone((await snapshot()).visits);
 await input.fill('31');await page.clock.runFor(1500);assert.equal(await input.inputValue(),'31');
 assert.ok(await input.evaluate(el=>el===document.activeElement));await input.press('Enter');
 assert.equal((await snapshot()).stock[1].price,31);assert.deepEqual((await snapshot()).visits.slice(0,quoted.length),quoted);
 await page.screenshot({path:'test-results/shop-sales.png',fullPage:true});
 await page.locator('#main-action').click();const paused=(await snapshot()).elapsed;await page.clock.runFor(6000);assert.equal((await snapshot()).elapsed,paused);
 await page.reload();assert.equal((await snapshot()).paused,true);await page.locator('#main-action').click();
 // Preserve economic timers; reduce decorative frames during accelerated campaign time.
 await page.evaluate(()=>{window.requestAnimationFrame=callback=>window.setTimeout(()=>callback(performance.now()),1000);});
 await page.clock.runFor(DAY_SECONDS*1000+200);assert.equal((await snapshot()).phase,'summary');await page.waitForSelector('.summary-modal');
 const day1=await snapshot();assert.equal(day1.cash,200-day1.stats.procurement+day1.stats.revenue-day1.stats.rent);
 await page.screenshot({path:'test-results/day-summary.png',fullPage:true});
 await page.locator('.summary-modal [data-action="next"]').click();assert.equal((await snapshot()).day,2);
 // Exercise all remaining days through real controls. Time advances through the same intervals as play.
 for(let day=2;day<=7;day++){
  const g=await snapshot();if(g.phase==='lost')break;console.log(`Browser campaign: day ${day}`);
  for(const i of [1,2,4,3,0,5]){
   const buy=page.locator(`[data-action="buy"][data-item="${i}"][data-qty="1"]`);
   if(await buy.isEnabled())await buy.click();
  }
  await page.locator('[data-action="market"]').click();
  await page.locator('[data-action="start"]').click();await page.clock.runFor(DAY_SECONDS*1000+200);
  assert.ok(['summary','won','lost'].includes((await snapshot()).phase));
  if(day<7&&(await snapshot()).phase==='summary')await page.locator('.summary-modal [data-action="next"]').click();
 }
 assert.ok(['won','lost'].includes((await snapshot()).phase));
 await page.screenshot({path:'test-results/final-screen.png',fullPage:true});
 await page.locator('.summary-modal [data-action="confirm-reset"]').click();assert.equal((await snapshot()).day,1);assert.equal((await snapshot()).cash,200);
 // Render a naturally won campaign from the same economic engine, with all seven reconciled reports.
 let winningGame;for(let seed=1;seed<=400;seed++){const candidate=simulate(seed,'adaptive');if(candidate.phase==='won'){winningGame=candidate;break;}}assert.ok(winningGame);const winningSave=serialize(winningGame);await page.addInitScript(value=>localStorage.setItem('adventurers-shop-v1',value),winningSave);await page.reload();assert.equal((await snapshot()).phase,'won');await page.waitForSelector('text=Лавка процветает!');
 await page.screenshot({path:'test-results/victory.png',fullPage:true});
 await page.locator('.summary-modal [data-action="confirm-reset"]').click();
 await page.locator('[data-action="help"]').first().click();await page.waitForSelector('.help-modal');await page.locator('[data-action="close-help"]').click();
 await page.locator('[data-action="reset"]').click();await page.locator('[data-action="cancel-reset"]').click();assert.equal((await snapshot()).cash,200);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/shop-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 assert.deepEqual(errors,[]);
 console.log('Browser passed: purchase, pricing, save/reload, pause, seven-day campaign, win/loss, restart, help, mobile layout; no console errors.');
}finally{await browser.close();}
