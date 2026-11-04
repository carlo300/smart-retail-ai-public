import {useEffect,useRef,useState} from 'react';
import {ScanFace} from './icons';

type Face={boundingBox:{x:number;y:number;width:number;height:number};landmarks?:{location:{x:number;y:number}}[]};
type Detector={detect(v:HTMLVideoElement):Promise<Face[]>};
type Swipe='left'|'right';
type Props={
 enabled:boolean;
 gesturesEnabled:boolean;
 calibrationVersion:number;
 onPresence:(value:boolean,via:string)=>void;
 onFailure:(s:string)=>void;
 onTelemetry:(score:number,face:boolean)=>void;
 onGesture:(direction:Swipe,quality:number)=>void;
};
type Sample={time:number;x:number;y:number};

const W=128,H=96,COLS=16,ROWS=12,CELL=8;
export function VisionSensor({enabled,gesturesEnabled,calibrationVersion,onPresence,onFailure,onTelemetry,onGesture}:Props){
 const video=useRef<HTMLVideoElement>(null);
 const canvas=useRef<HTMLCanvasElement>(null);
 const callbacks=useRef({onPresence,onFailure,onTelemetry,onGesture});
 const config=useRef({gesturesEnabled});
 callbacks.current={onPresence,onFailure,onTelemetry,onGesture};
 config.current.gesturesEnabled=gesturesEnabled;

 const [status,setStatus]=useState('offline');
 const [signal,setSignal]=useState(false);
 const [activeCells,setActiveCells]=useState(0);
 const [activity,setActivity]=useState(0);
 const [face,setFace]=useState(false);
 const [native,setNative]=useState(false);
 const [lastSwipe,setLastSwipe]=useState('READY');
 const [stillPresence,setStillPresence]=useState(false);
 const [occupancy,setOccupancy]=useState(0);
 const [presenceVia,setPresenceVia]=useState('WAITING');
 const resetBackground=useRef(false);
 useEffect(()=>{resetBackground.current=true;},[calibrationVersion]);

 useEffect(()=>{
  if(!enabled){
   setStatus('offline');setSignal(false);setActiveCells(0);setActivity(0);setFace(false);setNative(false);setLastSwipe('READY');setStillPresence(false);setOccupancy(0);setPresenceVia('WAITING');
   return;
  }
  let live=true,tid=0,busy=false,stream:MediaStream|null=null;
  let previous:Uint8Array|null=null;
  let background:Float32Array|null=null;
  let referenceFrames=0;
  let lastSeen=0,lastDisplay=0,wasPresent=false,detector:Detector|null=null;
  let nextFaceCheck=0,faces:Face[]=[],faceAt=0;
  let trail:Sample[]=[],lastGestureAt=0;
  const buffer=document.createElement('canvas');
  buffer.width=W;buffer.height=H;
  const bc=buffer.getContext('2d',{willReadFrequently:true});

  async function start(){
   setStatus('starting');
   try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    if(!live){stream.getTracks().forEach(t=>t.stop());return;}
    if(video.current){video.current.srcObject=stream;await video.current.play();}
    const ctor=(window as unknown as {FaceDetector?:new(o:{fastMode:boolean;maxDetectedFaces:number})=>Detector}).FaceDetector;
    if(ctor){try{detector=new ctor({fastMode:true,maxDetectedFaces:1});setNative(true);}catch{setNative(false);}}
    setStatus('live');void scan();
   }catch{
    if(live){setStatus('blocked');callbacks.current.onFailure('Camera access denied. Use Simulate Visitor.');}
   }
  }
  async function scan(){
   if(!live)return;
   if(busy){tid=window.setTimeout(()=>void scan(),170);return;}
   busy=true;
   const v=video.current,cv=canvas.current;
   if(v&&v.readyState>=2&&cv&&bc){
    try{
     bc.drawImage(v,0,0,W,H);
     const raw=bc.getImageData(0,0,W,H).data;
     const gray=new Uint8Array(W*H);
     for(let i=0;i<gray.length;i++){
      const k=i*4;
      gray[i]=(raw[k]*77+raw[k+1]*150+raw[k+2]*29)>>8;
     }
     const cells:{x:number;y:number;score:number}[]=[];
     let energy=0;
     if(previous){
      for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
       let sum=0,count=0;
       for(let y=row*CELL;y<(row+1)*CELL;y+=2)for(let x=col*CELL;x<(col+1)*CELL;x+=2){
        const index=y*W+x;
        sum+=Math.abs(gray[index]-previous[index]);count++;
       }
       const score=sum/count;
       energy+=score;
       if(score>16)cells.push({x:col,y:row,score});
      }
     }
     previous=gray;
     const now=Date.now();
     const overall=energy/(COLS*ROWS);
     const movement=cells.length>=9&&cells.length<=122&&overall>2.6&&overall<24;

     if(resetBackground.current){
      resetBackground.current=false;
      background=null;
      referenceFrames=0;
      lastSeen=0;
      if(wasPresent){
       wasPresent=false;setSignal(false);
       callbacks.current.onPresence(false,'calibration reset');
      }
     }
     if(!background)background=Float32Array.from(gray);
     referenceFrames++;

     // Motion detects entry; comparison against a slow-learning empty scene
     // keeps a stationary visitor visible after movement has stopped.
     // Global brightness shift is removed to suppress exposure flicker.
     let meanShift=0,shiftCount=0;
     for(let k=0;k<gray.length;k+=13){
      meanShift+=gray[k]-background[k];shiftCount++;
     }
     meanShift/=Math.max(1,shiftCount);
     let foreground=0;
     const localXMin=2,localXMax=14,localYMin=1,localYMax=11;
     for(let row=localYMin;row<localYMax;row++){
      for(let col=localXMin;col<localXMax;col++){
       let diff=0,count=0;
       for(let y=row*CELL;y<(row+1)*CELL;y+=2){
        for(let x=col*CELL;x<(col+1)*CELL;x+=2){
         const k=y*W+x;
         diff+=Math.abs(gray[k]-background[k]-meanShift);count++;
        }
       }
       if(diff/count>17)foreground++;
      }
     }
     const occupied=referenceFrames>3&&foreground>=18&&foreground<=111&&Math.abs(meanShift)<45;
     if(detector&&now>=nextFaceCheck){
      nextFaceCheck=now+1350;
      try{faces=await detector.detect(v);if(faces.length)faceAt=Date.now();}
      catch{detector=null;faces=[];setNative(false);}
     }
     if(!live)return;
     const found=faces.length>0&&Date.now()-faceAt<1600;
     const steady=wasPresent&&occupied;
     if(found||movement||steady)lastSeen=now;
     const nowPresent=found||steady||(lastSeen>0&&now-lastSeen<6500);
     if(nowPresent!==wasPresent){
      wasPresent=nowPresent;setSignal(nowPresent);
      callbacks.current.onPresence(nowPresent,found?'face':steady?'stationary occupancy':'motion');
     }
     if(!nowPresent&&!movement){
      // Learn empty-scene lighting slowly; freeze it when a visitor enters.
      const alpha=referenceFrames<20?0.016:0.003;
      for(let k=0;k<gray.length;k++)background[k]+=alpha*(gray[k]-background[k]);
     }
     if(config.current.gesturesEnabled){
      // Compare movement in a hand-height zone. Ignore large, diffuse frame changes
      // (body turns, camera exposure shifts) rather than counting every motion as a swipe.
      const candidates=cells.filter(c=>c.y>=3&&c.y<=10&&c.x>=1&&c.x<=14&&c.score>=18);
      const validBlob=candidates.length>=4&&candidates.length<=52&&cells.length<=80&&overall<19;
      if(now-lastGestureAt<1450){
       trail=[];
      }else if(validBlob){
       let sumX=0,sumY=0,sumW=0;
       for(const c of candidates){
        const weight=Math.min(c.score,85);
        sumX+=(c.x+.5)*weight;sumY+=(c.y+.5)*weight;sumW+=weight;
       }
       const rawX=sumX/sumW/COLS,rawY=sumY/sumW/ROWS;
       const prev=trail[trail.length-1];
       // Smooth jitter without delaying the real directional movement very much.
       let p:Sample={time:now,x:prev?prev.x*.15+rawX*.85:rawX,y:prev?prev.y*.15+rawY*.85:rawY};
       if(prev&&(now-prev.time>430||Math.abs(prev.y-rawY)>.26||Math.abs(prev.x-rawX)>.42)){
        trail=[];
        p={time:now,x:rawX,y:rawY};
       }
       trail.push(p);
       trail=trail.filter(x=>now-x.time<=1200).slice(-8);
       if(trail.length>=3){
        const first=trail[0],dx=p.x-first.x,dy=p.y-first.y,elapsed=now-first.time;
        const sign=Math.sign(dx);
        let forward=0,backward=0,forwardDistance=0,backwardDistance=0;
        for(let i=1;i<trail.length;i++){
         const step=trail[i].x-trail[i-1].x;
         if(step*sign>.018){forward++;forwardDistance+=Math.abs(step);}
         else if(step*sign<-.035){backward++;backwardDistance+=Math.abs(step);}
        }
        const coherence=forwardDistance/(forwardDistance+backwardDistance+.0001);
        // Symmetric thresholds: a visitor-facing left swipe produces positive
        // camera-image X movement because the camera preview is mirrored.
        if(elapsed>=220&&elapsed<=1170
          &&Math.abs(dx)>=.27&&Math.abs(dy)<.19
          &&forward>=2&&backward<=1&&coherence>=.78
          &&Math.abs(dx)/elapsed*1000>.22){
         const dir:Swipe=dx>0?'left':'right';
         const quality=Math.round(Math.max(50,Math.min(95,55+Math.abs(dx)*65+(coherence-.78)*40-Math.abs(dy)*30)));
         lastGestureAt=now;trail=[];
         setLastSwipe((dir==='left'?'← LEFT':'RIGHT →')+' · '+quality);
         callbacks.current.onGesture(dir,quality);
        }
       }
      }else{
       // Do not let large body motion bridge two isolated hand trajectories.
       if(!validBlob||trail.length&&now-trail[trail.length-1].time>410)trail=[];
      }
     }else{
      trail=[];
     }
     if(now-lastDisplay>380){
      lastDisplay=now;
      setFace(found);
      setActiveCells(cells.length);
      setActivity(Math.round(cells.length/(COLS*ROWS)*100));
      setOccupancy(Math.round(foreground/(12*10)*100));
      setStillPresence(steady&&!movement&&!found);
      setPresenceVia(found?'FACE':steady?'STILL PRESENCE':movement?'MOTION':nowPresent?'HOLD':'EMPTY');
      callbacks.current.onTelemetry(Math.round(overall),found);
     }
     const ctx=cv.getContext('2d');
     if(ctx){
      if(cv.width!==320||cv.height!==240){cv.width=320;cv.height=240;}
      ctx.clearRect(0,0,320,240);
      ctx.lineWidth=.7;
      ctx.strokeStyle=config.current.gesturesEnabled?'rgba(135,230,244,.21)':'rgba(137,207,255,.14)';
      for(let x=20;x<320;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,240);ctx.stroke();}
      for(let y=20;y<240;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(320,y);ctx.stroke();}
      for(const c of cells){
       const x=(c.x+.5)*20,y=(c.y+.5)*20;
       const radius=Math.min(4.3,1.3+c.score/22);
       ctx.fillStyle=c.y>=3&&c.y<=10&&config.current.gesturesEnabled?'rgba(158,255,201,.96)':'rgba(123,222,255,.89)';
       ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
      }
      if(config.current.gesturesEnabled){
       ctx.strokeStyle='rgba(143,252,206,.58)';ctx.setLineDash([7,6]);
       ctx.strokeRect(20,60,280,160);
       ctx.setLineDash([]);
      }
      if(found){
       const sx=320/Math.max(1,v.videoWidth),sy=240/Math.max(1,v.videoHeight);
       ctx.strokeStyle='#a7ffe8';ctx.fillStyle='#a7ffe8';ctx.lineWidth=1.8;
       for(const item of faces){
        const f=item.boundingBox;ctx.strokeRect(f.x*sx,f.y*sy,f.width*sx,f.height*sy);
        for(const landmark of item.landmarks||[]){ctx.beginPath();ctx.arc(landmark.location.x*sx,landmark.location.y*sy,2.7,0,Math.PI*2);ctx.fill();}
       }
      }
      ctx.strokeStyle='rgba(133,205,255,.42)';ctx.lineWidth=1;ctx.strokeRect(6,6,308,228);
     }
    }catch{/* Ignore transient frame-read errors; next sample recovers. */}
   }
   busy=false;
   if(live)tid=window.setTimeout(()=>void scan(),160);
  }
  void start();
  return()=>{
   live=false;window.clearTimeout(tid);
   stream?.getTracks().forEach(t=>t.stop());
   if(video.current)video.current.srcObject=null;
   if(wasPresent)callbacks.current.onPresence(false,'camera stopped');
  };
 },[enabled]);

 return <div className="vision-module">
  <div className="vision-preview">
   {enabled&&status!=='blocked'?<><video ref={video} className="vision-feed" muted autoPlay playsInline/><canvas ref={canvas} className="vision-data-overlay"/><span className="vision-scanline"/><span className="vision-telemetry">{status==='starting'?'STARTING SENSOR':gesturesEnabled?'AIR SWIPE · MOTION TRACKING':face?'FACE BOX + GRID':'HIGH-DENSITY GRID LIVE'}</span></>:<div className="no-camera"><ScanFace size={52} strokeWidth={1.1}/><span>{status==='blocked'?'CAMERA BLOCKED':'CAMERA OFFLINE'}</span></div>}
   <div className="camera-frame tl"/><div className="camera-frame tr"/><div className="camera-frame bl"/><div className="camera-frame br"/>
  </div>
  <div className="vision-state"><span className={enabled&&status==='live'?'live-dot':'offline-dot'}/>{status==='live'?(signal?(stillPresence?'STILL VISITOR DETECTED':'PRESENCE SIGNAL'):'SCANNING FOR ACTIVITY'):status==='starting'?'STARTING SENSOR':'CAMERA PERMISSION REQUIRED'}</div>
  <div className="vision-readouts">
   <div><small>SENSOR DENSITY</small><strong>16 × 12 · 192 zones</strong></div>
   <div><small>ACTIVE MOTION CELLS</small><strong>{enabled&&status==='live'?activeCells:'—'}</strong></div>
   <div><small>MOTION COVERAGE</small><strong>{enabled&&status==='live'?activity+'%':'—'}</strong></div><div><small>SCENE OCCUPANCY ESTIMATE</small><strong>{enabled&&status==='live'?occupancy+'%':'—'}</strong></div><div><small>PRESENCE SOURCE</small><strong>{enabled&&status==='live'?presenceVia:'—'}</strong></div>
   <div><small>AIR SWIPE</small><strong>{gesturesEnabled?(enabled&&status==='live'?lastSwipe:'WAITING'):'OFF · CLASSIC MODE'}</strong></div>
  </div>
  <p className="monitor-help">{native?'Native face detection can hold presence when someone is still. ':'Presence is estimated from motion followed by background occupancy; this is not guaranteed person recognition. '}Start with an empty camera view for best results, then step into frame. Recalibrate when the view is empty after moving the camera. No identity, age or emotion inference. Video stays on this device.</p>
 </div>;
}
