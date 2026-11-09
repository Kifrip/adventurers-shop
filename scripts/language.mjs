import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createGame,startDay,finishDay,serialize,EVENTS,eventDescription,GOODS,UPGRADES,CUSTOMERS} from '../src/game.ts';
import {translate} from '../src/i18n.ts';
const started=performance.now();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(!process.env.CI&&existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const base=process.env.TEST_URL||'http://127.0.0.1:5173';
const cyrillic=/[а-яё]/i;
for(const entry of [...GOODS,...UPGRADES,...CUSTOMERS])assert.ok(!cyrillic.test(translate(entry.name,'en')),entry.name);
for(let i=0;i<EVENTS.length;i++){const g=createGame(1);g.event=i;assert.ok(!cyrillic.test(translate(eventDescription(g),'en')),eventDescription(g));}
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(!sessionStorage.getItem('lang-ready')){localStorage.clear();sessionStorage.setItem('lang-ready','1');}});
  await page.goto(base);await page.locator('[data-action="language"]').click();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  const clean=async()=>{
   const leftovers=await page.locator('#app').evaluate(root=>{
    const bad=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
    while((n=walker.nextNode()))if(/[а-яё]/i.test(n.textContent))bad.push(n.textContent);
    for(const el of root.querySelectorAll('[aria-label],[title],[data-label]'))for(const key of ['aria-label','title','data-label'])if(/[а-яё]/i.test(el.getAttribute(key)||''))bad.push(el.getAttribute(key));return bad;
   });assert.deepEqual(leftovers,[]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  };
  await clean();await page.locator('[data-action="theme"]').click();await clean();
  if(width<800)await page.locator('.mobile-nav [data-tab="goods"]').click();
  await page.locator('[data-action="buy"][data-item="1"][data-qty="1"]').click();
  await page.getByRole('spinbutton',{name:'Price: Health potion',exact:true}).fill('33');
  await page.getByRole('spinbutton',{name:'Price: Health potion',exact:true}).press('Enter');
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('adventurers-shop-v1')));
  const before=await saved();await page.locator('[data-action="language"]').click();assert.equal((await saved()).cash,before.cash);assert.match(await page.title(),/Лавка/);
  await page.locator('[data-action="language"]').click();assert.equal((await saved()).stock[1].price,33);
  await page.locator('#main-action').click();await page.locator('#main-action').click();
  const paused=await saved();await page.locator('[data-action="language"]').click();await page.locator('[data-action="language"]').click();assert.deepEqual(await saved(),paused);
  await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal((await saved()).paused,true);
  await page.locator('[data-action="help"]').first().click();await clean();await page.locator('[data-action="close-help"]').click();
  await page.locator('[data-action="end-day"]').click();await clean();await page.locator('[data-action="confirm-end"]').click();await clean();
  await page.locator('.summary-modal [data-action="next"]').click();await clean();
  await page.locator('[data-action="reset"]').click();await clean();await page.locator('[data-action="confirm-reset"]').click();
  await page.locator('#main-action').click();await clean();await page.locator('[data-action="cancel-empty"]').click();
  for(const phase of ['won','lost']){const g=createGame(9);g.day=7;g.cash=phase==='won'?1200:200;startDay(g);finishDay(g);await page.evaluate(raw=>localStorage.setItem('adventurers-shop-v1',raw),serialize(g));await page.reload();await clean();}
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log(`English passed: 3 widths, language persistence, purchases/prices, paused save preservation, help, confirmations, reports, win/loss and all events (${((performance.now()-started)/1000).toFixed(1)} s).`);
}finally{await browser.close();}
