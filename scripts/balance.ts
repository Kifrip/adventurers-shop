import {createGame,GOODS,buy,setPrice,upgrade,startDay,tick,nextDay,capacity,stockCount,rentFor,profit,visitorCount,type Game} from '../src/game.ts';
export type Strategy='balanced'|'bargain'|'premium'|'speculator'|'adaptive'|'margin';
export function prepare(g:Game,strategy:Strategy){
 if(strategy==='adaptive'&&g.day===3&&g.cash>260)upgrade(g,'ads');
 if(strategy==='adaptive'&&g.day===4&&g.cash>320)upgrade(g,'reputation');
 g.stock.forEach((_,i)=>setPrice(g,i,Math.round(g.markets[i]*(strategy==='bargain'?.8:strategy==='premium'?1.65:strategy==='margin'?1.18:strategy==='adaptive'?(g.day===7?.90:1.10):1))));
 const totalVisitors=visitorCount(g);
 const preference=[.24,.24,.15,.12,.16,.09];
 const weights=preference.map((w,i)=>w*g.demand[i]);const sum=weights.reduce((a,b)=>a+b,0);
 const target=weights.map(w=>Math.ceil(w/sum*totalVisitors*.86));
 if(strategy==='speculator'){
  const i=g.demand.indexOf(Math.max(...g.demand));
  while(g.cash>=g.costs[i]+rentFor(g.day)&&stockCount(g)<capacity(g))buy(g,i,1);return;
 }
 // Affordable assortment, allocating each next coin to the most understocked product.
 for(let n=0;n<150;n++){
  const options=GOODS.map((_,i)=>i).filter(i=>g.cash>=g.costs[i]+rentFor(g.day)&&g.stock[i].qty<target[i]&&stockCount(g)<capacity(g));
  options.sort((a,b)=>(g.stock[a].qty/target[a])-(g.stock[b].qty/target[b])||(g.markets[b]-g.costs[b])/g.costs[b]-(g.markets[a]-g.costs[a])/g.costs[a]);
  if(!options.length)break;buy(g,options[0],1);
 }
}
export function simulate(seed:number,strategy:Strategy){const g=createGame(seed);while(g.phase==='prep'){prepare(g,strategy);startDay(g);tick(g,90);if(g.phase==='summary')nextDay(g);}return g;}
if(process.argv[1]?.endsWith('balance.ts')){
 const strategies:Strategy[]=['balanced','margin','bargain','premium','speculator','adaptive'];
 for(const strategy of strategies){const games=Array.from({length:400},(_,i)=>simulate(i+1,strategy));const cash=games.map(g=>g.cash).sort((a,b)=>a-b);console.log(JSON.stringify({strategy,runs:games.length,winRate:games.filter(g=>g.phase==='won').length/games.length,median:cash[200],p10:cash[40],p90:cash[360],avgProfit:Math.round(games.reduce((a,g)=>a+g.history.reduce((n,s)=>n+profit(s),0),0)/games.length)}));}
}
