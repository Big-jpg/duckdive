"use client";

import {useEffect,useRef} from "react";
import type {JourneyFile} from "@/lib/journey-state";

function number(value:string){let result=0;for(const character of value)result=(result*31+character.charCodeAt(0))>>>0;return result;}

export default function LakeScene({files,seed}:{files:readonly JourneyFile[];seed:number}){
  const canvasRef=useRef<HTMLCanvasElement>(null),filesRef=useRef(files);
  useEffect(()=>{filesRef.current=files;},[files]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;const context=canvas.getContext("2d");if(!context)return;
    let frame=0,width=0,height=0;const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches,duck=new Image();duck.src="/duckdive-icon.svg";
    const resize=()=>{const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);width=rect.width;height=rect.height;canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));context.setTransform(ratio,0,0,ratio,0,0);};
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    const draw=(time:number)=>{
      context.clearRect(0,0,width,height);const cx=width/2,cy=height*.5,rx=width*.46,ry=height*.38;
      const water=context.createRadialGradient(cx,cy*.82,20,cx,cy,rx);water.addColorStop(0,"#28375c");water.addColorStop(1,"#11172f");context.fillStyle=water;context.beginPath();context.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);context.fill();
      context.strokeStyle="rgba(235,197,112,.42)";context.lineWidth=1;for(let line=0;line<5;line++){const phase=reduced?0:Math.sin(time/900+line)*5;context.beginPath();context.ellipse(cx+phase,cy+line*12-24,60+line*35,12+line*3,0,0,Math.PI*2);context.stroke();}
      context.fillStyle="rgba(238,207,140,.72)";for(let item=0;item<10;item++){const x=(number(`${seed}-${item}`)%900)/1000*width+width*.05,y=height*.18+(number(`${item}-${seed}`)%620)/1000*height*.62;context.fillRect(x,y,2+(item%3)*5,1);}
      const visible=filesRef.current.filter(file=>file.status!=="lake_ready").slice(-7);visible.forEach((file,index)=>{const hash=number(file.id),x=width*.2+(hash%600)/1000*width,y=height*.31+((hash>>4)%350)/1000*height;context.save();context.translate(x,y+(reduced?0:Math.sin(time/500+index)*4));context.rotate(((hash%9)-4)*.025);context.fillStyle=file.status==="transforming"?"rgba(255,211,74,.35)":"#fff5d7";context.strokeStyle="#171a35";context.lineWidth=1.5;context.fillRect(-19,-15,38,30);context.strokeRect(-19,-15,38,30);context.fillStyle="#171a35";context.font="700 8px ui-monospace, monospace";context.textAlign="center";context.fillText(file.extension.slice(0,5),0,4);context.restore();});
      const active=filesRef.current.find(file=>file.status==="diving"||file.status==="transforming"),duckY=active&&active.status==="transforming"?height*.69:height*.42+(reduced?0:Math.sin(time/650)*5);if(duck.complete){context.globalAlpha=active?.status==="transforming"?.3:1;context.drawImage(duck,cx-27,duckY-27,54,54);context.globalAlpha=1;}
      frame=requestAnimationFrame(draw);
    };frame=requestAnimationFrame(draw);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[seed]);
  return <canvas ref={canvasRef} className="lake-canvas" aria-hidden="true"/>;
}
