import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_SECONDS,demandInfo,eventDescription,createGame,buy,setPrice,upgrade,startDay,serve,tick,finishDay,nextDay,stockValue,stockCount,capacity,purchaseChance,serialize,deserialize,profit,visitorCount,GOODS,EVENTS,rentFor } from '../src/game.ts';
import {simulate,prepare} from '../scripts/balance.ts';
test('new game: 200 cash, empty shelves, six goods, at least eight events',()=>{const g=createGame(1);assert.equal(g.cash,200);assert.equal(stockValue(g),0);assert.equal(g.phase,'prep');assert.equal(GOODS.length,6);assert.ok(EVENTS.length>=8);});
test('procurement transfers cash to inventory, not to expense',()=>{const g=createGame(1);const before=g.cash;assert.ok(buy(g,0,5));assert.equal(g.cash,before-g.costs[0]*5);assert.equal(stockValue(g),g.costs[0]*5);assert.equal(g.stats.cogs,0);assert.equal(profit(g.stats),0);});
test('cannot buy with insufficient cash, negative, fractional, invalid index or NaN quantity',()=>{const g=createGame(1);for(const [i,q] of [[0,100],[0,-1],[0,1.5],[0,NaN],[9,1]])assert.equal(buy(g,i,q),false);assert.equal(g.cash,200);assert.equal(stockCount(g),0);});
test('capacity is enforced and expanded by shelf',()=>{const g=createGame(1);g.cash=1000;assert.ok(buy(g,0,26));assert.equal(buy(g,0,1),false);assert.ok(upgrade(g,'shelf'));assert.equal(capacity(g),40);assert.ok(buy(g,0,14));assert.equal(buy(g,0,1),false);});
test('upgrades consume cash and count as expense; max level enforced',()=>{const g=createGame(1);assert.ok(upgrade(g,'ads'));assert.equal(g.cash,115);assert.equal(profit(g.stats),-85);assert.equal(upgrade(g,'ads'),false);assert.equal(upgrade(g,'reputation'),true);assert.equal(upgrade(g,'shelf'),false);});
test('price bounds and finite integers',()=>{const g=createGame(2);for(const v of [0,-3,NaN,Infinity,1.1,10000])assert.equal(setPrice(g,0,v),false);assert.ok(setPrice(g,0,9999));});
test('purchase probability nonlinear, monotonic and reputation helps',()=>{assert.ok(purchaseChance(100,100,1.3)>purchaseChance(130,100,1.3));assert.ok(purchaseChance(100,100,1.3,1)>purchaseChance(100,100,1.3));const a=purchaseChance(70,100,1.3)-purchaseChance(90,100,1.3);const b=purchaseChance(120,100,1.3)-purchaseChance(140,100,1.3);assert.ok(b>a*2);});
test('urgent procurement and pricing work during sales while upgrades remain locked',()=>{const g=createGame(4);startDay(g);assert.equal(buy(g,0,1),true);assert.equal(setPrice(g,0,5),true);assert.equal(g.stock[0].price,5);assert.equal(upgrade(g,'ads'),false);assert.equal(startDay(g),false);});
test('empty shelves cannot generate sales and record clear refusals',()=>{const g=createGame(3);startDay(g);tick(g,DAY_SECONDS);assert.equal(g.stats.revenue,0);assert.equal(g.stats.lost,visitorCount(g));assert.ok(g.visits.every(v=>v.reason.startsWith('Нет')));assert.ok(g.stock.every(s=>s.qty===0));});
test('buyers cannot exceed their budget',()=>{const g=createGame(18);g.cash=10000;for(let i=0;i<6;i++){buy(g,i,4);setPrice(g,i,9999);}startDay(g);tick(g,DAY_SECONDS);assert.equal(g.stats.revenue,0);assert.ok(g.visits.some(v=>v.reason.startsWith('Не по карману')));});
test('FIFO cogs uses actual lot cost, and sales conserve money',()=>{const g=createGame(55);buy(g,0,1);const firstCost=g.costs[0];g.costs[0]=firstCost+3;buy(g,0,1);setPrice(g,0,1);startDay(g);let sold=0;for(let i=0;i<visitorCount(g)&&sold<2;i++){const v=serve(g);if(v?.bought&&v.item===0){sold++;assert.equal(g.stats.cogs,sold===1?firstCost:firstCost*2+3);}}assert.equal(sold,2);assert.equal(g.stock[0].qty,0);assert.equal(g.stock[0].lots.length,0);assert.equal(g.stats.revenue,2);});
test('sale stock never negative over many runs',()=>{for(let seed=1;seed<=100;seed++){const g=createGame(seed);prepare(g,'balanced');const bought=stockCount(g);const spent=g.stats.procurement;startDay(g);tick(g,DAY_SECONDS);assert.ok(g.stock.every(s=>s.qty>=0));assert.equal(stockCount(g)+g.stats.visitors-g.stats.lost,bought);assert.equal(stockValue(g)+g.stats.cogs,spent);assert.equal(g.cash,200-spent+g.stats.revenue-rentFor(1));}});
test('paused and invalid ticks do not progress',()=>{const g=createGame(1);startDay(g);g.paused=true;tick(g,50);assert.equal(g.elapsed,0);g.paused=false;for(const n of [-1,NaN,Infinity])tick(g,n);assert.equal(g.elapsed,0);});
test('continuous and bulk ticks produce same outcomes; one rent charge only',()=>{const a=createGame(11),b=createGame(11);prepare(a,'balanced');prepare(b,'balanced');startDay(a);startDay(b);for(let i=0;i<DAY_SECONDS*10;i++)tick(a,.1);tick(a,.01);tick(b,DAY_SECONDS);assert.deepEqual(a.visits,b.visits);assert.equal(a.cash,b.cash);const cash=a.cash;assert.equal(finishDay(a),false);tick(a,DAY_SECONDS);assert.equal(a.cash,cash);assert.equal(a.history.length,1);});
test('leftovers and price carry over; daily financials reset',()=>{const g=createGame(1);buy(g,0,5);setPrice(g,0,9999);startDay(g);tick(g,DAY_SECONDS);const value=stockValue(g),cash=g.cash;assert.ok(nextDay(g));assert.equal(g.day,2);assert.equal(g.phase,'prep');assert.equal(g.stock[0].qty,5);assert.equal(g.stock[0].price,9999);assert.equal(stockValue(g),value);assert.equal(g.stats.startCash,cash);assert.equal(g.stats.revenue,0);assert.equal(g.stats.procurement,0);});
test('bankruptcy ends the game after rent, once',()=>{const g=createGame(1);g.cash=0;startDay(g);tick(g,DAY_SECONDS);assert.equal(g.phase,'lost');assert.equal(g.cash,-14);assert.equal(nextDay(g),false);});
test('win is checked only at day 7 and uses cash after rent, not inventory',()=>{for(const [cash,expected] of [[1026,'won'],[1025,'lost']] as const){const g=createGame(1);g.day=7;g.cash=cash;g.stock[0]={qty:1,price:9999,lots:[{qty:1,cost:5}]};startDay(g);tick(g,DAY_SECONDS);assert.equal(g.phase,expected);assert.equal(nextDay(g),false);}const g=createGame(1);g.cash=1200;startDay(g);tick(g,DAY_SECONDS);assert.equal(g.phase,'summary');});
test('save round trips deterministic future and resists malformed saves',()=>{const g=createGame(77);prepare(g,'balanced');startDay(g);tick(g,DAY_SECONDS*.4);const copy=deserialize(serialize(g))!;assert.ok(copy);tick(g,DAY_SECONDS*.6);tick(copy,DAY_SECONDS*.6);assert.deepEqual(g,copy);for(const raw of ['null','{}','broken',JSON.stringify({...g,cash:'x'}),JSON.stringify({...g,stock:[]}),JSON.stringify({...g,upgrades:null})])assert.equal(deserialize(raw),null);});
test('events change real economics and all event types can occur',()=>{const seen=new Map();for(let seed=1;seed<=1000;seed++){const g=createGame(seed);seen.set(g.event,g);}assert.equal(seen.size,EVENTS.length);assert.ok(seen.get(3).costs[2]<GOODS[2].cost);assert.ok(seen.get(0).demand[2]>2);assert.ok(seen.get(2).markets[4]>GOODS[4].market);});
test('cash and inventory reconcile across seven-day campaigns',()=>{for(const livePrices of [false,true])for(let seed=1;seed<=100;seed++){const g=simulate(seed,'adaptive',livePrices);for(const s of g.history){assert.equal(s.endCash,s.startCash-s.procurement-s.upgrades+s.revenue-s.rent);assert.equal(profit(s),s.revenue-s.cogs-s.upgrades-s.rent);}assert.equal(g.history.length,7);assert.ok(deserialize(serialize(g)));}});
test('balance: sensible strategy can win and lose; excessive pricing is worse',()=>{let wins=0,normal=0,high=0;for(let seed=1;seed<=120;seed++){const a=simulate(seed,'adaptive'),p=simulate(seed,'premium');wins+=Number(a.phase==='won');normal+=a.cash;high+=p.cash;}assert.ok(wins>5,`only ${wins} wins`);assert.ok(wins<119,`${wins} wins, too easy`);assert.ok(normal>high*1.5);});

test('price edits affect only future visitors and never reprice settled sales or refusals',()=>{
 const g=createGame(17);g.cash=10000;
 for(let i=0;i<GOODS.length;i++){buy(g,i,4);setPrice(g,i,1);}
 startDay(g);const first=serve(g)!;assert.equal(first.bought,true);assert.equal(first.price,1);
 const firstCopy=structuredClone(first),seed=g.seed,cash=g.cash,cogs=g.stats.cogs,qty=stockCount(g);
 for(let i=0;i<GOODS.length;i++)assert.ok(setPrice(g,i,9999));
 assert.equal(g.seed,seed);assert.equal(g.elapsed,0);assert.equal(g.cash,cash);assert.equal(g.stats.cogs,cogs);assert.equal(stockCount(g),qty);
 assert.deepEqual(g.visits[0],firstCopy);assert.equal(g.stats.revenue,1);
 const refused=serve(g)!;assert.equal(refused.price,9999);assert.equal(refused.bought,false);
 const refusedCopy=structuredClone(refused);
 for(let i=0;i<GOODS.length;i++)setPrice(g,i,1);
 assert.deepEqual(g.visits[1],refusedCopy);assert.equal(g.stats.lost,1);
 const next=serve(g)!;assert.equal(next.price,1);
 assert.deepEqual(g.visits[0],firstCopy);assert.deepEqual(g.visits[1],refusedCopy);
});

test('sale prices keep integer bounds and cannot be changed after closing',()=>{
 const g=createGame(3);startDay(g);
 for(const price of [0,-1,1.5,NaN,Infinity,10000])assert.equal(setPrice(g,0,price),false);
 assert.ok(setPrice(g,0,12));g.paused=true;assert.ok(setPrice(g,0,13));assert.equal(g.elapsed,0);
 for(const phase of ['summary','won','lost'] as const){g.phase=phase;assert.equal(setPrice(g,0,14),false);assert.equal(g.stock[0].price,13);}
});

test('saved live prices and the previous visitor quotes survive reload together',()=>{
 const g=createGame(40);buy(g,0,4);startDay(g);serve(g);const visits=structuredClone(g.visits);
 setPrice(g,0,12);setPrice(g,1,24);g.paused=true;
 const loaded=deserialize(serialize(g))!;assert.ok(loaded);assert.equal(loaded.stock[0].price,12);assert.equal(loaded.stock[1].price,24);
 assert.deepEqual(loaded.visits,visits);assert.equal(loaded.paused,true);
 assert.ok(setPrice(loaded,0,13));tick(loaded,DAY_SECONDS);assert.equal(loaded.elapsed,0);assert.deepEqual(loaded.visits,visits);
});

test('demand terms have shared, explicit boundaries',()=>{
 const samples:[number,string][]=[[.59,'Значительно ниже обычного'],[.6,'Ниже обычного'],[.89,'Ниже обычного'],[.9,'Обычный'],[1.1,'Обычный'],[1.1001,'Выше обычного'],[1.99,'Выше обычного'],[2,'Значительно выше обычного']];
 for(const [value,label] of samples)assert.equal(demandInfo(value).label,label);
});
test('event descriptions use the same demand terms as product cards and keep price percentages',()=>{
 const g=createGame(17);
 EVENTS.forEach((event,i)=>{
  g.event=i;g.demand=GOODS.map(good=>event.demand[good.id]??1);
  const description=eventDescription(g);assert.doesNotMatch(description,/×\s*\d|спрос[^.]*\d/i);
  GOODS.forEach((good,j)=>{if(event.demand[good.id]!==undefined)assert.ok(description.includes(demandInfo(g.demand[j]).label.toLowerCase()));});
 });
 g.event=0;assert.ok(eventDescription(g).includes('15%'));
});
