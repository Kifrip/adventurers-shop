import { type Game, type Visit, CUSTOMERS, GOODS } from './game';
const drawings:Record<string,string>={
 bread:'<path d="M7 31C1 24 7 12 18 10c7-7 19-5 24 2 12 1 15 12 9 20-8 8-35 7-44-1Z" fill="#dda45b" stroke="#8b542e" stroke-width="3"/><path d="m18 14-4 10m15-13-4 12m15-9-4 11" stroke="#f9d89b" stroke-width="4" stroke-linecap="round"/>',
 potion:'<path d="M23 7h14v13c0 5 13 10 12 20-1 13-37 13-38 0-1-10 12-15 12-20Z" fill="#b6d4be" stroke="#416a59" stroke-width="3"/><path d="M17 33h26c9 20-35 20-26 0" fill="#bf6158"/><path d="M22 7h16v7H22z" fill="#a47b48"/><path d="M25 29v11m-5-5h10" stroke="#ffe9b1" stroke-width="3"/>',
 sword:'<path d="m42 4 7 2-2 8-23 25-7-7Z" fill="#c1d0c8" stroke="#4c6964" stroke-width="2"/><path d="m42 9-22 25" stroke="#eef2d5" stroke-width="3"/><path d="m12 27 18 17-5 5L7 32z" fill="#cba35a"/><path d="m17 39 5 5-11 12-6-6z" fill="#785540"/>',
 shield:'<path d="m30 5 22 8-3 23c-2 8-11 14-19 19-8-5-17-11-19-19L8 13Z" fill="#af864e" stroke="#e2c17c" stroke-width="4"/><path d="m30 11 15 6-2 18c-1 5-7 10-13 14-6-4-12-9-13-14l-2-18Z" fill="#537d6c"/><path d="M30 16v25m-9-15h18" stroke="#e2c17c" stroke-width="4"/>',
 scroll:'<path d="M15 8h32c-8 6-7 12-5 21l3 16H14c-7-9 3-18 1-37Z" fill="#ead39b" stroke="#9f754a" stroke-width="2"/><path d="M15 8C4 8 8 20 17 17M14 45c-8 0-7 10 0 10h32c7 0 7-10-1-10" fill="#d2ae73" stroke="#9f754a" stroke-width="2"/><path d="m28 18 3 6 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z" fill="#8f72a0"/>',
 artifact:'<path d="m30 4 17 15-5 19-12 12-12-12-5-19Z" fill="#91a4c2" stroke="#516a87" stroke-width="2"/><path d="m30 4 2 21 15-6-17 31-17-31 15 6Z" fill="#b1cdd2"/><path d="m17 42 13 8 13-8v10H17Z" fill="#c49c59"/><path d="m30 4 2 21 15-6M13 19l15 6 2 25" fill="none" stroke="#d8e5d5" stroke-width="2"/>'
};
export function icon(id:string,cls=''):string {return `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" class="item-icon ${cls}" viewBox="0 0 60 60" aria-hidden="true">${drawings[id]??drawings.artifact}</svg>`;}
const imgs=GOODS.map(g=>{const i=new Image();i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(icon(g.icon));return i;});
interface Sprite {visit:Visit; born:number}
const NIGHT_COLORS:Record<string,string>={
 '#bfa37e':'#393c2f','#d7bf96':'#5e503b','#c6aa83':'#534832','#695041':'#302e25',
 '#9c7856':'#574632','#785c47':'#423a2c','#795a40':'#443b2d','#97b0a1':'#29414c',
 '#708d70':'#365044','#bec7a1':'#d1d8b8','#f9dda51c':'#f9dda50a',
 '#79583e':'#453b2b','#5f4b37':'#292e24','#a47b50':'#785d3b','#c69d65':'#a68b56',
 '#ead7ac':'#c7b287','#5d4b35':'#3c3e2c','#72543e':'#44382a','#88684b':'#5f4b32',
 '#baa77d':'#9a895e','#476552':'#294332','#c1a372':'#9a8154','#876c49':'#675433',
 '#68503d':'#493d2b','#695440':'#413b2d','#385d50':'#2a4538','#304e43':'#21372d',
 '#9a9a68':'#7c8552','#745138':'#403725','#946a45':'#675031','#765337':'#463b27',
 '#bb9060':'#997645','#d1ab74':'#c0a065','#314d3d':'#1d3425',
 '#f6edcc':'#30432d','#f0dfd1':'#40382c','#4c5140':'#e8e8d2','#f8e4b645':'#ffe0a833',
};
export class ShopScene {
 private ctx:CanvasRenderingContext2D; private sprites:Sprite[]=[];private frame=0;private running=true;private start=performance.now();
 private visible=true;private observer:IntersectionObserver;private dark=false;
 private color(value:string){return this.dark?(NIGHT_COLORS[value]??value):value;}
 constructor(private canvas:HTMLCanvasElement,private getGame:()=>Game){this.ctx=canvas.getContext('2d')!;this.draw=this.draw.bind(this);this.observer=new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting;});this.observer.observe(canvas);this.frame=requestAnimationFrame(this.draw);}
 add(v:Visit){this.sprites.push({visit:v,born:this.getGame().elapsed});}
 clear(){this.sprites=[];}
 destroy(){this.running=false;this.observer.disconnect();cancelAnimationFrame(this.frame);}
 private draw(time:number){if(!this.running)return;if(!this.visible||document.hidden){this.frame=requestAnimationFrame(this.draw);return;}this.dark=document.documentElement.dataset.theme==='dark';const c=this.ctx,g=this.getGame(),w=900,h=440,t=g.phase==='prep'?(time-this.start)/1000:g.elapsed;
 c.clearRect(0,0,w,h);c.fillStyle=this.color('#bfa37e');c.fillRect(0,0,w,h);
 // Plaster, roof beams, and warm light.
 c.fillStyle=this.color('#d7bf96');c.fillRect(0,0,w,285);c.fillStyle=this.color('#c6aa83');for(let x=0;x<w;x+=90){c.fillRect(x,0,2,285);}
 c.fillStyle=this.color('#695041');c.fillRect(0,0,w,23);c.fillRect(0,0,22,300);c.fillRect(878,0,22,300);c.fillRect(450,0,16,290);
 c.fillStyle=this.color('#9c7856');c.fillRect(0,282,w,158);for(let y=295;y<440;y+=28){c.fillStyle=this.color('#785c47');c.fillRect(0,y,w,2);for(let x=(y%56?0:70);x<w;x+=145)c.fillRect(x,y,2,28);}
 // Window and light beam.
 c.fillStyle=this.color('#795a40');c.fillRect(53,44,139,161);c.fillStyle=this.color('#97b0a1');c.fillRect(62,53,121,142);
 c.fillStyle=this.color('#708d70');c.beginPath();c.moveTo(62,128);c.lineTo(105,78);c.lineTo(140,110);c.lineTo(183,87);c.lineTo(183,195);c.lineTo(62,195);c.fill();
 c.fillStyle=this.color('#bec7a1');c.beginPath();c.arc(151,80,15,0,7);c.fill();if(this.dark){c.fillStyle=this.color('#97b0a1');c.beginPath();c.arc(158,75,14,0,7);c.fill();c.fillStyle='#d1d8b8';for(const [sx,sy] of [[80,70],[102,95],[174,108]])c.fillRect(sx,sy,2,2);}c.fillStyle=this.color('#795a40');c.fillRect(118,53,7,142);c.fillRect(62,119,121,7);c.fillRect(47,197,153,9);
 c.fillStyle=this.color('#f9dda51c');c.beginPath();c.moveTo(63,125);c.lineTo(183,125);c.lineTo(430,380);c.lineTo(190,380);c.fill();
 // Hanging shop board.
 c.strokeStyle=this.color('#795a40');c.lineWidth=3;c.beginPath();c.moveTo(285,20);c.lineTo(285,53);c.moveTo(395,20);c.lineTo(395,53);c.stroke();
 c.fillStyle=this.color('#3c5947');c.fillRect(244,49,190,70);c.strokeStyle=this.color('#bdab79');c.strokeRect(250,55,178,58);c.fillStyle=this.color('#e9d7b0');c.textAlign='center';c.font='19px Georgia';c.fillText('ЛАВКА',339,79);c.font='12px Georgia';c.fillText('для добрых приключений',339,100);
 // Shelves with actual stock.
 for(let row=0;row<2;row++){const sy=112+row*104;c.fillStyle=this.color('#79583e');c.fillRect(495,sy-51,337,75);c.fillStyle=this.color('#5f4b37');c.fillRect(502,sy-44,323,62);c.fillStyle=this.color('#a47b50');c.fillRect(486,sy+21,356,13);c.fillStyle=this.color('#c69d65');c.fillRect(486,sy+21,356,4);
 for(let k=0;k<3;k++){const i=row*3+k,x=512+k*108;if(g.stock[i].qty&&imgs[i].complete&&imgs[i].naturalWidth>0){c.drawImage(imgs[i],x,sy-36,53,53);if(g.stock[i].qty>4){c.globalAlpha=.55;c.drawImage(imgs[i],x+34,sy-29,42,42);c.globalAlpha=1;}}else{c.fillStyle=this.color('#a28b6870');c.fillRect(x+13,sy+10,43,2);}
 c.fillStyle=this.color('#ead7ac');c.fillRect(x+7,sy+35,58,19);c.fillStyle=this.color('#5d4b35');c.font='11px monospace';c.fillText(`${g.stock[i].qty} шт.`,x+36,sy+48);}}
 // Door.
 c.fillStyle=this.color('#72543e');c.fillRect(254,140,162,160);c.fillStyle=this.color('#88684b');c.fillRect(263,148,144,152);c.fillStyle=this.color('#baa77d');c.fillRect(280,157,109,75);c.fillStyle=this.color('#476552');c.fillRect(286,163,97,63);c.fillStyle=this.color('#e2ca93');c.font='14px Georgia';c.fillText(g.phase==='sales'?'ОТКРЫТО':'СКОРО ОТКРОЕМ',335,199);c.fillStyle=this.color('#c8a25a');c.beginPath();c.arc(391,254,5,0,7);c.fill();
 // Plant, sacks, lantern.
 c.fillStyle=this.color('#996244');c.beginPath();c.moveTo(57,253);c.lineTo(102,253);c.lineTo(96,291);c.lineTo(64,291);c.fill();
 for(let i=0;i<7;i++){c.fillStyle=i%2?'#53714a':'#70844d';c.beginPath();c.ellipse(80+Math.sin(i*2)*22,240-i*7,8,21,Math.sin(i)*.7,0,7);c.fill();}
 c.fillStyle=this.color('#c1a372');c.beginPath();c.ellipse(200,284,26,28,0,0,7);c.fill();c.strokeStyle=this.color('#876c49');c.beginPath();c.moveTo(181,264);c.lineTo(215,264);c.stroke();
 c.strokeStyle=this.color('#68503d');c.beginPath();c.moveTo(853,20);c.lineTo(853,65);c.stroke();const glow=c.createRadialGradient(853,90,2,853,90,this.dark?95:55);glow.addColorStop(0,this.dark?'#ffe0a8c0':'#ffe0a890');glow.addColorStop(1,'#ffe0a800');c.fillStyle=glow;c.fillRect(758,-5,142,190);c.fillStyle=this.color('#695440');c.fillRect(839,67,28,38);c.fillStyle=this.color('#f4d389');c.fillRect(844,73,18,25);
 // Customers enter, decide, then leave. Their outcome matches the economy.
 this.sprites=this.sprites.filter(s=>g.elapsed>=s.born&&g.elapsed-s.born<6.6);
 for(const s of this.sprites){const age=g.elapsed-s.born,enter=Math.min(1,age/1.2),leave=Math.max(0,(age-4.1)/2.5),x=330+enter*210+leave*450,y=325+Math.sin(age*7)*2;this.person(c,x,y,s.visit.type,age);
 if(age>1&&age<4.7){const v=s.visit;const msg=v.bought?`Беру! −${v.price} з.`:v.reason.startsWith('Нет')?'Здесь пусто…':v.reason.startsWith('Не')?'Не по карману…':'Дороговато…';c.font='13px sans-serif';const tw=c.measureText(msg).width;c.fillStyle=this.color(v.bought?'#f6edcc':'#f0dfd1');c.beginPath();c.roundRect(x-tw/2-12,y-105,tw+24,31,8);c.fill();c.fillStyle=this.color('#4c5140');c.textAlign='center';c.fillText(msg,x,y-85);if(v.bought){c.fillStyle=this.color('#f4cf73');c.font='bold 20px Georgia';c.fillText(`+${v.price}`,x+45,y-105-age*8);}}
 }
 if(g.phase==='prep'){this.person(c,720,330,2,t);c.fillStyle=this.color('#f0dfb8');c.font='12px sans-serif';c.fillText('Всё начинается с хорошей закупки',710,362);}
 // Foreground counter, rug and sign.
 c.fillStyle=this.color('#385d50');c.fillRect(355,370,380,70);c.fillStyle=this.color('#304e43');c.fillRect(365,379,360,54);c.strokeStyle=this.color('#9a9a68');c.lineWidth=2;c.strokeRect(371,385,348,44);
 c.fillStyle=this.color('#745138');c.fillRect(25,351,265,89);c.fillStyle=this.color('#946a45');c.fillRect(37,366,241,74);for(let x=49;x<270;x+=56){c.strokeStyle=this.color('#765337');c.strokeRect(x,375,43,65);}c.fillStyle=this.color('#bb9060');c.fillRect(14,339,289,17);c.fillStyle=this.color('#d1ab74');c.fillRect(14,337,289,5);
 c.fillStyle=this.color('#314d3d');c.fillRect(53,305,72,33);c.fillStyle=this.color('#dbca97');c.font='12px Georgia';c.fillText('КАССА',89,327);c.fillStyle=this.color('#d2b566');for(let i=0;i<4;i++)c.fillRect(155+i*14,330-i%2*4,12,5);
 // Dust motes.
 for(let i=0;i<14;i++){c.fillStyle=this.color('#f8e4b645');c.fillRect((i*117+t*5)%900,40+(i*53+Math.sin(t+i)*9)%240,2,2);}
 this.frame=requestAnimationFrame(this.draw);
 }
 private person(c:CanvasRenderingContext2D,x:number,y:number,type:number,t:number){const color=CUSTOMERS[type].color;c.fillStyle=this.color('#443e34');c.fillRect(x-13,y-8,9,22+Math.sin(t*7)*2);c.fillRect(x+4,y-8,9,22-Math.sin(t*7)*2);c.fillStyle=color;c.beginPath();c.moveTo(x-20,y-49);c.lineTo(x+17,y-49);c.lineTo(x+23,y-5);c.lineTo(x-22,y-5);c.fill();c.fillStyle=this.color('#d6ad7e');c.fillRect(x-11,y-68,23,23);c.fillStyle=type===2?'#716283':'#66513f';c.fillRect(x-14,y-74,28,12);if(type===2){c.beginPath();c.moveTo(x-22,y-65);c.lineTo(x+1,y-103);c.lineTo(x+19,y-65);c.fill();}if(type===1){c.fillStyle=this.color('#a0b3ac');c.fillRect(x-14,y-76,28,14);c.fillRect(x-16,y-68,8,20);}c.fillStyle=this.color('#45453b');c.fillRect(x+4,y-59,3,3);c.fillStyle=this.color('#d0b47b');c.fillRect(x-17,y-21,34,5);}
}
