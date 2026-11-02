import './style.css';
import './mobile.css';
import './theme.css';
import { initTheme, toggleTheme } from './theme';
import { GOODS, EVENTS, UPGRADES, CUSTOMERS, DAY_SECONDS, GOAL, SAVE_KEY, createGame, buy, setPrice, upgrade, startDay, tick, nextDay, capacity, stockCount, stockValue, rentFor, profit, visitorCount, serialize, deserialize, type Game, type UpgradeId } from './game';
import { icon, ShopScene } from './art';
const app=document.querySelector<HTMLDivElement>('#app')!;
let game:Game;let storageOK=true;let saved=false;let raw:string|null=null;
try{raw=localStorage.getItem(SAVE_KEY);}catch{storageOK=false;}
const restored=raw?deserialize(raw):null;game=restored??createGame();
let help=false,resetConfirm=false,emptyConfirm=false,toastTimer=0;
const mobileViewport=window.matchMedia('(max-width: 800px), (max-width: 1100px) and (max-height: 500px)');
type MobileTab='shop'|'goods'|'upgrades';
function save(){try{localStorage.setItem(SAVE_KEY,serialize(game));saved=true;}catch{storageOK=false;}}
function safe(text:string){return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
function gold(n:number){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n);}
function signed(n:number){return `${n>0?'+':''}${gold(n)}`;}
function notice(msg:string){const el=document.querySelector('#toast')!;el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el.classList.remove('show'),3200);}
const chevron='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 5 7 7-7 7"/></svg>';
app.innerHTML=`<header class="topbar"><a class="brand" href="./" aria-label="Лавка приключенца"><span class="brand-mark">⚑</span><span>Лавка приключенца<small>МАЛЕНЬКАЯ ЛАВКА. БОЛЬШОЕ ПРИКЛЮЧЕНИЕ.</small></span></a><nav><span class="save-status" id="save-status"></span><button class="icon-button theme-toggle" id="theme-toggle" data-action="theme" aria-label="Тёмная тема" aria-pressed="false" title="Включить тёмную тему"><svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.2 15.4A8.7 8.7 0 0 1 8.6 3.8a8.7 8.7 0 1 0 11.6 11.6Z"/></svg><svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></svg></button><button class="icon-button" data-action="help" title="Правила игры" aria-label="Правила игры">?</button><button class="quiet-button" data-action="reset"><span class="wide-label">Новая игра</span><span class="narrow-label">Заново</span></button></nav></header>
<main><section class="overview"><div class="overview-intro"><div class="mobile-day"><strong id="mobile-day"></strong><span id="mobile-phase"></span></div><div class="eyebrow">ВАША ТОРГОВАЯ ИСТОРИЯ</div><h1>Семь дней до мечты<span class="title-dot">.</span></h1><p>Пусть каждый искатель приключений найдёт здесь своё.</p></div><div class="wallet"><span class="coin">✦</span><div><small>ЗОЛОТО В КАССЕ</small><strong id="cash"></strong></div><div class="goal"><span>Цель: 1 000 з.</span><div class="goal-track"><i id="goal-fill"></i></div></div></div></section>
<section class="day-bar"><div class="day-label" id="day-label"></div><div class="days" id="days"></div><div class="phase-tag" id="phase-tag"></div></section>
<button class="mobile-event" data-action="tab" data-tab="upgrades" aria-label="Посмотреть событие дня и улучшения"><span id="mobile-event-icon" aria-hidden="true"></span><span><small>СОБЫТИЕ ДНЯ</small><strong id="mobile-event-name"></strong></span>${chevron}</button>
<div class="shop-layout"><section class="shop-card"><div class="card-heading"><div><span class="live-dot" id="live-dot"></span><h2>Ваша лавка</h2><span class="muted">Тихая улочка, город Ветроград</span></div><span class="weather" id="weather"></span></div><div class="scene-wrap"><canvas id="shop-scene" width="900" height="440" role="img" aria-label="Уютная лавка с полками товаров и посетителями"></canvas><span class="scene-label" id="scene-label"></span></div><div class="shop-footer"><span id="shop-hint"></span><div class="sales-clock" id="clock"></div></div></section>
<aside><section class="event-card"><div class="eyebrow">СЛУХИ ГОРОДА · СЕГОДНЯ</div><div class="event-title"><span id="event-icon"></span><h2 id="event-name"></h2></div><p id="event-desc"></p><div class="event-tip" id="event-tip"></div></section><section class="upgrades-card"><div class="card-heading"><h2>Обустроить лавку</h2><span class="muted">На все дни</span></div><div id="upgrades"></div></section></aside></div>
<section class="inventory-card" id="inventory-panel" aria-label="Товары и закупки"><div class="inventory-head"><div><div class="eyebrow">ТОВАРЫ И ЦЕНЫ</div><h2>Хороший товар сам себя не продаст</h2></div><div class="inventory-meta"><span id="inventory-value"></span><span class="stock-badge" id="capacity"></span></div></div><div class="table-scroll"><table><thead><tr><th>Товар</th><th>Спрос <span title="Спрос зависит от события и предпочтений посетителей">ⓘ</span></th><th>Закупка</th><th>Ваша цена</th><th>Маржа / шт.<sup>*</sup></th><th>На полке</th><th>Пополнить</th></tr></thead><tbody id="goods"></tbody></table></div><div class="inventory-note"><span>* Маржа по сегодняшней закупке. Остатки сохраняются; фактическая прибыль учитывает цену каждой партии.</span><button class="text-button" data-action="market">Цены по рынку ↺</button></div></section>
<section class="bottom-layout"><div class="journal-card"><div class="card-heading"><h2>У прилавка</h2><span class="muted" id="visitor-counter"></span></div><div id="journal" class="journal"></div></div><div class="day-control"><div class="eyebrow" id="control-eyebrow"></div><h2 id="control-title"></h2><p id="control-description"></p><div class="today-stats" id="today-stats"></div><div id="desktop-action-slot"><button id="main-action" class="primary-button" data-action="start"></button></div><div class="control-note" id="control-note"></div></div></section>
<footer class="page-footer"><span>Ветроградская торговая гильдия <span class="footer-seal">✧</span> С честной монеты начинается легенда.</span><button class="text-button" data-action="help">Как играть</button></footer></main><div id="mobile-controls" class="mobile-controls"><div id="mobile-turn-info" class="mobile-turn-info"></div><div id="mobile-action-slot"></div><nav class="mobile-nav" aria-label="Разделы лавки"><button data-action="tab" data-tab="shop" aria-pressed="true"><span aria-hidden="true">⌂</span>Лавка</button><button data-action="tab" data-tab="goods" aria-pressed="false"><span aria-hidden="true">▤</span>Товары</button><button data-action="tab" data-tab="upgrades" aria-pressed="false"><span aria-hidden="true">✧</span>Развитие</button></nav></div><div id="toast" class="toast" role="status"></div><div id="modal-root"></div>`;
initTheme();
const scene=new ShopScene(document.querySelector('#shop-scene')!,()=>game);
const $=(id:string)=>document.getElementById(id)!;
function setMobileTab(tab:MobileTab,scroll=true){
 document.body.dataset.mobileTab=tab;
 document.querySelectorAll<HTMLButtonElement>('.mobile-nav button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tab===tab)));
 if(mobileViewport.matches&&scroll)window.scrollTo({top:document.querySelector('main')!.offsetTop,behavior:'instant'});
}
function syncLayout(){
 const slot=$(mobileViewport.matches?'mobile-action-slot':'desktop-action-slot');
 if($('main-action').parentElement!==slot)slot.append($('main-action'));
 render();
}
function marginMarkup(i:number){
 const margin=game.stock[i].price-game.costs[i];
 return `${signed(margin)} <small>з.</small><small class="margin-percent">${Math.round(margin/game.costs[i]*100)}%</small>`;
}
function render(){
 const prep=game.phase==='prep',sales=game.phase==='sales',ended=['won','lost'].includes(game.phase),e=EVENTS[game.event];
 $('cash').innerHTML=`${gold(game.cash)} <em>з.</em>`;$('goal-fill').style.width=`${Math.min(100,Math.max(0,game.cash/GOAL*100))}%`;
 $('save-status').textContent=storageOK?(saved||restored?'✓ Прогресс сохранён':'Сохранение автоматически'):'Сохранение недоступно';
 $('day-label').innerHTML=`<strong>День ${game.day}</strong><span>из 7</span>`;
 $('days').innerHTML=Array.from({length:7},(_,i)=>`<span class="day-step ${i+1===game.day?'current':''} ${i+1<game.day?'complete':''}">${i+1<game.day?'✓':i+1}</span>${i<6?'<i></i>':''}`).join('');
 $('mobile-day').textContent=`День ${game.day} / 7`;
 $('mobile-phase').textContent=prep?'Подготовка':sales?(game.paused?'На паузе':'Идёт торговля'):ended?'Итоги недели':'Итоги дня';
 $('phase-tag').textContent=prep?'☀ Подготовка':sales?(game.paused?'Ⅱ На паузе':'● Идёт торговля'):game.phase==='won'?'✧ Мечта сбылась':game.phase==='lost'?'Сезон завершён':'☾ Итоги дня';
 $('live-dot').classList.toggle('active',sales&&!game.paused);$('weather').textContent=`${e.icon} ${sales?'Лавка открыта':'Ветроград'}`;
 $('scene-label').textContent=prep?'Расставьте товары. Приключения подождут.':sales?'Каждый гость — новая возможность':'До встречи завтра, путешественники';
 $('shop-hint').innerHTML=prep?`<strong>${visitorCount(game)}</strong> ожидаемых гостей · аренда <strong>${rentFor(game.day)} з.</strong>`:`Выручка <strong>${gold(game.stats.revenue)} з.</strong> · продано <strong>${game.stats.visitors-game.stats.lost} шт.</strong>`;
 $('clock').innerHTML=sales?`<button class="text-button" data-action="pause">${game.paused?'▶ Продолжить':'Ⅱ Пауза'}</button><span id="time-left">${Math.ceil(DAY_SECONDS-game.elapsed)} с.</span><div class="time-track"><i id="time-fill" style="width:${game.elapsed/DAY_SECONDS*100}%"></i></div>`:prep?'90 секунд торговли':'';
 $('mobile-event-icon').textContent=e.icon;$('mobile-event-name').textContent=e.name;
 $('event-icon').textContent=e.icon;$('event-name').textContent=e.name;$('event-desc').textContent=e.desc;$('event-tip').textContent=e.tip;
 $('upgrades').innerHTML=UPGRADES.map((u,i)=>`<div class="upgrade"><span class="upgrade-icon">${['▤','⚑','✧'][i]}</span><div><strong>${u.name}</strong><small>${u.desc}${u.id==='shelf'?` · ${game.upgrades.shelf}/2`:''}</small></div><button data-action="upgrade" data-id="${u.id}" ${!prep||game.cash<u.cost||game.upgrades[u.id]>=u.max?'disabled':''} aria-label="Купить улучшение: ${u.name}">${game.upgrades[u.id]>=u.max?'✓':`${u.cost} <span>з.</span>`}</button></div>`).join('');
 $('inventory-value').textContent=`Запасы: ${gold(stockValue(game))} з. по закупке`;$('capacity').textContent=`▤ ${stockCount(game)} / ${capacity(game)} мест`;
 $('goods').innerHTML=GOODS.map((p,i)=>{
 const s=game.stock[i],d=game.demand[i],level=d>1.45?'high':d<.95?'low':'normal',margin=s.price-game.costs[i],available=Math.min(Math.floor(game.cash/game.costs[i]),capacity(game)-stockCount(game));
 return `<tr><td data-label="Товар"><div class="product">${icon(p.id)}<div><strong>${p.name}</strong><small>${p.sub}</small></div></div></td><td data-label="Спрос"><span class="demand ${level}"><i></i><i></i><i></i><i></i></span><span class="demand-text">${d>1.45?'Высокий':d<.95?'Спокойный':'Обычный'}</span></td><td data-label="Закупка"><strong class="number">${game.costs[i]} <small>з.</small></strong><small class="market-price">Рынок: ${game.markets[i]} з.</small></td><td data-label="Цена продажи"><div class="price-editor"><button class="price-step" data-action="price-down" data-item="${i}" aria-label="Снизить цену: ${p.name}" ${!prep||s.price<=1?'disabled':''}>−</button><label class="price-input"><input type="number" min="1" max="9999" step="1" inputmode="numeric" enterkeyhint="done" aria-label="Цена: ${p.name}" data-price="${i}" value="${s.price}" ${!prep?'disabled':''}/><span>з.</span></label><button class="price-step" data-action="price-up" data-item="${i}" aria-label="Повысить цену: ${p.name}" ${!prep||s.price>=9999?'disabled':''}>+</button></div></td><td data-label="Маржа / шт." class="margin ${margin<0?'negative':''}">${marginMarkup(i)}</td><td data-label="На полке"><span class="stock-count ${!s.qty?'empty':''}">${s.qty}</span><small class="stock-label">шт.</small></td><td><div class="buy-controls"><button data-action="buy" data-item="${i}" data-qty="1" ${!prep||available<1?'disabled':''} aria-label="Купить ${p.name}, 1 шт.">+1<span class="buy-total"> · ${game.costs[i]} з.</span></button><button data-action="buy" data-item="${i}" data-qty="5" ${!prep||available<5?'disabled':''} aria-label="Купить ${p.name}, 5 шт.">+5<span class="buy-total"> · ${game.costs[i]*5} з.</span></button></div></td></tr>`;
 }).join('');
 const marketBtn=document.querySelector<HTMLButtonElement>('[data-action="market"]')!;marketBtn.disabled=!prep;
 $('visitor-counter').textContent=`${game.stats.visitors} / ${visitorCount(game)} гостей`;
 $('journal').innerHTML=game.visits.length?game.visits.slice(-5).reverse().map(v=>`<div class="visit"><span class="visitor-avatar type-${v.type}">${CUSTOMERS[v.type].symbol}</span><div><strong>${CUSTOMERS[v.type].name} <span>· ${GOODS[v.item].name}</span></strong><small>${safe(v.reason)}</small></div><span class="visit-result ${v.bought?'success':''}">${v.bought?`+${v.price} з.`:'ушёл'}</span></div>`).join(''):`<div class="journal-empty"><span>♧</span><div>Пока тихо…<small>${prep?'Закупите товары и откройте двери.':'Сегодня здесь ещё никто не был.'}</small></div></div>`;
 $('control-eyebrow').textContent=prep?'ВРЕМЯ ПРИГОТОВЛЕНИЙ':sales?'ЗА ПРИЛАВКОМ':'ТОРГОВЫЙ ДЕНЬ ЗАКОНЧЕН';
 $('control-title').textContent=prep?'Готовы встречать гостей?':sales?(game.paused?'Небольшой перерыв':'Торговля идёт своим чередом'):ended?'Ваша торговая история':'Хорошая работа, лавочник';
 $('control-description').textContent=prep?'Закупите ассортимент, назначьте цены и доверьтесь торговому чутью.':sales?'Следите за решениями гостей: они подскажут, что изменить завтра.':'Посмотрите итоги и спланируйте следующую закупку.';
 $('today-stats').innerHTML=`<div><span>Выручка</span><strong>${gold(game.stats.revenue)} з.</strong></div><div><span>${prep?'Аренда вечером':'Прибыль сегодня'}</span><strong>${prep?rentFor(game.day):signed(profit(game.stats))} з.</strong></div>`;
 const action=$('main-action') as HTMLButtonElement;action.dataset.action=prep?'start':sales?'pause':ended?'results':'next';action.disabled=false;
 action.innerHTML=prep?`Открыть лавку ${chevron}`:sales?`${game.paused?'Продолжить торговлю':mobileViewport.matches?'Пауза':'Приостановить торговлю'} ${game.paused?'▶':'Ⅱ'}`:ended?`Посмотреть итоги ${chevron}`:`К следующему дню ${chevron}`;
 $('control-note').textContent=prep?(stockCount(game)?'Один день · 90 секунд · цены фиксируются до завтра':'Совет: начните с зелий, хлеба и пары мечей.'):sales?'Вкладка в фоне автоматически ставит игру на паузу.':`Касса: ${gold(game.cash)} / 1 000 з. · осталось дней: ${7-game.day}`;
 $('mobile-turn-info').textContent=prep?`${stockCount(game)} / ${capacity(game)} мест · аренда ${rentFor(game.day)} з. · 90 секунд`:sales?`${Math.ceil(DAY_SECONDS-game.elapsed)} с. до закрытия · выручка ${gold(game.stats.revenue)} з.`:`Касса ${gold(game.cash)} / 1 000 з.`;
 renderModal();
 const modalOpen=$('modal-root').children.length>0;
 document.body.classList.toggle('modal-open',modalOpen);
 document.querySelector<HTMLElement>('main')!.inert=modalOpen;
 document.querySelector<HTMLElement>('header')!.inert=modalOpen;
 $('mobile-controls').inert=modalOpen;
}
function renderModal(){
 const root=$('modal-root');
 if(help){root.innerHTML=`<div class="modal-backdrop"><section class="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="eyebrow">ПАМЯТКА ЛАВОЧНИКА</div><h2 id="modal-title">Маленькая лавка, большие планы</h2><p>За <b>7 дней</b> соберите <b>1 000 золотых в кассе</b>. Запасы не считаются золотом. На старте у вас 200 з.</p><ol><li><b>Утром закупайтесь.</b> Слухи меняют спрос и цены. Остатки переходят на завтра, места на полках ограничены.</li><li><b>Назначайте цены.</b> Рынок — ориентир. Наценка повышает прибыль с продажи, но гости чаще уходят. У каждого свой бюджет.</li><li><b>Откройте лавку на 90 секунд.</b> Гости придут сами. Цены и закупки доступны только утром. В паузе время стоит.</li><li><b>Вечером подведите итоги.</b> Аренда — 14–26 з. в день. Отрицательная касса означает банкротство. Прибыль = выручка − себестоимость проданного − аренда − улучшения.</li></ol><p class="tip-box">Начните с нескольких видов товаров и держите резерв на аренду. В последний день продавайте остатки: победу определяет касса после аренды.</p><p class="muted">Сохранение автоматическое в этом браузере. При закрытой или скрытой вкладке торговля не идёт. Улучшения действуют сразу и до конца игры.</p><button class="primary-button" data-action="close-help">Пора за прилавок ${chevron}</button></section></div>`;return;}
 if(resetConfirm){root.innerHTML=`<div class="modal-backdrop"><section class="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="eyebrow">НОВАЯ ИСТОРИЯ</div><h2 id="modal-title">Начать с чистой полки?</h2><p>Текущий прогресс будет заменён новой игрой с 200 золотыми.</p><div class="modal-buttons"><button class="quiet-button" data-action="cancel-reset">Продолжить эту игру</button><button class="primary-button" data-action="confirm-reset">Начать заново</button></div></section></div>`;return;}
 if(emptyConfirm){root.innerHTML=`<div class="modal-backdrop"><section class="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="eyebrow">ПОЛКИ ПУСТЫ</div><h2 id="modal-title">Открыть лавку без товаров?</h2><p>Гости уйдут без покупок. Вечером всё равно придётся заплатить ${rentFor(game.day)} з. аренды.</p><div class="modal-buttons"><button class="quiet-button" data-action="cancel-empty">${mobileViewport.matches?'Выбрать товары':'Вернуться к закупкам'}</button><button class="primary-button" data-action="open-empty">Открыть без товаров</button></div></section></div>`;return;}
 if(['summary','won','lost'].includes(game.phase)){
 const s=game.stats,won=game.phase==='won',lost=game.phase==='lost';
 root.innerHTML=`<div class="modal-backdrop"><section class="modal summary-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="summary-symbol">${won?'✧':lost?'☾':'☼'}</div><div class="eyebrow">${won?'ЛЕГЕНДА ВЕТРОГРАДА':lost?'У КАЖДОЙ ИСТОРИИ ЕСТЬ ПРОДОЛЖЕНИЕ':`ДЕНЬ ${game.day} · ИТОГИ`}</div><h2 id="modal-title">${won?'Лавка процветает!':lost?(game.cash<0?'Касса пуста. Лавка закрыта.':'Мечта оказалась чуть дальше'):'Двери закрыты. Считаем золото.'}</h2><p>${won?'Семь дней, сотни маленьких решений — и ваша первая тысяча.':lost?(game.cash<0?'Золота не хватило на аренду. Попробуйте сохранить резерв.':`В кассе ${gold(game.cash)} з. из 1 000. Другая стратегия может изменить всё.`):EVENTS[game.event].tip}</p><div class="summary-grid"><div><span>Выручка</span><b>${gold(s.revenue)} з.</b></div><div><span>Себестоимость продаж</span><b>−${gold(s.cogs)} з.</b></div><div><span>Аренда и улучшения</span><b>−${s.rent+s.upgrades} з.</b></div><div class="summary-profit"><span>Чистая прибыль</span><b>${signed(profit(s))} з.</b></div><div><span>Посетители / покупки</span><b>${s.visitors} / ${s.visitors-s.lost}</b></div><div><span>Потерянные продажи</span><b>${s.lost}</b></div></div><div class="cash-reconcile"><b>В кассе: ${gold(game.cash)} з.</b><span>${s.startCash} − ${s.procurement} закупки − ${s.upgrades} улучшения + ${s.revenue} продажи − ${s.rent} аренда</span></div><div class="leftovers"><span>На завтра · запасы ${stockValue(game)} з. по закупке</span><div>${GOODS.map((p,i)=>`<span title="${p.name}">${icon(p.id)}<b>${game.stock[i].qty}</b></span>`).join('')}</div></div>${(won||lost)?`<div class="history-chart" aria-label="Касса по дням">${game.history.map(h=>`<div><span style="height:${Math.max(3,Math.min(80,h.endCash/15))}px"></span><small>${h.day}</small><b>${h.endCash}</b></div>`).join('')}</div>`:''}<button class="primary-button" data-action="${won||lost?'confirm-reset':'next'}">${won||lost?'Попробовать другую стратегию':'Подготовиться к следующему дню'} ${chevron}</button></section></div>`;return;
 }
 root.innerHTML='';
}
app.addEventListener('change',e=>{
 const el=e.target as HTMLInputElement;if(el.dataset.price===undefined)return;
 const i=Number(el.dataset.price);
 if(!setPrice(game,i,Number(el.value)))notice('Введите целую цену от 1 до 9 999 золотых.');
 el.value=String(game.stock[i].price);
 const margin=el.closest('tr')!.querySelector<HTMLElement>('.margin')!;
 margin.innerHTML=marginMarkup(i);margin.classList.toggle('negative',game.stock[i].price<game.costs[i]);
 // Preserve the tapped button during input blur: rebuilding the row here swallows the first touch.
 const row=el.closest('tr')!;
 row.querySelector<HTMLButtonElement>('[data-action="price-down"]')!.disabled=game.stock[i].price<=1;
 row.querySelector<HTMLButtonElement>('[data-action="price-up"]')!.disabled=game.stock[i].price>=9999;
 save();
});
app.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target instanceof HTMLInputElement&&e.target.dataset.price!==undefined){e.preventDefault();e.target.blur();}});
app.addEventListener('click',e=>{
 const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');if(!b||b.disabled)return;
 switch(b.dataset.action){
 case 'theme':toggleTheme();return;
 case 'tab':setMobileTab(b.dataset.tab as MobileTab);return;
 case 'price-down':case 'price-up':{const i=Number(b.dataset.item);setPrice(game,i,game.stock[i].price+(b.dataset.action==='price-up'?1:-1));break;}
 case 'buy':if(!buy(game,Number(b.dataset.item),Number(b.dataset.qty)))notice('Не хватает золота или места на полках.');break;
 case 'upgrade':if(upgrade(game,b.dataset.id as UpgradeId))notice('Лавка стала ещё лучше. Улучшение действует уже сегодня.');break;
 case 'market':game.stock.forEach((_,i)=>setPrice(game,i,game.markets[i]));notice('Цены установлены по сегодняшнему рынку.');break;
 case 'start':if(!stockCount(game)){emptyConfirm=true;notice('Полки пусты. Закупите хотя бы один товар.');break;}startDay(game);setMobileTab('shop');break;
 case 'cancel-empty':emptyConfirm=false;if(mobileViewport.matches)setMobileTab('goods');break;
 case 'open-empty':emptyConfirm=false;startDay(game);setMobileTab('shop');break;
 case 'pause':game.paused=!game.paused;break;
 case 'next':nextDay(game);setMobileTab('goods');break;
 case 'help':help=true;if(game.phase==='sales')game.paused=true;break;
 case 'close-help':help=false;break;
 case 'reset':resetConfirm=true;if(game.phase==='sales')game.paused=true;break;
 case 'cancel-reset':resetConfirm=false;break;
 case 'confirm-reset':scene.clear();game=createGame();help=false;resetConfirm=false;emptyConfirm=false;setMobileTab('shop');notice('Новая неделя. Новые возможности.');break;
 case 'results':renderModal();break;
 }
 save();render();
});
let previous=performance.now(),lastSave=0,lastPaint=0;
setInterval(()=>{const now=performance.now(),delta=Math.min((now-previous)/1000,1);previous=now;
 if(game.phase==='sales'&&!game.paused){const phase=game.phase;const visits=tick(game,delta);visits.forEach(v=>scene.add(v));if(visits.length||game.phase!==phase||now-lastPaint>1000){render();lastPaint=now;}if(now-lastSave>2000||game.phase!==phase){save();lastSave=now;}}
},100);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.phase==='sales'){game.paused=true;save();render();}previous=performance.now();});
window.addEventListener('pagehide',save);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(help||resetConfirm||emptyConfirm)){help=false;resetConfirm=false;emptyConfirm=false;render();}if(e.code==='Space'&&game.phase==='sales'&&!help&&!resetConfirm&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();game.paused=!game.paused;save();render();}});
if(restored?.phase==='sales')game.paused=true;
setMobileTab('shop',false);
mobileViewport.addEventListener('change',syncLayout);
save();syncLayout();
if(raw&&!restored)notice('Сохранение повреждено или устарело. Начата новая игра.');
