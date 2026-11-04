import {ColdParticles} from '../components/ColdParticles';
import {PresentationTour} from '../components/PresentationTour';
import {createFileRoute} from '@tanstack/react-router';
import {useEffect,useRef,useState} from 'react';
import {VisionSensor} from '../components/VisionSensor';
import {ShoppingBag, Volume2,VolumeX,Camera,CameraOff,Play,Pause,DoorOpen,DoorClosed,Eye,ArrowRight,ArrowLeft,BarChart3,MonitorPlay,ScanFace,ShoppingCart,Check,RotateCcw,Wifi,Activity,Plus,Minus,Settings2,ChevronRight,Sun,Package,Target,Monitor,Layers,X,MousePointerClick,ShieldCheck,Clock3} from '../components/icons';

export const Route=createFileRoute('/')({component:SmartRetail});
type Mode='demo'|'audience'|'shopping';type Tab='experience'|'analytics';
type Product={id:string,name:string,flavor:string,price:number,stock:number,accent:string,color:string,tag:string,shot:string,can:string,video:string,ingredients:string[],copy:string};
const products:Product[]=[
{id:'bloom',name:'BLOOM',flavor:'Raspberry Rose',price:3.99,stock:24,accent:'#ff79c2',color:'#de52b2',tag:'BOTANICAL SPARKLING',shot:'/assets/bloom.jpg',can:'/assets/cans/bloom-full.png',video:'/assets/ads/bloom.mp4',ingredients:['Raspberry','Rose','Botanical extracts'],copy:'A LITTLE MOMENT FOR YOU'},
{id:'aura',name:'AURA+',flavor:'Yuzu Mint',price:4.49,stock:18,accent:'#a3ecc5',color:'#64bfa0',tag:'BOTANICAL ENERGY',shot:'/assets/aura.jpg',can:'/assets/cans/aura-full.png',video:'/assets/ads/aura.mp4',ingredients:['Yuzu','Mint','Matcha','Ginseng'],copy:'ELEVATE YOUR ENERGY'},
{id:'rush',name:'RUSH ZERO',flavor:'Lemon Rush',price:3.49,stock:32,accent:'#ffe27e',color:'#f1bd39',tag:'NATURAL ENERGY',shot:'/assets/rush.jpg',can:'/assets/cans/rush-full.png',video:'/assets/ads/rush.mp4',ingredients:['Lemon','Vitamin B complex'],copy:'BIG FLAVOR. ZERO SUGAR.'},
{id:'vivi',name:'VIVI POP',flavor:'Berry Boom',price:2.99,stock:28,accent:'#87caff',color:'#359cfa',tag:'CAFFEINE FREE',shot:'/assets/vivi.jpg',can:'/assets/cans/vivi-full.png',video:'/assets/ads/vivi.mp4',ingredients:['Mixed berries','Vitamins C + B6 + B12'],copy:'POP INTO FUN'}];
type Event={id:number,ts:number,kind:string,detail:string,product?:string};
type GestureRecord={id:string;ts:number;direction:'left'|'right';from:string;to:string;viewMs:number;quality:number};
const initStocks=Object.fromEntries(products.map(p=>[p.id,p.stock]));
function SmartRetail(){
 const [tab,setTab]=useState<Tab>('experience');const [mode,setMode]=useState<Mode>('demo');const [active,setActive]=useState(0);const [selected,setSelected]=useState<string|null>(null);const [cart,setCart]=useState<Record<string,number>>({});const [stocks,setStocks]=useState<Record<string,number>>(initStocks);const [events,setEvents]=useState<Event[]>([]);
 const [store,setStore]=useState('Flagship Store · 01');const [visits,setVisits]=useState(0);const [sales,setSales]=useState(0);const [revenue,setRevenue]=useState(0);const [camera,setCamera]=useState(false);const [motion,setMotion]=useState(0);const [manualPresence,setManualPresence]=useState(false);const [allowAudio,setAllowAudio]=useState(false);const [audioReady,setAudioReady]=useState(false);const [audioBlocked,setAudioBlocked]=useState(false);const [audioTest,setAudioTest]=useState(false);const [audioLoop,setAudioLoop]=useState(0);const [playing,setPlaying]=useState(true);const [adError,setAdError]=useState(false);const [preference,setPreference]=useState('rotate');const [cameraPresence,setCameraPresence]=useState(false);const [detail,setDetail]=useState(false);const [toast,setToast]=useState('');const [gestureEnabled,setGestureEnabled]=useState(false);const [calibrationVersion,setCalibrationVersion]=useState(0);const [gestureRecords,setGestureRecords]=useState<GestureRecord[]>([]);const [gestureReady,setGestureReady]=useState(false);const [gestureFilter,setGestureFilter]=useState<'all'|'left'|'right'>('all');const [gestureFlash,setGestureFlash]=useState<{id:number;direction:'left'|'right';to:string}|null>(null);
 const [presentationEnabled,setPresentationEnabled]=useState(false);
 const [presentationStep,setPresentationStep]=useState(-1);
 const [presentationAuto,setPresentationAuto]=useState(true);

 const vid=useRef<HTMLVideoElement>(null);const started=useRef(false);const currentMode=useRef<Mode>('demo');const manualTimer=useRef<number|null>(null);const cameraLocked=useRef(false);const audioCtx=useRef<AudioContext|null>(null);const audioGain=useRef<GainNode|null>(null);const audioSource=useRef<MediaElementAudioSourceNode|null>(null);const audioTestTimer=useRef<number|null>(null);const gestureFlashTimer=useRef<number|null>(null);const activeRef=useRef(active);const adStartedRef=useRef(Date.now());
 activeRef.current=active;const product=products[active],selectedP=products.find(p=>p.id===selected),items=Object.entries(cart).filter(([,q])=>q>0),total=items.reduce((s,[id,n])=>s+(products.find(p=>p.id===id)?.price||0)*n,0),cartCount=items.reduce((s,[,n])=>s+n,0);

 // Presentation is accessible only through ?presentation=1.
 // Do not hydrate or overwrite local data when it is active.
 useEffect(()=>{
  if(new URLSearchParams(window.location.search).get('presentation')==='1')setPresentationEnabled(true);
 },[]);
 useEffect(()=>{
  if(!presentationEnabled||presentationStep<0)return;
  const step=presentationStep;
  const displayMode:Mode=step===0?'demo':step===1?'audience':'shopping';
  currentMode.current=displayMode;
  setMode(displayMode);
  setTab(step===7?'analytics':'experience');
  setCamera(false);
  setGestureEnabled(false);
  setManualPresence(step>=1);
  setCameraPresence(false);
  setActive(step===1?1:0);
  setSelected(step>=3&&step<=6?'bloom':null);
  setCart(step===4?{bloom:1}:{});
  setStocks({...initStocks,bloom:initStocks.bloom-(step>=5?1:0)});
  setVisits(step>=1?1:0);
  setSales(step>=5?1:0);
  setRevenue(step>=5?products[0].price:0);
  setPlaying(true);
  setAdError(false);
  const now=Date.now();
  const log:Event[]=[];
  if(step>=1)log.push({id:11,ts:now,kind:'audience',detail:'Simulated visitor · guided presentation'});
  if(step>=2)log.push({id:12,ts:now,kind:'door',detail:'Fridge opened · guided presentation'});
  if(step>=3)log.push({id:13,ts:now,kind:'select',detail:'BLOOM selected · guided presentation',product:'bloom'});
  if(step>=4)log.push({id:14,ts:now,kind:'cart',detail:'BLOOM added to demo basket',product:'bloom'});
  if(step>=5)log.push({id:15,ts:now,kind:'checkout',detail:'Simulated $3.99 checkout · no real payment'});
  setEvents(log.reverse());
  const scrollTarget=step>=7?'.metric-grid':step>=4&&step<=6?'.lower-grid':'.experience-grid';
  const scrollTimer=window.setTimeout(()=>{
   document.querySelector(scrollTarget)?.scrollIntoView({behavior:'smooth',block:'center'});
  },180);
  return()=>window.clearTimeout(scrollTimer);
 },[presentationEnabled,presentationStep]);
 useEffect(()=>{
  if(!presentationEnabled||!presentationAuto||presentationStep<0||presentationStep>=7)return;
  const timer=window.setTimeout(()=>setPresentationStep(x=>Math.min(x+1,7)),11000);
  return()=>window.clearTimeout(timer);
 },[presentationEnabled,presentationAuto,presentationStep]);
 function beginPresentation(){setPresentationStep(0);setPresentationAuto(true)}
 function exitPresentation(){window.location.assign(window.location.pathname)}
 function emit(kind:string,detail:string,productId?:string){setEvents(v=>[{id:Date.now()+Math.random(),ts:Date.now(),kind,detail,product:productId},...v].slice(0,80));}
 function announce(t:string){setToast(t);window.setTimeout(()=>setToast(''),3200)}
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('presentation')==='1')return;try{const raw=localStorage.getItem('srai-web-demo-v1');if(raw){const a=JSON.parse(raw);if(a.stocks)setStocks(a.stocks);if(a.events)setEvents(a.events);setVisits(a.visits||0);setSales(a.sales||0);setRevenue(a.revenue||0)}}catch{}},[]);
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('presentation')==='1')return;if(!started.current){started.current=true;return}try{localStorage.setItem('srai-web-demo-v1',JSON.stringify({stocks,events,visits,sales,revenue}))}catch{}},[stocks,events,visits,sales,revenue]);

 useEffect(()=>{adStartedRef.current=Date.now();},[active]);
 useEffect(()=>{
  if(new URLSearchParams(window.location.search).get('presentation')==='1'){setGestureReady(true);return;}
  try{
   const stored=localStorage.getItem('srai-gesture-analytics-v1');
   if(stored){
    const value=JSON.parse(stored);
    if(Array.isArray(value)){
     const valid=value.filter((e:unknown)=>{
      if(!e||typeof e!=='object')return false;
      const g=e as Partial<GestureRecord>;
      return (g.direction==='left'||g.direction==='right')&&typeof g.ts==='number'&&Number.isFinite(g.ts)&&typeof g.from==='string'&&products.some(p=>p.id===g.from)&&typeof g.to==='string'&&products.some(p=>p.id===g.to)&&typeof g.viewMs==='number'&&Number.isFinite(g.viewMs)&&g.viewMs>=0&&typeof g.quality==='number'&&Number.isFinite(g.quality);
     });
     setGestureRecords(valid.slice(0,500));
    }
   }
  }catch{}
  setGestureReady(true);
 },[]);
 useEffect(()=>{if(!gestureReady||new URLSearchParams(window.location.search).get('presentation')==='1')return;try{localStorage.setItem('srai-gesture-analytics-v1',JSON.stringify(gestureRecords))}catch{}},[gestureRecords,gestureReady]);
 const gestureTotal=gestureRecords.length;
 const gestureLeft=gestureRecords.filter(g=>g.direction==='left').length;
 const gestureRight=gestureRecords.filter(g=>g.direction==='right').length;
 const quickChanges=gestureRecords.filter(g=>g.viewMs<=5000).length;
 const averageSeconds=gestureTotal?(gestureRecords.reduce((sum,g)=>sum+g.viewMs,0)/gestureTotal/1000):0;
 const visibleGestures=gestureRecords.filter(g=>gestureFilter==='all'||g.direction===gestureFilter).slice(0,12);
 const preferredIndex=products.findIndex(p=>p.id===preference);
 function nextCommercial(){setActive(i=>(i+1)%products.length);}
 function handleAirSwipe(direction:'left'|'right',quality:number){
  if(!gestureEnabled||currentMode.current==='shopping')return;
  const previousIndex=activeRef.current;
  const targetIndex=(previousIndex+(direction==='left'?1:products.length-1))%products.length;
  const from=products[previousIndex],to=products[targetIndex];
  const record:GestureRecord={id:String(Date.now())+'-'+String(Math.random()),ts:Date.now(),direction,from:from.id,to:to.id,viewMs:Math.max(0,Date.now()-adStartedRef.current),quality};
  activeRef.current=targetIndex;
  setActive(targetIndex);
  setGestureRecords(v=>[record,...v].slice(0,500));
  if(currentMode.current!=='demo')setAudioLoop(0);
  setPlaying(true);
  emit('gesture','Air swipe '+direction+' · '+from.name+' to '+to.name,from.id);
  setGestureFlash({id:Date.now(),direction,to:to.name});
  if(gestureFlashTimer.current!==null)window.clearTimeout(gestureFlashTimer.current);
  gestureFlashTimer.current=window.setTimeout(()=>setGestureFlash(null),1250);
  announce((direction==='left'?'← NEXT':'PREVIOUS →')+' · '+to.name);
 }
 function downloadGestureCsv(){
  if(!gestureRecords.length)return;
  const rows=[['Timestamp','Swipe direction','Commercial left','Commercial entered','Screen time seconds','Motion consistency score'],...gestureRecords.map(g=>[new Date(g.ts).toISOString(),g.direction,products.find(p=>p.id===g.from)?.name||g.from,products.find(p=>p.id===g.to)?.name||g.to,(g.viewMs/1000).toFixed(1),String(g.quality)])];
  const csv=rows.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='smart-retail-gesture-analytics.csv';
  document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),800);
 }
 function toggleAirSwipe(){
  const next=!gestureEnabled;
  setGestureEnabled(next);
  if(next&&!camera)connectCamera();
  announce(next?'Air swipe enabled · move one hand sideways':'Classic mode restored · manual and automatic ads');
 }
 function toAudience(source:'manual'|'camera'){
  if(currentMode.current!=='demo')return;
  currentMode.current='audience';setMode('audience');setAudioLoop(0);setSelected(null);setPlaying(true);
  if(vid.current){try{vid.current.currentTime=0}catch{}vid.current.play().catch(()=>setAdError(true));}
  if(preferredIndex>=0)setActive(preferredIndex);
  setVisits(v=>v+1);emit('audience',source==='camera'?'Camera activity detected':'Manual visitor simulation');
  announce(source==='camera'?'Visitor signal · Audience Mode':'Simulated visitor · Audience Mode');
 }
 function resetToDemo(reason:string){
  currentMode.current='demo';setMode('demo');setManualPresence(false);setCameraPresence(false);
  setSelected(null);setAudioLoop(0);setActive(0);setCart({});setPlaying(true);
  if(audioCtx.current&&audioGain.current){audioGain.current.gain.setTargetAtTime(0,audioCtx.current.currentTime,.06);}else if(vid.current){vid.current.muted=true;vid.current.volume=0;}
  if(manualTimer.current!==null){window.clearTimeout(manualTimer.current);manualTimer.current=null;}
  emit('mode',reason);announce(reason);
 }
 useEffect(()=>{currentMode.current=mode;},[mode]);
 useEffect(()=>{
  const v=vid.current;
  if(!v)return;
  setAdError(false);
  try{v.currentTime=0;}catch{}
  if(playing)v.play().catch(()=>setAdError(true));
 },[active]);
 // Presence, not raw motion, controls advertisement sound. A stationary
 // visitor keeps sound active while the face or scene-occupancy estimate holds.
 const visitorPresent=manualPresence||(camera&&cameraPresence);
 const audioOutputActive=allowAudio&&audioReady&&(audioTest||(mode!=='demo'&&visitorPresent));
 useEffect(()=>{
  const v=vid.current;if(!v)return;
  const wanted=audioOutputActive?(audioTest?.60:.58):0;
  if(audioCtx.current&&audioGain.current){
   v.muted=!allowAudio;
   v.volume=1;
   const ctx=audioCtx.current,gain=audioGain.current.gain;
   gain.cancelScheduledValues(ctx.currentTime);
   gain.setTargetAtTime(wanted,ctx.currentTime,.065);
  }else{
   v.muted=wanted===0;
   v.volume=wanted;
  }
  if(audioOutputActive&&!playing)v.play().catch(()=>setAdError(true));
 },[audioOutputActive,allowAudio,playing,active]);
 useEffect(()=>()=>{if(manualTimer.current!==null)window.clearTimeout(manualTimer.current);if(audioTestTimer.current!==null)window.clearTimeout(audioTestTimer.current);if(gestureFlashTimer.current!==null)window.clearTimeout(gestureFlashTimer.current);audioCtx.current?.close().catch(()=>{});},[]);
 function armStationAudio(){
  const v=vid.current;
  if(!v){setAudioBlocked(true);announce('Video player not ready');return;}
  try{
   if(!audioCtx.current){
    const ctor=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(ctor){
     const ctx=new ctor();
     const source=ctx.createMediaElementSource(v);
     const gain=ctx.createGain();
     gain.gain.value=0;
     source.connect(gain);gain.connect(ctx.destination);
     audioCtx.current=ctx;audioSource.current=source;audioGain.current=gain;
    }
   }
   // Unlock synchronously in a real click, before awaiting camera permissions.
   setAudioBlocked(false);setAllowAudio(true);
   v.muted=false;v.volume=audioCtx.current?1:0;
   const context=audioCtx.current;
   if(context){
    void context.resume().then(()=>{
     setAudioReady(true);setAudioBlocked(false);
    }).catch(()=>{
     setAudioReady(false);setAudioBlocked(true);setAllowAudio(false);
     announce('Browser blocked audio. Click Enable station sound.');
    });
   }else{setAudioReady(true);}
   void v.play().catch(()=>{
    setAudioBlocked(true);setAudioReady(false);
    announce('Sound needs a user click to unlock playback.');
   });
   emit('audio','Audio permission armed by station operator');
  }catch{
   setAudioBlocked(true);setAudioReady(false);setAllowAudio(false);
   announce('Unable to activate station sound in this browser.');
  }
 }
 function toggleAudio(){
  if(allowAudio&&!audioBlocked){
   setAllowAudio(false);setAudioReady(false);setAudioTest(false);
   if(audioCtx.current&&audioGain.current){
    audioGain.current.gain.setTargetAtTime(0,audioCtx.current.currentTime,.04);
   }
   if(vid.current)vid.current.muted=true;
   emit('audio','Operator muted station');
  }else armStationAudio();
 }
 function connectCamera(){
  // The camera button is also the first user interaction that arms station sound.
  if(!allowAudio||audioBlocked)armStationAudio();
  setCamera(true);
 }
 function testStationSound(){
  if(!allowAudio||audioBlocked)armStationAudio();
  if(audioTestTimer.current!==null)window.clearTimeout(audioTestTimer.current);
  setAudioTest(true);
  audioTestTimer.current=window.setTimeout(()=>setAudioTest(false),2300);
  announce('Audio test · 2.3 seconds, then silence until visitor arrives');
 }
 function handleVideoEnded(){
  if(mode==='demo'){nextCommercial();return;}
  setAudioLoop(x=>x+1);
  if(mode==='audience'&&!selected){nextCommercial();return;}
  const v=vid.current;if(v){v.currentTime=0;v.play().catch(()=>setAdError(true));}
 }
 function handleVideoError(){setAdError(true);if(vid.current){vid.current.pause();}}
 function handlePresence(present:boolean,source:string){
  setCameraPresence(present);
  if(present){
   if(!cameraLocked.current){cameraLocked.current=true;if(currentMode.current==='demo')toAudience('camera');}
  }else{
   cameraLocked.current=false;
   if(!manualPresence&&currentMode.current!=='shopping')resetToDemo('Visitor left · carousel resumed');
  }
 }
 function stopCamera(){
  setGestureEnabled(false);
  setCamera(false);setCameraPresence(false);cameraLocked.current=false;
  if(!manualPresence&&currentMode.current!=='shopping')resetToDemo('Camera disabled · Demo Mode');
 }
 useEffect(()=>{
  if(!camera&&!manualPresence&&mode==='audience')resetToDemo('Camera disconnected · Demo Mode');
 },[camera,manualPresence,mode]);
 useEffect(()=>{
  if(mode!=='shopping'||manualPresence||!camera||cameraPresence)return;
  const timeout=window.setTimeout(()=>{if(currentMode.current==='shopping'&&!cameraLocked.current)resetToDemo('Visitor left · carousel resumed');},7500);
  return()=>window.clearTimeout(timeout);
 },[mode,manualPresence,camera,cameraPresence]);
 function visitor(){setManualPresence(true);toAudience('manual');if(manualTimer.current!==null)window.clearTimeout(manualTimer.current);manualTimer.current=window.setTimeout(()=>{if(currentMode.current!=='shopping')resetToDemo('Manual visitor session ended · carousel resumed')},22000)}
 function openDoor(){currentMode.current='shopping';setMode('shopping');setTab('experience');emit('door','Fridge opened');announce('Welcome to the smart fridge')}
 function closeDoor(){const next=manualPresence||cameraPresence?'audience':'demo';currentMode.current=next;setMode(next);setSelected(null);setDetail(false);emit('door','Fridge closed')}
 function choose(id:string){const i=products.findIndex(p=>p.id===id);setActive(i);setSelected(id);setDetail(true);emit('select','Product spotlight activated',id)}
 function add(id:string){const already=cart[id]||0;if(already>=stocks[id]){announce('No additional units in stock');return}setCart(v=>({...v,[id]:(v[id]||0)+1}));emit('cart','Added to basket',id);announce('Added to your basket')}
 function checkout(){if(!cartCount)return;if(items.some(([id,q])=>q>stocks[id])){announce('Stock changed. Please adjust your basket.');return}setStocks(v=>Object.fromEntries(Object.entries(v).map(([id,n])=>[id,Math.max(0,n-(cart[id]||0))])));setSales(v=>v+1);setRevenue(v=>v+total);emit('checkout',`Simulated transaction $${total.toFixed(2)}`);setCart({});announce('Demo checkout complete · no payment charged')}
 function reset(){setGestureRecords([]);setGestureFlash(null);setStocks({...initStocks});setEvents([]);setVisits(0);setSales(0);setRevenue(0);setCart({});resetToDemo('Demo data reset')}
 return <div className="srai-shell">
  <header className="topbar"><div className="brand"><div className="brand-icon"><span>✦</span></div><div><strong>SMART RETAIL<span> AI</span></strong><small>INTELLIGENT RETAIL OPERATING SYSTEM <i>·</i> WEB DEMO 01</small></div></div><div className="topactions"><div className="status-online"><span className="live-dot"/> DEMO ONLINE</div><button className="outline small" onClick={toggleAudio}>{allowAudio&&audioReady?<Volume2 size={15}/>:<VolumeX size={15}/>} {audioBlocked?'Unlock sound':allowAudio?(audioReady?'Sound armed':'Preparing audio…'):'Enable station sound'}</button><button className="outline small" onClick={()=>camera?stopCamera():connectCamera()}>{camera?<CameraOff size={15}/>:<Camera size={15}/>} {camera?'Camera on':'Camera + sound'}</button></div></header>
  <div className="app-grid"><aside className="navrail"><div className="navlabel">WORKSPACE</div><button className={tab==='experience'?'navitem active':'navitem'} onClick={()=>setTab('experience')}><MonitorPlay size={18}/> <span>Live Experience</span></button><button className={tab==='analytics'?'navitem active':'navitem'} onClick={()=>setTab('analytics')}><BarChart3 size={18}/><span>Analytics</span></button><div className="navlabel spaced">STATION CONTROLS</div><div className="sidecard"><div className="eyebrow">ACTIVE LOCATION</div><select value={store} onChange={e=>{setStore(e.target.value);emit('station',`Switched view to ${e.target.value}`)}}><option>Flagship Store · 01</option><option>North Store · 02</option><option>South Store · 03</option></select><div className="side-note">Local demonstration profile. Cloud store sync is not active.</div><div className="eyebrow pref-label">MY FLAVOR PREFERENCE</div><select aria-label="Flavor interest" value={preference} onChange={e=>{setPreference(e.target.value);const found=products.findIndex(p=>p.id===e.target.value);if(currentMode.current==='audience'&&found>=0)setActive(found);emit('preference',e.target.value==='rotate'?'Variety selected':'Explicit flavor interest selected',e.target.value)}}><option value="rotate">Discover all flavors</option><option value="aura">Botanical / AURA+</option><option value="bloom">Floral / BLOOM</option><option value="rush">Citrus / RUSH ZERO</option><option value="vivi">Berry / VIVI POP</option></select><div className="side-note">Opt-in taste preference; never inferred from facial appearance.</div></div><div className="sidecard rewards-sidecard"><div className="eyebrow">SMART RETAIL REWARDS</div><div className="rewards-side-title">Your first drink, <b>half off.</b></div><a className="rewards-qr-link" href="/rewards" target="_blank" rel="noreferrer" aria-label="Open the Rewards signup page"><img src="/assets/smart-retail-rewards-qr.png" alt="Scannable QR code to Smart Retail Rewards"/></a><strong className="rewards-side-offer">SCAN · JOIN · SAVE 50%</strong><div className="side-note">Scan with your phone to register and claim a one-time welcome coupon. Demo register redemption only.</div><a className="rewards-side-open" href="/rewards" target="_blank" rel="noreferrer">Preview phone page ↗</a></div><div className="sidecard side-mode"><div className="eyebrow">SYSTEM MODE</div><div className="modevalue"><span className={'mode-dot '+mode}/>{mode.toUpperCase()}</div><div className="mode-desc">{mode==='demo'?'Rotating ads · ambient sound off':mode==='audience'?'Visitor session · adaptive media': 'Open fridge · interactive catalog'}</div></div><button className="navitem navmanual" onClick={visitor}><Eye size={18}/> Simulate Visitor</button><button className="navitem" onClick={()=>resetToDemo('Mode reset · Demo Mode')}><RotateCcw size={18}/> Reset mode</button><div className="aside-bottom"><ShieldCheck size={17}/><span>Camera frames stay on this device.<br/>No face identification.</span></div></aside>
  <main className="main-content">{tab==='experience'?<><div className="section-head"><div><div className="eyebrow">LIVE RETAIL EXPERIENCE <span className="dot-text">●</span> STATION 01</div><h1>The intelligent <em>fridge.</em></h1><p>From first impression to product discovery, every moment matters.</p></div><div className="section-badge"><Activity size={16}/> LIVE EXPERIENCE</div></div>
   <div className="experience-grid"><section className="screen-panel"><div className="panel-heading"><span><Monitor size={15}/> COMMERCIAL DISPLAY</span><div className="live-pill"><span className="live-dot"/> {mode==='demo'?'AMBIENT LOOP':mode==='audience'?'AUDIENCE MODE':'PRODUCT SPOTLIGHT'}</div></div><div className="screen-video"><video ref={vid} autoPlay muted={!allowAudio} playsInline preload="auto" poster={product.shot} src={product.video} onLoadedData={()=>{setAdError(false);if(playing)vid.current?.play().catch(()=>setAdError(true));}} onError={handleVideoError} onEnded={handleVideoEnded}/><div className="video-ambient"/>{adError&&<div className="ad-error"><strong>Video unavailable</strong><span>{product.name} · retry or choose another</span><button onClick={()=>{setAdError(false);vid.current?.load();vid.current?.play().catch(()=>setAdError(true));}}>Retry playback</button></div>}<div className="video-overlay"><div className="video-tag"><span className="live-dot"/> NOW PLAYING</div><div><div className="screen-name">{product.name}</div><div className="screen-sub">{product.flavor}</div></div></div>{gestureFlash&&camera&&mode!=='shopping'&&<div key={gestureFlash.id} className={'gesture-flash '+gestureFlash.direction} role="status"><div className="gesture-flash-arrow">{gestureFlash.direction==='left'?'←':'→'}</div><div><span>GESTURE CONFIRMED</span><strong>{gestureFlash.direction==='left'?'NEXT COMMERCIAL':'PREVIOUS COMMERCIAL'}</strong><small>{gestureFlash.to} is playing</small></div></div>}{gestureEnabled&&camera&&mode!=='shopping'&&<div className="gesture-screen-cue"><span>↔</span> AIR SWIPE ACTIVE · MOVE HAND TO CHANGE ADS</div>}</div><div className="screen-controls"><div className="controls-left"><button aria-label={playing?'Pause':'Play'} onClick={()=>{const v=vid.current;if(!v)return;if(playing)v.pause();else v.play().catch(()=>{});setPlaying(!playing)}}>{playing?<Pause size={15}/>:<Play size={15}/>}</button><button aria-label="Previous commercial" onClick={()=>setActive((active+3)%4)}><ArrowLeft size={15}/></button><button aria-label="Next commercial" onClick={()=>setActive((active+1)%4)}><ArrowRight size={15}/></button><span className="mutedtext">{products.findIndex(p=>p.id===product.id)+1} / 4 · ORIGINAL COMMERCIAL</span></div><span className={'screen-audio '+(audioOutputActive?'audio-on':'')}>{audioBlocked?'SOUND BLOCKED':audioOutputActive?'SOUND ON · VISITOR':allowAudio&&audioReady?'SOUND ARMED · SILENT':'MUTED'}</span></div><div className="product-switcher">{products.map((p,i)=><button key={p.id} className={'switch-pill '+(i===active?'current':'')} onClick={()=>{setActive(i);if(mode==='shopping')setSelected(p.id);emit('ad',`Manual ad switch · ${p.name}`,p.id)}} style={{'--accent':p.color} as React.CSSProperties}><span className="pill-dot"/>{p.name}</button>)}</div></section>
   <section className="fridge-panel"><div className="panel-heading"><span><SnowIcon/> SMART FRIDGE</span><div className="temperature">❄ 3.5°C <span>·</span> CHILLED</div></div><div className={'fridge-chamber '+(mode==='shopping'?'opened':'closed')}><div className="back-glow"/><div className="fridge-edge"/><div className="fog fog-one"/><div className="fog fog-two"/>{mode==='shopping'?<div className="chamber-tech" aria-hidden="true"><div className="chamber-back-wall"/><div className="chamber-ceiling"><div className="chamber-top-vent"/><div className="chamber-ceiling-led"/></div><div className="chamber-side-led chamber-side-left"/><div className="chamber-side-led chamber-side-right"/><div className="chamber-floor-vent"/></div>:null}{mode==='shopping'?<ColdParticles/>:null}{mode==='shopping'?<><div className="fridge-top"><span>✦</span> OPEN & EXPLORE <small>CHOOSE YOUR FLAVOR</small></div><div className="shelf"><div className="shelf-cold-haze" aria-hidden="true"/><div className="can-grid">{products.map(p=><button className={'can-tile '+(selected===p.id?'chosen':'')} style={{'--accent':p.color} as React.CSSProperties} key={p.id} onClick={()=>choose(p.id)}><span className="can-showcase"><img src={p.can} alt={p.name + ' original beverage can'}/><span className="can-pedestal" aria-hidden="true"><svg className="pedestal-art" viewBox="0 0 160 54" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id={'ped-metal-'+p.id} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#152641"/><stop offset="13%" stopColor="#a3bfd2"/><stop offset="30%" stopColor="#456078"/><stop offset="49%" stopColor="#d3e4ec"/><stop offset="67%" stopColor="#51687c"/><stop offset="88%" stopColor="#aecadb"/><stop offset="100%" stopColor="#152942"/></linearGradient><linearGradient id={'ped-body-'+p.id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b7184"/><stop offset="28%" stopColor="#c5dae3"/><stop offset="52%" stopColor="#476075"/><stop offset="100%" stopColor="#14253c"/></linearGradient><radialGradient id={'ped-top-'+p.id} cx="50%" cy="37%" r="63%"><stop offset="0%" stopColor="#233956"/><stop offset="58%" stopColor="#142841"/><stop offset="80%" stopColor={p.color} stopOpacity=".60"/><stop offset="100%" stopColor="#a4cbe1"/></radialGradient></defs><ellipse cx="80" cy="47" rx="71" ry="7" fill={p.color} opacity=".21"/><path d="M7 23 C7 10 153 10 153 23 L153 35 C153 53 7 53 7 35 Z" fill={'url(#ped-metal-'+p.id+')'} stroke="#a4c5d8" strokeWidth="1"/><path d="M8 33 C13 49 147 49 152 33 L152 36 C148 51 12 51 8 36 Z" fill={'url(#ped-body-'+p.id+')'} opacity=".92"/><ellipse cx="80" cy="22" rx="73" ry="16" fill="#19324d" stroke={p.color} strokeWidth="2.5"/><ellipse cx="80" cy="20" rx="67" ry="12.5" fill={'url(#ped-top-'+p.id+')'} stroke="#d8eef5" strokeOpacity=".58" strokeWidth=".9"/><path d="M13 25 C20 41 140 41 147 25" stroke={p.color} strokeWidth="3" strokeLinecap="round" fill="none"/><path d="M13 30 C25 42 135 42 147 30" stroke="#effaff" strokeOpacity=".68" strokeWidth="1" fill="none"/><rect x="66" y="42" width="28" height="4" rx="2" fill={p.color}/><rect x="70" y="43" width="20" height="1.8" rx=".9" fill="#ffffff" opacity=".74"/></svg></span></span><span className="can-name">{p.name}</span><small>${p.price.toFixed(2)}</small></button>)}</div><div className="shelf-line"/><div className="shelf-reflection"/></div><div className="cold-fog-layer" aria-hidden="true"><span className="cold-wisp wisp-left"/><span className="cold-wisp wisp-center"/><span className="cold-wisp wisp-right"/><span className="cold-floor-haze"/></div><div className="fridge-bottom"><span>UV HYGIENE</span><span>REAL PRODUCTS · MOCK STOCK</span></div></>:<div className="closed-door"><div className="door-screen"><div className="door-screen-glass"/><div className="door-mark">✦</div><span className="door-kicker">A NEW WAY TO DISCOVER</span><strong>OPEN THE<br/><i>FRIDGE.</i></strong><p>Explore four extraordinary flavors</p><div className="door-previews">{products.map(p=><div key={p.id} className="door-thumb"><img src={p.can} alt={p.name}/></div>)}</div><button className="open-cta" onClick={openDoor}>OPEN THE FRIDGE <DoorOpen size={17}/></button></div><div className="door-handle"/></div>}</div><div className="fridge-action">{mode==='shopping'?<><button className="outline" onClick={closeDoor}><DoorClosed size={17}/> Close fridge</button><span className="mutedtext">CLICK A DRINK TO EXPLORE</span></>:<><span className="mutedtext">INTERACTIVE PRODUCT DISCOVERY</span><button className="primary-action" onClick={openDoor}>Explore products <ArrowRight size={17}/></button></>}</div></section></div>
   <div className="lower-grid"><section className="insight-panel"><div className="panel-heading"><span><MousePointerClick size={16}/> PRODUCT SPOTLIGHT</span><span className="mutedtext">DYNAMIC SELECTION</span></div>{selectedP?<div className="selected-content"><div className="selected-cover"><img src={selectedP.can} alt={selectedP.name}/></div><div className="selected-info"><div className="eyebrow">SELECTED DRINK</div><h2>{selectedP.name}</h2><p>{selectedP.flavor} <span>·</span> {selectedP.tag}</p><div className="ingredient-list">{selectedP.ingredients.map(x=><span key={x}>{x}</span>)}</div><div className="detail-footer"><strong>${selectedP.price.toFixed(2)}</strong><span className="mutedtext">{stocks[selectedP.id]} AVAILABLE</span><button onClick={()=>add(selectedP.id)} className="primary-action"><Plus size={16}/> Add to basket</button></div></div></div>:<div className="empty-spotlight"><div className="empty-icon"><Target size={26}/></div><div><strong>Waiting for product interaction</strong><p>Open the fridge and select a drink to trigger a live commercial spotlight.</p></div></div>}</section>
    <section className="basket-panel"><div className="panel-heading"><span><ShoppingBag size={16}/> YOUR BASKET</span><span className="basket-count">{cartCount} ITEMS</span></div><div className="basket-contents">{items.length?items.map(([id,n])=>{const p=products.find(x=>x.id===id)!;return <div className="basket-item" key={id}><img src={p.can} alt=""/><div><b>{p.name}</b><small>${p.price.toFixed(2)}</small></div><div className="quantity"><button onClick={()=>setCart(v=>({...v,[id]:Math.max(0,(v[id]||0)-1)}))}><Minus size={13}/></button>{n}<button onClick={()=>add(id)}><Plus size={13}/></button></div></div>}):<div className="basket-empty"><ShoppingCart size={24}/><p>Nothing in your basket yet.</p></div>}</div><div className="basket-footer"><div><span>ESTIMATED TOTAL</span><strong>${total.toFixed(2)}</strong></div><button disabled={!cartCount} className="checkout" onClick={checkout}>SIMULATE CHECKOUT <ArrowRight size={16}/></button><small>Simulation only. No payment is collected.</small></div></section></div>
   </>:<><div className="section-head"><div><div className="eyebrow">BUSINESS INTELLIGENCE <span className="dot-text">●</span> LOCAL DEMO DATA</div><h1>Retail <em>intelligence.</em></h1><p>Exposure, interaction and simulated sales. No fabricated real customer traffic.</p></div><button className="outline" onClick={reset}><RotateCcw size={16}/> Reset all demo data</button></div><div className="metric-grid">{[{name:'VISITOR SESSIONS',value:visits.toString(),hint:'Manual and motion sessions',Icon:Eye},{name:'PRODUCT INTERACTIONS',value:events.filter(e=>e.kind==='select').length.toString(),hint:'Selected can events',Icon:MousePointerClick},{name:'DEMO CHECKOUTS',value:sales.toString(),hint:'No actual purchases',Icon:ShoppingCart},{name:'SIMULATED REVENUE',value:`$${revenue.toFixed(2)}`,hint:'Synthetic, not actual sales',Icon:BarChart3}].map(m=><div className="metric-card" key={m.name}><div className="metric-top"><span>{m.name}</span><m.Icon size={19}/></div><strong>{m.value}</strong><small>{m.hint}</small></div>)}</div><section className="gesture-analytics" id="gesture-analytics"><div className="gesture-analytics-head"><div><div className="eyebrow">INTERACTIVE ADVERTISING · LOCAL CAMERA EVENTS</div><h2>Gesture <em>analytics.</em></h2><p>See which ads people navigate away from using a left or right air swipe.</p></div><button className="gesture-export" onClick={downloadGestureCsv} disabled={!gestureTotal}>↓ Export CSV</button></div><div className="gesture-kpis">{[{label:'TOTAL AIR SWIPES',n:String(gestureTotal),hint:'Latest 500 gestures'},{label:'SWIPE LEFT · NEXT',n:String(gestureLeft),hint:'Forward navigation'},{label:'SWIPE RIGHT · BACK',n:String(gestureRight),hint:'Backward navigation'},{label:'QUICK CHANGES',n:String(quickChanges),hint:'Within 5 s of ad appearing'},{label:'AVG TIME BEFORE SWIPE',n:gestureTotal?averageSeconds.toFixed(1)+' s':'—',hint:'Time from screen change'}].map(k=><div className="gesture-kpi" key={k.label}><span>{k.label}</span><strong>{k.n}</strong><small>{k.hint}</small></div>)}</div><div className="gesture-analytics-grid"><div className="gesture-analytics-subcard"><h3>Swipes away from each commercial</h3><p>Measured gesture navigations by the commercial that was playing before the swipe.</p><div className="gesture-product-bars">{products.map(p=>{const count=gestureRecords.filter(g=>g.from===p.id).length;const max=Math.max(1,...products.map(x=>gestureRecords.filter(g=>g.from===x.id).length));return <div className="gesture-brand-row" key={p.id}><span className="gesture-brand-dot" style={{background:p.color}}/><b>{p.name}</b><div className="gesture-brand-bar"><div style={{width:(count/max*100)+'%',background:p.color}}/></div><strong>{count}</strong></div>})}</div><div className="gesture-legend">A swipe is a navigation event, not proof of dislike or a completed sale.</div></div><div className="gesture-analytics-subcard"><div className="gesture-log-head"><h3>Recent hand interactions</h3><div className="gesture-filters">{(['all','left','right'] as const).map(f=><button key={f} className={gestureFilter===f?'selected':''} onClick={()=>setGestureFilter(f)}>{f==='all'?'All':f==='left'?'← Left':'Right →'}</button>)}</div></div>{visibleGestures.length?<div className="gesture-events">{visibleGestures.map(g=>{const previous=products.find(p=>p.id===g.from),next=products.find(p=>p.id===g.to);return <div className="gesture-event" key={g.id}><span className={'gesture-direction '+g.direction}>{g.direction==='left'?'←':'→'}</span><div><strong>{previous?.name||g.from} <span>→</span> {next?.name||g.to}</strong><small>{new Date(g.ts).toLocaleString()} · {(g.viewMs/1000).toFixed(1)} s before swipe</small></div><span className="gesture-event-quality">{g.quality}/100</span></div>})}</div>:<div className="gesture-no-events">No {gestureFilter==='all'?'air swipes':gestureFilter+' swipes'} recorded yet. Enable the camera and Air Swipe on Live Experience to start measuring.</div>}</div></div><div className="gesture-privacy-note"><ShieldCheck size={16}/><span>Demo data only · stored in this browser, up to 500 recent gesture events · no faces or videos stored. The 0–100 motion score is an experimental consistency indicator, not verified gesture accuracy. Export CSV to share test results.</span></div></section><div className="analytics-grid"><div className="analytics-card"><div className="panel-heading"><span><BarChart3 size={16}/> INTERACTIONS BY PRODUCT</span></div><div className="bar-chart">{products.map(p=>{const n=events.filter(e=>e.product===p.id).length;const max=Math.max(1,...products.map(x=>events.filter(e=>e.product===x.id).length));return <div className="bar-item" key={p.id}><div className="bar-value">{n}</div><div className="bar-column"><div style={{height:`${Math.max(3,n/max*100)}%`,background:p.color}}/></div><span>{p.name}</span></div>})}</div><div className="chart-note">Counts are local interface events. Estimated visual attention is not yet measured.</div></div><div className="analytics-card"><div className="panel-heading"><span><Package size={16}/> INVENTORY STATUS</span></div><div className="inventory-list">{products.map(p=><div className="inventory-item" key={p.id}><span className="inventory-color" style={{background:p.color}}/><div><strong>{p.name}</strong><small>{p.flavor}</small></div><div className="stock-track"><div style={{width:`${stocks[p.id]/p.stock*100}%`,background:p.color}}/></div><b>{stocks[p.id]}</b></div>)}</div><button className="outline full" onClick={()=>{setStocks({...initStocks});emit('inventory','Inventory replenished')}}><RotateCcw size={15}/> Replenish demo stock</button></div></div><div className="analytics-card event-card"><div className="panel-heading"><span><Activity size={16}/> EVENT LOG</span><span className="mutedtext">LOCAL BROWSER DATA · {events.length} EVENTS</span></div>{events.length?<div className="event-list">{events.slice(0,14).map(e=><div className="event-row" key={e.id}><span className="event-dot"/><time>{new Date(e.ts).toLocaleTimeString()}</time><b>{e.kind.toUpperCase()}</b><span>{e.detail}</span></div>)}</div>:<div className="empty-events">No interaction events yet. Visit the Live Experience tab to explore.</div>}</div></> }</main>
  <aside className="right-rail"><div className="right-title">LIVE MONITOR <span className="live-dot"/></div><div className="monitor-block"><div className="eyebrow">VISION SENSOR</div><VisionSensor enabled={camera} gesturesEnabled={gestureEnabled} onGesture={handleAirSwipe} calibrationVersion={calibrationVersion} onPresence={handlePresence} onFailure={announce} onTelemetry={()=>{}}/><button className="cam-btn" onClick={()=>camera?stopCamera():connectCamera()}>{camera?<CameraOff size={15}/>:<Camera size={15}/>} {camera?'Stop camera':'Enable camera + sound'}</button><button type="button" className="camera-calibrate" disabled={!camera} onClick={()=>{setCalibrationVersion(v=>v+1);announce('Empty-view calibration updated · step away from camera for best results');}}>◎ Calibrate empty view</button><div className="gesture-controls"><div className="gesture-controls-header"><span>AIR SWIPE · EXPERIMENTAL</span><span className={gestureEnabled?'gesture-status active':'gesture-status'}>{gestureEnabled?'ON':'OFF'}</span></div><button type="button" aria-pressed={gestureEnabled} className={gestureEnabled?'gesture-toggle enabled':'gesture-toggle'} onClick={toggleAirSwipe}>{gestureEnabled?'Disable · Return to classic mode':'Enable air-swipe navigation'}</button><p>Move one hand across the marked camera area: ← LEFT = next commercial, RIGHT → = previous. Hold your body steady for best accuracy. Switch off anytime.</p></div></div><div className="monitor-block divider-top"><div className="eyebrow">SESSION STATUS</div><div className="stat-row"><span>Visitor</span><b>{manualPresence?'Simulated':cameraPresence?'Visitor detected':'No visitor detected'}</b></div><div className="stat-row"><span>Mode</span><b>{mode.toUpperCase()}</b></div><div className="stat-row"><span>Ad playing</span><b>{product.name}</b></div><div className="stat-row"><span>Audio output</span><b>{audioBlocked?'Blocked · unlock':audioOutputActive?'ACTIVE':allowAudio&&audioReady?'Armed · silent':'Not armed'}</b></div><button className="audio-test-btn" onClick={testStationSound}><Volume2 size={15}/> Test station sound (2 sec)</button><div className="audio-explanation">Sound is on only when a visitor is detected (or during the 2-second sound test). A visitor standing still can stay detected through face or calibrated occupancy; the empty carousel stays muted.</div><div className="stat-row"><span>Ad loops</span><b>{audioLoop+1}</b></div><div className="stat-row"><span>Air-swipe events</span><b>{events.filter(e=>e.kind==='gesture').length} · {gestureEnabled?'ENABLED':'OFF'}</b></div></div><div className="monitor-block divider-top"><div className="eyebrow">QUICK ACTIONS</div><button className="quick-button" onClick={visitor}><Eye size={16}/> Simulate visitor <ChevronRight size={16}/></button><button className="quick-button" onClick={openDoor}><DoorOpen size={16}/> Open the fridge <ChevronRight size={16}/></button><button className="quick-button" onClick={()=>setTab('analytics')}><BarChart3 size={16}/> Gesture analytics & reports <ChevronRight size={16}/></button></div><div className="rail-foot"><ShieldCheck size={17}/><div>PRIVACY FIRST<br/><span>Video stays in the browser. Demo metrics stored locally.</span></div></div></aside></div>
  <footer><span>✦ SMART RETAIL AI <b> / </b> INTERACTIVE RETAIL PROTOTYPE</span><span>DEMO DATA ONLY <b>•</b> VERSION 0.9 WEB <b>•</b> NO REAL PAYMENTS</span></footer>
  {toast&&<div className="toast"><Check size={17}/>{toast}<button onClick={()=>setToast('')}><X size={15}/></button></div>}
  {presentationEnabled&&<PresentationTour step={presentationStep} auto={presentationAuto} onStart={beginPresentation} onToggleAuto={()=>setPresentationAuto(v=>!v)} onPrevious={()=>setPresentationStep(v=>Math.max(0,v-1))} onNext={()=>setPresentationStep(v=>Math.min(7,v+1))} onRestart={beginPresentation} onExit={exitPresentation}/>}

 </div>
}
function SnowIcon(){return <Sun size={16}/>}
