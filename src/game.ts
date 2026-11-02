export const DAY_SECONDS = 90;
export const GOAL = 1000;
export const GOODS = [
  {id:'bread', name:'Хлеб', sub:'Из городской пекарни', cost:6, market:9, icon:'bread'},
  {id:'potion', name:'Зелье здоровья', sub:'На случай приключений', cost:19, market:28, icon:'potion'},
  {id:'sword', name:'Меч', sub:'Надёжная сталь', cost:46, market:70, icon:'sword'},
  {id:'shield', name:'Щит', sub:'Защита в пути', cost:35, market:52, icon:'shield'},
  {id:'scroll', name:'Магический свиток', sub:'Маленькое чудо', cost:57, market:84, icon:'scroll'},
  {id:'artifact', name:'Редкий артефакт', sub:'Для искушённых магов', cost:107, market:155, icon:'artifact'},
] as const;
export type GoodId = typeof GOODS[number]['id'];
export type Phase = 'prep'|'sales'|'summary'|'won'|'lost';
export type Rng = () => number;
export function demandInfo(value:number):{label:string;level:'low'|'normal'|'high'} {
 if(value<.6)return {label:'Значительно ниже обычного',level:'low'};
 if(value<.9)return {label:'Ниже обычного',level:'low'};
 if(value<=1.1)return {label:'Обычный',level:'normal'};
 if(value<2)return {label:'Выше обычного',level:'high'};
 return {label:'Значительно выше обычного',level:'high'};
}
type Multipliers = Partial<Record<GoodId,number>>;
export const EVENTS: {name:string; icon:string; desc:string; tip:string; demand:Multipliers; market:Multipliers; supply:number; traffic:number}[] = [
 {name:'Турнир у старой крепости',icon:'⚔',desc:'Рыцари съезжаются на турнир. Рыночные цены мечей и щитов выше на 15%.',tip:'Сталь сегодня ценнее хлеба.',demand:{sword:2.2,shield:1.6},market:{sword:1.15,shield:1.15},supply:1,traffic:1.08},
 {name:'Тревожные вести',icon:'✚',desc:'В городе лихорадка. Рыночная цена зелий выше на 25%. Посетителей на 10% меньше.',tip:'Зелья нужны всем, но бюджет не бесконечен.',demand:{potion:2.4},market:{potion:1.25},supply:1,traffic:.9},
 {name:'Совет магов',icon:'✧',desc:'Приехали учёные маги. Рыночные цены свитков и артефактов выше на 20%.',tip:'Дорогой товар может окупить целый день.',demand:{scroll:2,artifact:1.8},market:{scroll:1.2,artifact:1.2},supply:1,traffic:1.1},
 {name:'Караван с юга',icon:'☼',desc:'Торговый караван привёз товары. Все закупочные цены ниже на 22%. Посетителей на 5% больше.',tip:'Хороший день, чтобы пополнить запасы.',demand:{},market:{},supply:.78,traffic:1.05},
 {name:'Праздник урожая',icon:'❋',desc:'На площади ярмарка. Рыночная цена хлеба выше на 35%. Посетителей на 20% больше.',tip:'Небольшая маржа тоже приносит золото.',demand:{bread:2.8},market:{bread:1.35},supply:1,traffic:1.2},
 {name:'Дорога в тумане',icon:'≋',desc:'Обозы задерживаются: закупки дороже на 18%. Путники ищут щиты и зелья.',tip:'Вчерашние запасы сегодня особенно выгодны.',demand:{shield:1.5,potion:1.5},market:{shield:1.1,potion:1.1},supply:1.18,traffic:.95},
 {name:'Открыты древние руины',icon:'◇',desc:'Искатели сокровищ скупают снаряжение. Посетителей на 15% больше.',tip:'Приключение начинается с хорошей закупки.',demand:{sword:1.5,scroll:1.8},market:{scroll:1.12},supply:1,traffic:1.15},
 {name:'Тихий дождливый день',icon:'☂',desc:'Посетителей на 18% меньше. Закупки дешевле на 8%.',tip:'Оставьте немного золота на чёрный день.',demand:{bread:1.4,potion:1.4},market:{},supply:.92,traffic:.82},
 {name:'Возвращение экспедиции',icon:'⚑',desc:'Путники вернулись с наградой. Посетителей на 25% больше. Рыночная цена артефактов выше на 15%.',tip:'У редкостей наконец появятся покупатели.',demand:{artifact:2},market:{artifact:1.15},supply:1,traffic:1.25},
];
export const UPGRADES = [
 {id:'shelf',name:'Дополнительная полка',desc:'+14 мест для товаров',cost:75,max:2},
 {id:'ads',name:'Вывеска на площади',desc:'+25% посетителей каждый день',cost:85,max:1},
 {id:'reputation',name:'Уют и доброе имя',desc:'Покупатели терпимее к цене',cost:95,max:1},
] as const;
export type UpgradeId = typeof UPGRADES[number]['id'];
export const CUSTOMERS = [
 {name:'Крестьянин',symbol:'🌾',budget:[9,32],tolerance:1.2,weights:[.8,.2,0,0,0,0],color:'#b68558'},
 {name:'Воин',symbol:'⚔',budget:[48,145],tolerance:1.38,weights:[.06,.34,.34,.26,0,0],color:'#719792'},
 {name:'Маг',symbol:'✧',budget:[85,245],tolerance:1.46,weights:[0,.12,0,0,.56,.32],color:'#a68bc0'},
];
export interface Stock {qty:number; price:number; lots:{qty:number; cost:number}[]}
export interface DayStats {day:number; revenue:number; cogs:number; visitors:number; lost:number; rent:number; upgrades:number; procurement:number; startCash:number; endCash:number; leftovers:number[]}
export interface Visit {id:number; type:number; item:number; bought:boolean; price:number; budget:number; reason:string}
export interface Game {version:1; seed:number; day:number; phase:Phase; cash:number; stock:Stock[]; costs:number[]; markets:number[]; demand:number[]; event:number; upgrades:Record<UpgradeId,number>; elapsed:number; visits:Visit[]; stats:DayStats; history:DayStats[]; paused:boolean}
const DEMAND_NAMES=['хлеб','зелья здоровья','мечи','щиты','магические свитки','редкие артефакты'];
export function eventDescription(g:Game):string {
 const event=EVENTS[g.event];
 const demand=GOODS.flatMap((good,i)=>event.demand[good.id]===undefined?[]:[`Спрос на ${DEMAND_NAMES[i]} ${demandInfo(g.demand[i]).label.toLowerCase()}.`]);
 return [event.desc,...demand].join(' ');
}
export function random(g:Game):number {g.seed=(g.seed+0x6D2B79F5)|0;let t=g.seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
export function seeded(seed:number):Rng {let n=seed|0;return ()=>{n=(n+0x6D2B79F5)|0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const blankStats=(day:number,cash:number):DayStats=>({day,revenue:0,cogs:0,visitors:0,lost:0,rent:0,upgrades:0,procurement:0,startCash:cash,endCash:cash,leftovers:[]});
export function createGame(seed=Date.now()):Game {
 const g:Game={version:1,seed:seed|0,day:1,phase:'prep',cash:200,stock:GOODS.map(x=>({qty:0,price:x.market,lots:[]})),costs:[],markets:[],demand:[],event:0,upgrades:{shelf:0,ads:0,reputation:0},elapsed:0,visits:[],stats:blankStats(1,200),history:[],paused:false};
 rollDay(g);return g;
}
function rollDay(g:Game) {
 g.event=Math.floor(random(g)*EVENTS.length); const e=EVENTS[g.event];
 g.costs=GOODS.map(x=>Math.max(1,Math.round(x.cost*e.supply*(.92+random(g)*.16))));
 g.markets=GOODS.map(x=>Math.round(x.market*(e.market[x.id]??1)));
 g.demand=GOODS.map(x=>(e.demand[x.id]??1)*(.9+random(g)*.2));
}
export const capacity=(g:Game)=>26+g.upgrades.shelf*14;
export const stockCount=(g:Game)=>g.stock.reduce((n,x)=>n+x.qty,0);
export const stockValue=(g:Game)=>g.stock.reduce((n,x)=>n+x.lots.reduce((a,l)=>a+l.qty*l.cost,0),0);
export const rentFor=(day:number)=>12+day*2;
export const profit=(s:DayStats)=>s.revenue-s.cogs-s.rent-s.upgrades;
export function buy(g:Game,i:number,qty:number):boolean {
 if(g.phase!=='prep'||!g.stock[i]||!Number.isInteger(qty)||qty<=0||qty*g.costs[i]>g.cash||stockCount(g)+qty>capacity(g))return false;
 g.cash-=qty*g.costs[i];g.stats.procurement+=qty*g.costs[i];g.stock[i].qty+=qty;g.stock[i].lots.push({qty,cost:g.costs[i]});return true;
}
export function setPrice(g:Game,i:number,price:number):boolean {
 if((g.phase!=='prep'&&g.phase!=='sales')||!g.stock[i]||!Number.isInteger(price)||price<1||price>9999)return false;
 g.stock[i].price=price;return true;
}
export function upgrade(g:Game,id:UpgradeId):boolean {
 const u=UPGRADES.find(x=>x.id===id);if(!u||g.phase!=='prep'||g.upgrades[id]>=u.max||g.cash<u.cost)return false;
 g.cash-=u.cost;g.stats.upgrades+=u.cost;g.upgrades[id]++;return true;
}
export function visitorCount(g:Game):number {return Math.round((20+g.day*.6)*EVENTS[g.event].traffic*(1+g.upgrades.ads*.25));}
export function purchaseChance(price:number,market:number,tolerance:number,reputation=0):number {return 1/(1+Math.exp((price/market-tolerance-reputation*.13)*6));}
function weighted(weights:number[],rng:Rng):number {let r=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){r-=weights[i];if(r<=0)return i;}return weights.length-1;}
export function serve(g:Game):Visit|null {
 if(g.phase!=='sales'||g.stats.visitors>=visitorCount(g))return null;
 const rng=()=>random(g);const type=weighted([.27,.43,.30],rng),c=CUSTOMERS[type];
 const item=weighted(c.weights.map((w,i)=>w*g.demand[i]),rng);
 const budget=Math.round(c.budget[0]+rng()*(c.budget[1]-c.budget[0]));
 // The visitor takes the posted price on arrival; later edits only affect new visitors.
 const s=g.stock[item], price=s.price;
 let reason='',bought=false;
 if(s.qty===0)reason='Нет на полке — ушёл без покупки';
 else if(price>budget)reason=`Не по карману: есть ${budget} з.`;
 else if(rng()>purchaseChance(price,g.markets[item],c.tolerance,g.upgrades.reputation))reason=`Дорого: рынок ${g.markets[item]} з., у вас ${price} з.`;
 else {
  bought=true;reason=price<=g.markets[item]?'Хорошая цена. Беру!':'Подойдёт для приключений. Беру!';
  s.qty--;g.cash+=price;g.stats.revenue+=price;
  const lot=s.lots[0];g.stats.cogs+=lot.cost;lot.qty--;if(lot.qty===0)s.lots.shift();
 }
 g.stats.visitors++;if(!bought)g.stats.lost++;
 const v={id:g.stats.visitors,type,item,bought,price,budget,reason};g.visits.push(v);return v;
}
export function startDay(g:Game):boolean {if(g.phase!=='prep')return false;g.phase='sales';g.elapsed=0;g.paused=false;return true;}
export function tick(g:Game,seconds:number):Visit[] {
 if(g.phase!=='sales'||g.paused||!Number.isFinite(seconds)||seconds<=0)return [];
 g.elapsed=Math.min(DAY_SECONDS,g.elapsed+seconds);
 const target=Math.min(visitorCount(g),Math.floor(g.elapsed/DAY_SECONDS*visitorCount(g)));
 const visits:Visit[]=[];while(g.stats.visitors<target){const v=serve(g);if(v)visits.push(v);else break;}
 if(g.elapsed>=DAY_SECONDS)finishDay(g);return visits;
}
export function finishDay(g:Game):boolean {
 if(g.phase!=='sales')return false;
 g.stats.rent=rentFor(g.day);g.cash-=g.stats.rent;g.stats.endCash=g.cash;g.stats.leftovers=g.stock.map(s=>s.qty);g.history.push(structuredClone(g.stats));
 g.paused=false;g.phase=g.day===7?(g.cash>=GOAL?'won':'lost'):g.cash<0?'lost':'summary';return true;
}
export function nextDay(g:Game):boolean {
 if(g.phase!=='summary'||g.day>=7)return false;
 g.day++;g.phase='prep';g.elapsed=0;g.visits=[];g.stats=blankStats(g.day,g.cash);rollDay(g);return true;
}
export const SAVE_KEY='adventurers-shop-v1';
export function serialize(g:Game):string{return JSON.stringify(g);}
// Saves are untrusted input. Validate before they can reach game math or rendering.
export function deserialize(raw:string):Game|null {
 try {
  const g=JSON.parse(raw) as Game;
  const integer=(v:unknown,min:number,max=1e9)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
  if(g.version!==1||!integer(g.seed,-2147483648,2147483647)||!integer(g.day,1,7)||!['prep','sales','summary','won','lost'].includes(g.phase)||!integer(g.cash,-1000)||!integer(g.event,0,EVENTS.length-1)||typeof g.elapsed!=='number'||!Number.isFinite(g.elapsed)||g.elapsed<0||g.elapsed>DAY_SECONDS||typeof g.paused!=='boolean')return null;
  if(!g.upgrades||!UPGRADES.every(u=>integer(g.upgrades[u.id],0,u.max)))return null;
  if(!Array.isArray(g.stock)||g.stock.length!==6||!g.stock.every(s=>integer(s.qty,0,100)&&integer(s.price,1,9999)&&Array.isArray(s.lots)&&s.lots.every(l=>integer(l.qty,1,100)&&integer(l.cost,1,1000))&&s.lots.reduce((a,l)=>a+l.qty,0)===s.qty)||stockCount(g)>capacity(g))return null;
  if(![g.costs,g.markets,g.demand].every(a=>Array.isArray(a)&&a.length===6&&a.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=1000)))return null;
  const statsValid=(s:DayStats)=>s&&['day','revenue','cogs','visitors','lost','rent','upgrades','procurement'].every(k=>integer(s[k as keyof DayStats],0))&&integer(s.startCash,-1000)&&integer(s.endCash,-1000)&&s.lost<=s.visitors&&Array.isArray(s.leftovers)&&s.leftovers.every(n=>integer(n,0,100));
  if(!statsValid(g.stats)||!Array.isArray(g.history)||g.history.length>7||!g.history.every(statsValid)||!Array.isArray(g.visits)||g.visits.length>100||!g.visits.every(v=>integer(v.id,1,100)&&integer(v.type,0,2)&&integer(v.item,0,5)&&typeof v.bought==='boolean'&&integer(v.price,1,9999)&&integer(v.budget,0,1000)&&typeof v.reason==='string'&&v.reason.length<200))return null;
  return g;
 }catch{return null;}
}
