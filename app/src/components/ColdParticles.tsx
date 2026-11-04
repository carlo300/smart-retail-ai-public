import {useEffect, useRef} from 'react';

/**
 * Low-motion, diffuse refrigerated smoke.
 * Air falls from the upper vent, is deflected by the chamber walls, and spreads
 * along the floor. All clouds use a reusable organic smoke sprite, not circles.
 * Decorative canvas is mounted only when the fridge is open.
 */
type Vapor = {
  x:number; y:number; rx:number; ry:number; opacity:number;
  vx:number; vy:number; wave:number; phase:number;
  stage:'fall'|'pool'; age:number; poolAge:number; maxAge:number;
  twist:number;
};
type Droplet = {
  x:number; y:number; radius:number; opacity:number;
  dx:number; dy:number; phase:number;
};
const rand=(lo:number,hi:number)=>lo+Math.random()*(hi-lo);
const bounds=(w:number,h:number)=>({
  left:Math.max(22,w*.058),
  right:w-Math.max(22,w*.058),
  top:Math.max(38,h*.115),
  floor:h-Math.max(45,h*.115),
});

function newVapor(w:number,h:number,preseed=false):Vapor {
  const b=bounds(w,h);
  const stream=Math.random();
  const vx=stream<.36?rand(-.42,-.19):stream>.64?rand(.19,.42):rand(-.11,.11);
  return {
    x:w*rand(.41,.59),
    y:b.top+(preseed?rand(0,(b.floor-b.top)*.86):rand(-14,5)),
    rx:rand(53,98), ry:rand(25,43),
    opacity:rand(.44,.64),
    vx,vy:rand(.17,.36),wave:rand(.03,.1),
    phase:rand(0,Math.PI*2),twist:rand(-.15,.15),
    stage:'fall',age:preseed?rand(50,180):0,
    poolAge:0,maxAge:rand(240,330),
  };
}
function newDroplet(w:number,h:number,preseed=false):Droplet{
  const b=bounds(w,h);
  return {
    x:w*rand(.36,.64),
    y:b.top+(preseed?rand(0,(b.floor-b.top)*.92):rand(-8,0)),
    radius:rand(.7,1.55),
    opacity:rand(.12,.23),
    dx:rand(-.2,.2),
    dy:rand(.13,.32),
    phase:rand(0,Math.PI*2),
  };
}

/** One pre-rendered, multi-lobed smoke texture for all drifting sprites. */
function createSmokeSprite(){
  const sprite=document.createElement('canvas');
  sprite.width=256;
  sprite.height=176;
  const c=sprite.getContext('2d');
  if(!c)return sprite;
  const lobes=[
    [111,95,90,46,.43],
    [151,81,75,44,.33],
    [82,79,60,40,.35],
    [128,66,75,38,.26],
    [168,101,58,36,.28],
    [68,105,57,32,.25],
    [116,114,88,33,.27],
    [195,84,38,26,.20],
    [49,86,33,27,.17],
  ];
  for(const [x,y,rx,ry,alpha] of lobes){
    c.save();
    c.translate(x,y);
    c.scale(rx,ry);
    const gradient=c.createRadialGradient(0,0,0,0,0,1);
    gradient.addColorStop(0,'rgba(229,247,255,'+alpha+')');
    gradient.addColorStop(.34,'rgba(206,237,252,'+(alpha*.84)+')');
    gradient.addColorStop(.66,'rgba(191,230,249,'+(alpha*.35)+')');
    gradient.addColorStop(1,'rgba(186,226,252,0)');
    c.fillStyle=gradient;
    c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fill();
    c.restore();
  }
  return sprite;
}

export function ColdParticles(){
  const ref=useRef<HTMLCanvasElement|null>(null);
  useEffect(()=>{
    const canvas=ref.current;
    const host=canvas?.parentElement;
    if(!canvas||!host)return;
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return;
    const sprite=createSmokeSprite();
    let w=1,h=1,frame=0,previous=0,alive=true;
    let vapors:Vapor[]=[],droplets:Droplet[]=[];
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize(){
      if(!canvas||!host||!ctx)return;
      const rect=host.getBoundingClientRect();
      w=Math.max(1,rect.width);
      h=Math.max(1,rect.height);
      const dpr=Math.min(2,window.devicePixelRatio||1);
      canvas.width=Math.max(1,Math.round(w*dpr));
      canvas.height=Math.max(1,Math.round(h*dpr));
      ctx.setTransform(dpr,0,0,dpr,0,0);
      // Larger billows but ~20% fewer than the previous simulation.
      const cloudCount=Math.min(43,Math.max(27,Math.round(w/14)));
      const dropletCount=Math.min(22,Math.max(12,Math.round(w/28)));
      vapors=Array.from({length:cloudCount},()=>newVapor(w,h,true));
      droplets=Array.from({length:dropletCount},()=>newDroplet(w,h,true));
      paint();
    }

    function paint(){
      if(!ctx)return;
      const b=bounds(w,h);
      ctx.clearRect(0,0,w,h);
      ctx.save();
      ctx.globalCompositeOperation='screen';

      // Gentle diffuser visible at the ceiling grille.
      const head=ctx.createRadialGradient(w*.5,b.top,0,w*.5,b.top,w*.2);
      head.addColorStop(0,'rgba(221,244,255,.17)');
      head.addColorStop(.48,'rgba(196,233,255,.055)');
      head.addColorStop(1,'rgba(190,231,252,0)');
      ctx.fillStyle=head;
      ctx.fillRect(w*.25,b.top-16,w*.5,110);

      // The same soft-edged organic smoke sprite rotates, stretches, and
      // overlaps in layers; no repetitive round glowy circles.
      for(const v of vapors){
        const floor=v.stage==='pool';
        const fadeIn=Math.min(1,Math.max(.14,(v.age+10)/65));
        const fadeOut=floor?Math.max(.07,1-v.poolAge/v.maxAge):1;
        ctx.save();
        ctx.translate(v.x,v.y);
        ctx.rotate(Math.sin(v.phase)*v.twist);
        ctx.globalAlpha=v.opacity*fadeIn*fadeOut;
        const rx=v.rx*(floor?1.20:1);
        const ry=v.ry*(floor?.80:1);
        ctx.drawImage(sprite,-rx*1.4,-ry*1.45,rx*2.8,ry*2.9);
        ctx.restore();
      }

      // A handful of near-invisible condensation specks for depth.
      for(const d of droplets){
        const radius=d.radius*4;
        const grad=ctx.createRadialGradient(d.x,d.y,0,d.x,d.y,radius);
        grad.addColorStop(0,'rgba(234,249,255,'+d.opacity.toFixed(3)+')');
        grad.addColorStop(.36,'rgba(203,236,255,'+(d.opacity*.21).toFixed(3)+')');
        grad.addColorStop(1,'rgba(178,224,249,0)');
        ctx.fillStyle=grad;
        ctx.beginPath();ctx.arc(d.x,d.y,radius,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }

    function tick(step:number){
      const b=bounds(w,h);
      for(let i=0;i<vapors.length;i++){
        const v=vapors[i];
        v.phase+=.0055*step;
        v.age+=step;
        if(v.stage==='fall'){
          v.x+=(v.vx+Math.sin(v.phase)*v.wave)*step;
          v.y+=v.vy*step;
          v.rx+=.01*step;
          const wallMargin=Math.min(43,v.rx*.32);
          if(v.x-wallMargin<=b.left){
            v.x=b.left+wallMargin;
            v.vx=Math.abs(v.vx)*.45+.07;
            v.vy=Math.max(.11,v.vy*.88);
            v.phase+=.35;
          }else if(v.x+wallMargin>=b.right){
            v.x=b.right-wallMargin;
            v.vx=-Math.abs(v.vx)*.45-.07;
            v.vy=Math.max(.11,v.vy*.88);
            v.phase+=.35;
          }
          if(v.y+v.ry*.24>=b.floor){
            v.y=b.floor-v.ry*.24;
            v.stage='pool';
            v.poolAge=0;
            v.vx=(v.x<w*.5?-1:1)*rand(.08,.20);
            v.vy=0;
          }
        }else{
          v.poolAge+=step;
          v.x+=(v.vx+Math.sin(v.phase)*.055)*step;
          v.y=b.floor-v.ry*.27+Math.sin(v.phase)*.8;
          v.rx+=.02*step;
          if(v.x-v.rx*.33<=b.left){
            v.x=b.left+v.rx*.33;
            v.vx=Math.abs(v.vx)*.5;
          }else if(v.x+v.rx*.33>=b.right){
            v.x=b.right-v.rx*.33;
            v.vx=-Math.abs(v.vx)*.5;
          }
          if(v.poolAge>=v.maxAge)vapors[i]=newVapor(w,h);
        }
      }
      for(let i=0;i<droplets.length;i++){
        const d=droplets[i];
        d.phase+=.007*step;
        d.x+=(d.dx+Math.sin(d.phase)*.03)*step;
        d.y+=d.dy*step;
        if(d.x-d.radius<=b.left){
          d.x=b.left+d.radius;
          d.dx=Math.abs(d.dx)*.6;
        }else if(d.x+d.radius>=b.right){
          d.x=b.right-d.radius;
          d.dx=-Math.abs(d.dx)*.6;
        }
        if(d.y>=b.floor)droplets[i]=newDroplet(w,h);
      }
    }

    function animate(now:number){
      if(!alive)return;
      // Smoke is intentionally slow; render at about 26fps for efficiency.
      if(!reduced&&!document.hidden&&now-previous>=37){
        const step=Math.min(2.2,Math.max(.2,(now-(previous||now-38))/16.67));
        previous=now;
        tick(step);
        paint();
      }
      if(!reduced)frame=requestAnimationFrame(animate);
    }
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
    observer?.observe(host);
    window.addEventListener('resize',resize);
    resize();
    if(!reduced)frame=requestAnimationFrame(animate);
    return()=>{
      alive=false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize',resize);
    };
  },[]);
  return <canvas ref={ref} className="fridge-cold-particles" aria-hidden="true"/>;
}
