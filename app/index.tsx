import React, { useEffect, useState } from 'react';
import { View, Text, Platform, useWindowDimensions, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import Svg, { Path, Circle, G, Text as ST, Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSheetData, Project, SheetData } from '../hooks/useSheetData';

const D = {
  bg:'#0c0d14', panel:'#111220', card:'#161724', border:'#20223a',
  text:'#dfe0ef', sub:'#7878a0', muted:'#404058',
  green:'#4caf7d', greenDim:'#0d2118',
  red:'#e05c5c',   redDim:'#200e0e',
  yellow:'#d4a843',yellowDim:'#211a08',
  blue:'#5b9bd5',  blueDim:'#0a1a2e',
  accent:'#7c78c8',accentDim:'#151430',
  orange:'#d4845a',orangeDim:'#1e1008',
};

const fmt$M=(v:number)=>v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${v}`;
const fmtP=(v:number)=>`${Math.round(v)}%`;
function sCol(s:string){return['On Track','Active','Resolved','Done'].includes(s)?D.green:['Delayed','Open'].includes(s)?D.red:D.blue;}
function iCol(v:number){return v>=1?D.green:D.red;}

// ── Live clock ──────────────────────────────────────────────────
function Clock(){
  const [t,setT]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(id);},[]);
  return<Text style={{color:D.muted,fontSize:12,fontWeight:'600',letterSpacing:1}}>{t.toLocaleTimeString()}</Text>;
}

// ── Section label ───────────────────────────────────────────────
function SL({label,color=D.sub}:{label:string;color?:string}){
  return(
    <View style={{flexDirection:'row',alignItems:'center',gap:5,marginBottom:6}}>
      <View style={{width:3,height:14,backgroundColor:color}}/>
      <Text style={{fontSize:10,fontWeight:'800',color,letterSpacing:1.5}}>{label}</Text>
    </View>
  );
}

// ── Big Arc Gauge ────────────────────────────────────────────────
function ArcGauge({pct,color,size=140,label,sublabel,plan}:{pct:number;color:string;size?:number;label?:string;sublabel?:string;plan?:number}){
  const cx=size/2,cy=size*0.62,r=size*0.38,sw=size*0.11;
  const p=Math.min(1,Math.max(0,pct/100));
  const toRad=(d:number)=>d*Math.PI/180;
  const S=210,ARC=240;
  function apt(deg:number){return{x:cx+r*Math.cos(toRad(deg)),y:cy+r*Math.sin(toRad(deg))};}
  function ap(f:number,t:number){const s=apt(f),e=apt(t),lg=t-f>180?1:0;return`M${s.x},${s.y} A${r},${r} 0 ${lg} 1 ${e.x},${e.y}`;}
  const SEGS=[{f:210,t:258,c:'#e53935'},{f:258,t:306,c:'#fb8c00'},{f:306,t:354,c:'#fdd835'},{f:354,t:402,c:'#7cb342'},{f:402,t:450,c:'#3d9e6a'}];
  const endD=S+ARC*p;
  const nr=toRad(endD),nL=r*0.8;
  const tx=cx+nL*Math.cos(nr),ty=cy+nL*Math.sin(nr);
  const br=toRad(endD+90),bw=sw*0.13;
  const b1x=cx+bw*Math.cos(br),b1y=cy+bw*Math.sin(br),b2x=cx-bw*Math.cos(br),b2y=cy-bw*Math.sin(br);
  const ticks=[0,25,50,75,100];
  // Plan needle
  const planD=plan!=null?S+ARC*(Math.min(100,Math.max(0,plan))/100):null;
  return(
    <View style={{alignItems:'center'}}>
      <Svg width={size} height={size*0.74}>
        <Path d={ap(S,S+ARC)} fill="none" stroke={D.border} strokeWidth={sw} strokeLinecap="butt"/>
        {SEGS.map((sg,i)=><Path key={i} d={ap(sg.f,sg.t)} fill="none" stroke={sg.c} strokeWidth={sw} opacity={0.22} strokeLinecap="butt"/>)}
        {p>0.001&&<Path d={ap(S,endD)} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="butt"/>}
        {ticks.map(t=>{const deg=S+(t/100)*ARC,rad=toRad(deg),lx=cx+(r+sw*1.35)*Math.cos(rad),ly=cy+(r+sw*1.35)*Math.sin(rad);return<ST key={t} x={lx} y={ly+3} textAnchor="middle" fontSize={size*0.075} fill={D.muted}>{t}</ST>;})}
        {/* Plan needle */}
        {planD!=null&&(()=>{const prad=toRad(planD),plen=r*0.65,ptx=cx+plen*Math.cos(prad),pty=cy+plen*Math.sin(prad);return<Path d={`M${cx},${cy} L${ptx},${pty}`} stroke={D.yellow} strokeWidth={2} strokeDasharray="3,2"/>;})()}
        <Path d={`M${b1x},${b1y} L${tx},${ty} L${b2x},${b2y} Z`} fill={D.text}/>
        <Circle cx={cx} cy={cy} r={sw*0.3} fill={D.text}/>
        <ST x={cx} y={cy+r*0.26} textAnchor="middle" fontSize={size*0.16} fontWeight="800" fill={color}>{label??fmtP(pct)}</ST>
        {sublabel&&<ST x={cx} y={cy+r*0.48} textAnchor="middle" fontSize={size*0.09} fill={D.muted}>{sublabel}</ST>}
      </Svg>
    </View>
  );
}

// ── Mini Donut ────────────────────────────────────────────────────
function Donut({slices,size=70,label}:{slices:{value:number;color:string}[];size?:number;label?:string}){
  const total=slices.reduce((s,d)=>s+d.value,0)||1;
  const cx=size/2,cy=size/2,r=size*0.33,sw=size*0.18;
  let angle=-Math.PI/2;
  return(
    <Svg width={size} height={size}>
      {slices.map((sl,i)=>{
        const sweep=(sl.value/total)*2*Math.PI;
        const x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle);
        angle+=sweep;
        const x2=cx+r*Math.cos(angle),y2=cy+r*Math.sin(angle);
        const lg=sweep>Math.PI?1:0;
        if(sl.value===0)return null;
        if(Math.abs(sl.value-total)<0.001)return<Circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={sl.color} strokeWidth={sw}/>;
        return<Path key={i} d={`M${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2}`} fill="none" stroke={sl.color} strokeWidth={sw} strokeLinecap="butt"/>;
      })}
      {label&&<ST x={cx} y={cy+4} textAnchor="middle" fontSize={size*0.2} fontWeight="700" fill={D.text}>{label}</ST>}
    </Svg>
  );
}

// ── Sparkline ────────────────────────────────────────────────────
function Spark({data,color,w,h=36,filled=true}:{data:number[];color:string;w:number;h?:number;filled?:boolean}){
  if(data.length<2)return null;
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const pd=4,cw=w-pd*2,ch=h-pd*2;
  const pts=data.map((v,i)=>({x:pd+(i/(data.length-1))*cw,y:pd+(1-(v-mn)/rng)*ch}));
  const d=pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
  const area=`${d} L${pts[pts.length-1].x},${pd+ch} L${pts[0].x},${pd+ch} Z`;
  return(
    <Svg width={w} height={h}>
      {filled&&<Path d={area} fill={color} opacity={0.12}/>}
      <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
      <Circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={3} fill={color}/>
    </Svg>
  );
}

// ── S-Curve ──────────────────────────────────────────────────────
function SCurve({planned,actual,labels,w,h=90}:{planned:number[];actual:number[];labels:string[];w:number;h?:number}){
  const all=[...planned,...actual];
  const mn=Math.min(...all),mx=Math.max(...all),rng=mx-mn||1;
  const padL=28,padR=6,padT=8,padB=20;
  const cw=w-padL-padR,ch=h-padT-padB;
  const n=labels.length;
  function toP(v:number,i:number){return{x:padL+(i/(n-1))*cw,y:padT+(1-(v-mn)/rng)*ch};}
  function pth(vals:number[]){return vals.map((v,i)=>`${i===0?'M':'L'}${toP(v,i).x},${toP(v,i).y}`).join(' ');}
  function area(vals:number[]){const pts=vals.map((v,i)=>toP(v,i));const l=pts[pts.length-1],f=pts[0];return`${pth(vals)} L${l.x},${padT+ch} L${f.x},${padT+ch} Z`;}
  const yTicks=[0,50,100];
  return(
    <Svg width={w} height={h}>
      {yTicks.map(t=>{const y=padT+(1-t/100)*ch;return<G key={t}><Line x1={padL} y1={y} x2={w-padR} y2={y} stroke={D.border} strokeWidth={0.5}/><ST x={padL-3} y={y+4} textAnchor="end" fontSize={8} fill={D.muted}>{t}</ST></G>;})}
      <Path d={area(planned)} fill={D.yellow} opacity={0.07}/>
      <Path d={pth(planned)} fill="none" stroke={D.yellow} strokeWidth={1.5} strokeDasharray="4,3"/>
      <Path d={area(actual)} fill={D.blue} opacity={0.12}/>
      <Path d={pth(actual)} fill="none" stroke={D.blue} strokeWidth={2}/>
      {actual.map((v,i)=>{const p=toP(v,i);return<Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={D.blue}/>;} )}
      {labels.map((l,i)=>{const p=toP(0,i);return<ST key={i} x={p.x} y={h-4} textAnchor="middle" fontSize={8} fill={D.muted}>{l}</ST>;})}
    </Svg>
  );
}

// ── Column Chart (vertical labels) ──────────────────────────────
function ColChart({data,colors,w,h=100,showVals=true,labelSize=11}:{
  data:{label:string;value:number}[];colors?:string[];
  w:number;h?:number;showVals?:boolean;labelSize?:number;
}){
  if(!data.length)return null;
  const max=Math.max(...data.map(d=>d.value),1);
  const padL=6,padR=6,padT=showVals?26:8,padB=6;
  const cw=w-padL-padR,ch=h-padT-padB;
  const bw=Math.max(14,Math.floor((cw/data.length)*0.78));
  const gap=cw/data.length;
  return(
    <Svg width={w} height={h}>
      <Line x1={padL} y1={padT+ch} x2={w-padR} y2={padT+ch} stroke={D.border} strokeWidth={1}/>
      {data.map((d,i)=>{
        const bh=Math.max(20,(d.value/max)*ch);
        const cx=padL+gap*i+gap/2;
        const x=cx-bw/2;
        const y=padT+ch-bh;
        const c=colors?colors[i%colors.length]:D.blue;
        // Value above bar
        const valY=y-5;
        // Label centered inside bar vertically
        const labelMidY=y+bh/2;
        const fs=Math.max(labelSize,bw*0.36);
        return(
          <G key={i}>
            <Rect x={x} y={y} width={bw} height={bh} fill={c} opacity={0.88} rx={2}/>
            {/* Value above */}
            {showVals&&(
              <ST x={cx} y={valY} textAnchor="middle" fontSize={Math.max(11,bw*0.42)} fill={c} fontWeight="900">{d.value}</ST>
            )}
            {/* Label inside bar, rotated -90, vertically centered */}
            {bh>18&&(
              <ST
                x={0} y={0}
                fontSize={fs}
                fill={D.bg}
                fontWeight="700"
                transform={`translate(${cx},${labelMidY}) rotate(-90)`}
                textAnchor="middle"
              >{d.label}</ST>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ── HBars ────────────────────────────────────────────────────────
function HBars({data,color,w,compact=false}:{data:{label:string;value:number}[];color:string;w:number;compact?:boolean}){
  const max=Math.max(...data.map(d=>d.value),1);
  const fs=compact?12:13;
  return(
    <View style={{gap:compact?4:6}}>
      {data.map((d,i)=>(
        <View key={i} style={{gap:2}}>
          <View style={{flexDirection:'row',justifyContent:'space-between'}}>
            <Text style={{fontSize:fs,color:D.text}} numberOfLines={1}>{d.label}</Text>
            <Text style={{fontSize:fs,color:color,fontWeight:'800'}}>{d.value}</Text>
          </View>
          <View style={{height:compact?5:6,backgroundColor:D.border,width:w}}>
            <View style={{height:compact?5:6,width:Math.max(4,(d.value/max)*w) as any,backgroundColor:color}}/>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Gantt strip ─────────────────────────────────────────────────
function GanttStrip({milestones,w,h=70}:{milestones:any[];w:number;h?:number}){
  if(!milestones.length)return null;
  const phases=[...new Set(milestones.map((m:any)=>m.phase))] as string[];
  const rowH=Math.floor(h/phases.length);
  const colW=Math.floor(w/milestones.length);
  const statColor=(s:string)=>s==='Done'?D.green:s==='In Progress'?D.blue:s==='Delayed'?D.red:D.muted;
  return(
    <Svg width={w} height={h}>
      {phases.map((phase,pi)=>{
        const ms=milestones.filter((m:any)=>m.phase===phase);
        const done=ms.filter((m:any)=>m.status==='Done').length;
        const pct=ms.length>0?done/ms.length:0;
        const y=pi*rowH+2;
        const barW=Math.max(4,pct*(w-60));
        return(
          <G key={pi}>
            <ST x={2} y={y+rowH*0.65} fontSize={9} fill={D.sub}>{phase.slice(0,8)}</ST>
            <Rect x={58} y={y+3} width={w-62} height={rowH-6} fill={D.border} opacity={0.4} rx={2}/>
            <Rect x={58} y={y+3} width={barW} height={rowH-6} fill={pct===1?D.green:D.blue} opacity={0.85} rx={2}/>
            <ST x={w-2} y={y+rowH*0.65} textAnchor="end" fontSize={9} fill={pct===1?D.green:D.blue} fontWeight="700">{Math.round(pct*100)}%</ST>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Metric box ──────────────────────────────────────────────────
function MBox({label,value,color=D.text,sub}:{label:string;value:string;color?:string;sub?:string}){
  return(
    <View style={{flex:1,backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:8,alignItems:'center',justifyContent:'center',minHeight:52}}>
      <Text style={{fontSize:10,color:D.muted,letterSpacing:1,textTransform:'uppercase',marginBottom:2}}>{label}</Text>
      <Text style={{fontSize:20,fontWeight:'900',color,lineHeight:22}}>{value}</Text>
      {sub&&<Text style={{fontSize:9,color:D.muted,marginTop:1}}>{sub}</Text>}
    </View>
  );
}

// ── Camera feed ─────────────────────────────────────────────────
function CamFeed({name,w,h,camIndex}:{name:string;w:number;h:number;camIndex:number}){
  const [t,setT]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(id);},[]);

  // Camera sources per project index
  const CAM_SRCS: Record<number, {src:string;title:string}> = {
    0: {
      src: 'https://www.youtube.com/embed/dmEq_ddk0kw?autoplay=1&mute=1&controls=0&rel=0&loop=1&playlist=dmEq_ddk0kw',
      title: 'Site Camera 1',
    },
    1: {
      src: 'https://www.youtube.com/embed/f_0KKz6pY_8?autoplay=1&mute=1&controls=0&rel=0&loop=1&playlist=f_0KKz6pY_8',
      title: 'Site Camera 2',
    },
    2: {
      src: 'https://www.youtube.com/embed/t-NAp1XIDIc?autoplay=1&mute=1&controls=0&rel=0&loop=1&playlist=t-NAp1XIDIc',
      title: 'Site Camera 3',
    },
  };

  const cam = CAM_SRCS[camIndex] ?? CAM_SRCS[0];

  if(Platform.OS !== 'web'){
    // Mobile fallback — placeholder
    return(
      <View style={{width:w,height:h,backgroundColor:'#000',borderWidth:1,borderColor:D.border,alignItems:'center',justifyContent:'center'}}>
        <Text style={{color:D.muted,fontSize:11,letterSpacing:2}}>CAM FEED</Text>
        <Text style={{color:D.border,fontSize:9,marginTop:4}}>{cam.title}</Text>
      </View>
    );
  }

  return(
    <View style={{width:w,height:h,backgroundColor:'#000',borderWidth:1,borderColor:D.border,overflow:'hidden',position:'relative'}}>
      {/* Top overlay bar */}
      <View style={{position:'absolute',top:0,left:0,right:0,flexDirection:'row',alignItems:'center',
        justifyContent:'space-between',paddingHorizontal:10,paddingVertical:5,
        backgroundColor:'rgba(0,0,0,0.72)',zIndex:2,pointerEvents:'none'}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:5}}>
          <View style={{width:7,height:7,borderRadius:3.5,backgroundColor:D.red}}/>
          <Text style={{color:D.text,fontSize:11,fontWeight:'700',letterSpacing:1}}>LIVE</Text>
        </View>
        <Text style={{color:D.sub,fontSize:10,letterSpacing:1}}>{name.toUpperCase()}</Text>
        <Text style={{color:D.muted,fontSize:10}}>{t.toLocaleTimeString()}</Text>
      </View>
      {/* iframe */}
      <iframe
        src={cam.src}
        title={cam.title}
        style={{width:'100%',height:'100%',border:'none',display:'block'}}
        allow="autoplay; fullscreen; picture-in-picture; accelerometer; clipboard-write; encrypted-media; gyroscope; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="eager"
      />
      {/* Corner brackets */}
      {([{top:8,left:8},{top:8,right:8},{bottom:8,left:8},{bottom:8,right:8}] as any[]).map((pos,i)=>(
        <View key={i} style={{position:'absolute',...pos,width:16,height:16,
          borderTopWidth:pos.top!==undefined?1.5:0,borderBottomWidth:pos.bottom!==undefined?1.5:0,
          borderLeftWidth:pos.left!==undefined?1.5:0,borderRightWidth:pos.right!==undefined?1.5:0,
          borderColor:D.accent,pointerEvents:'none',zIndex:3}}/>
      ))}
    </View>
  );
}
// ── LEFT column dashboard ───────────────────────────────────────
function LeftDash({p,data,w,h,fs=14}:{p:Project;data:SheetData;w:number;h:number;fs?:number}){
  const prog=Number(p.progress_pct),cpi=Number(p.cpi),spi=Number(p.spi);
  const spent=Number(p.spent_to_date_usd),total=Number(p.total_budget_usd);
  const bPct=total>0?(spent/total)*100:0;

  const workers=data.workers.filter(wr=>wr.project_id===p.project_id);
  const active=workers.filter(wr=>wr.status==='Active').length;
  const byDept:Record<string,number>={};
  workers.forEach(wr=>{byDept[wr.department]=(byDept[wr.department]??0)+1;});
  const depts=Object.entries(byDept).sort((a,b)=>b[1]-a[1]).slice(0,4);

  const evm=data.evm.filter(e=>e.project_id===p.project_id);
  const cpiTrend=evm.map(e=>Number(e.cpi)).filter(Boolean);
  const spiTrend=evm.map(e=>Number(e.spi)).filter(Boolean);

  const issues=data.issues.filter(i=>i.project_id===p.project_id);
  const openH=issues.filter(i=>i.status==='Open'&&i.priority==='High').length;
  const openM=issues.filter(i=>i.status==='Open'&&i.priority==='Medium').length;

  const gap=6;
  const innerW=w-20;
  const gaugeSize=Math.min(innerW*0.88, h*0.34);

  return(
    <View style={{width:w,height:h,padding:10,gap:gap,overflow:'hidden'}}>
      {/* Project name */}
      <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
        <View style={{width:8,height:8,borderRadius:4,backgroundColor:sCol(p.status)}}/>
        <Text style={{fontSize:10,color:sCol(p.status),fontWeight:'700',letterSpacing:1.5}}>{p.status.toUpperCase()}</Text>
        <Text style={{flex:1,fontSize:fs*1.1,fontWeight:'800',color:D.text}} numberOfLines={1}>{p.project_name}</Text>
      </View>

      {/* Big gauge + key metrics */}
      <View style={{flexDirection:'row',alignItems:'flex-start',gap:gap}}>
        <View style={{alignItems:'center'}}>
          <ArcGauge pct={prog} color={D.blue} size={gaugeSize} label={fmtP(prog)} sublabel="vs plan" plan={Math.max(prog-5,0)}/>
          <Text style={{fontSize:9,color:D.muted,marginTop:-4}}>OVERALL PROGRESS</Text>
        </View>
        <View style={{flex:1,gap:5}}>
          <View style={{flexDirection:'row',gap:5}}>
            <View style={{flex:1,backgroundColor:cpi>=1?D.greenDim:D.redDim,padding:7,alignItems:'center'}}>
              <Text style={{fontSize:fs*0.85,fontWeight:'800',color:iCol(cpi)}}>CPI</Text>
              <Text style={{fontSize:fs*1.8,fontWeight:'900',color:iCol(cpi)}}>{cpi}</Text>
            </View>
            <View style={{flex:1,backgroundColor:spi>=1?D.greenDim:D.redDim,padding:7,alignItems:'center'}}>
              <Text style={{fontSize:fs*0.85,fontWeight:'800',color:iCol(spi)}}>SPI</Text>
              <Text style={{fontSize:fs*1.8,fontWeight:'900',color:iCol(spi)}}>{spi}</Text>
            </View>
          </View>
          {/* CPI/SPI trend */}
          {cpiTrend.length>1&&(
            <View style={{backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:5,gap:3}}>
              <Text style={{fontSize:8,color:D.sub,letterSpacing:0.8}}>3-MONTH TREND</Text>
              <View style={{flexDirection:'row',gap:4,alignItems:'center'}}>
                <Spark data={cpiTrend.slice(-4)} color={iCol(cpi)} w={(innerW-gaugeSize-gap-10)*0.5} h={28}/>
                <Spark data={spiTrend.slice(-4)} color={iCol(spi)} w={(innerW-gaugeSize-gap-10)*0.5} h={28}/>
              </View>
              <View style={{flexDirection:'row',justifyContent:'space-around'}}>
                <Text style={{fontSize:8,color:iCol(cpi)}}>CPI</Text>
                <Text style={{fontSize:8,color:iCol(spi)}}>SPI</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Issues */}
      <View style={{flexDirection:'row',gap:gap}}>
        <MBox label="Open High" value={String(openH)} color={openH>0?D.red:D.green}/>
        <MBox label="Open Med." value={String(openM)} color={openM>0?D.orange:D.green}/>
        <MBox label="Workers" value={String(active)} color={D.green} sub={`of ${workers.length}`}/>
        <MBox label="Budget" value={fmtP(bPct)} color={bPct>90?D.red:bPct>75?D.orange:D.blue}/>
      </View>

      {/* Workforce by dept */}
      {depts.length>0&&(
        <View style={{backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:8,gap:5,flex:1}}>
          <SL label="WORKFORCE BY DEPT" color={D.green}/>
          <HBars data={depts.map(([l,v])=>({label:l,value:v}))} color={D.green} w={innerW-16} compact/>
        </View>
      )}
    </View>
  );
}

// ── RIGHT column dashboard ──────────────────────────────────────
function RightDash({p,data,w,h,fs=14}:{p:Project;data:SheetData;w:number;h:number;fs?:number}){
  const spent=Number(p.spent_to_date_usd),total=Number(p.total_budget_usd);
  const bPct=total>0?(spent/total)*100:0;

  const eq=data.equipment.filter(e=>e.project_id===p.project_id);
  const eqActive=eq.filter(e=>e.status==='Active').length;
  const eqMaint=eq.filter(e=>e.status==='Maintenance').length;
  const byType:Record<string,number>={};
  eq.forEach(e=>{byType[e.type]=(byType[e.type]??0)+1;});
  const types=Object.entries(byType).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const dailyCost=eq.filter(e=>e.status==='Active').reduce((s,e)=>s+Number(e.daily_cost_usd),0);
  const utilPct=eq.length>0?Math.round((eqActive/eq.length)*100):0;

  const pad=12;
  const innerW=w-pad*2;
  const gap=8;

  // Row proportions: gauge row | col chart | budget row
  const row1H=Math.floor(h*0.30);
  const row2H=Math.floor(h*0.42);
  const row3H=h-row1H-row2H-gap*2-pad*2;

  const gaugeSize=Math.min(row1H*1.1, innerW*0.45);

  return(
    <View style={{width:w,height:h,padding:pad,gap:gap,overflow:'hidden'}}>

      {/* ROW 1: Utilization gauge + Active/Maint/Cost big boxes */}
      <View style={{height:row1H,flexDirection:'row',gap:gap,alignItems:'stretch'}}>
        <View style={{alignItems:'center',justifyContent:'center',backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:8}}>
          <ArcGauge
            pct={utilPct}
            color={utilPct>70?D.blue:D.orange}
            size={gaugeSize}
            label={`${utilPct}%`}
            sublabel="utilization"
          />
        </View>
        <View style={{flex:1,gap:gap}}>
          <View style={{flex:1,flexDirection:'row',gap:gap}}>
            <View style={{flex:1,backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:10,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:fs*0.7,color:D.muted,letterSpacing:1,marginBottom:2}}>ACTIVE</Text>
              <Text style={{fontSize:fs*2,fontWeight:'900',color:D.blue,lineHeight:fs*2.2}}>{eqActive}</Text>
            </View>
            <View style={{flex:1,backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:10,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:fs*0.7,color:D.muted,letterSpacing:1,marginBottom:2}}>MAINT.</Text>
              <Text style={{fontSize:fs*2,fontWeight:'900',color:D.orange,lineHeight:fs*2.2}}>{eqMaint}</Text>
            </View>
          </View>
          <View style={{flex:1,flexDirection:'row',gap:gap}}>
            <View style={{flex:2,backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:10,justifyContent:'center'}}>
              <Text style={{fontSize:fs*0.7,color:D.muted,letterSpacing:1,marginBottom:2}}>DAILY COST</Text>
              <Text style={{fontSize:fs*1.6,fontWeight:'900',color:D.yellow}}>{fmt$M(dailyCost)}</Text>
            </View>
            <View style={{flex:1,backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:10,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:fs*0.7,color:D.muted,letterSpacing:1,marginBottom:2}}>TOTAL</Text>
              <Text style={{fontSize:fs*1.6,fontWeight:'900',color:D.sub}}>{eq.length}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ROW 2: Equipment by type — donut + legend */}
      {types.length>0&&(
        <View style={{height:row2H,backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:10,flexDirection:'row',gap:10}}>
          <View style={{alignItems:'center',justifyContent:'center'}}>
            <Donut
              slices={types.map(([l,v],i)=>({value:v,color:[D.blue,D.accent,D.green,D.orange,D.yellow,'#e91e63'][i%6]}))}
              size={Math.min(row2H-24, innerW*0.38)}
              label={String(eq.length)}
            />
          </View>
          <View style={{flex:1,justifyContent:'center',gap:Math.max(4,fs*0.35)}}>
            <SL label="EQUIPMENT BY TYPE" color={D.blue}/>
            {types.map(([l,v],i)=>{
              const col=[D.blue,D.accent,D.green,D.orange,D.yellow,'#e91e63'][i%6];
              const pct=eq.length>0?Math.round((v/eq.length)*100):0;
              return(
                <View key={l} style={{gap:2}}>
                  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:5,flex:1}}>
                      <View style={{width:8,height:8,backgroundColor:col,borderRadius:1}}/>
                      <Text style={{fontSize:fs*0.85,color:D.text,fontWeight:'600'}} numberOfLines={1}>{l}</Text>
                    </View>
                    <Text style={{fontSize:fs*0.85,color:col,fontWeight:'900',minWidth:20,textAlign:'right'}}>{v}</Text>
                  </View>
                  <View style={{height:3,backgroundColor:D.border}}>
                    <View style={{height:3,width:`${pct}%` as any,backgroundColor:col,opacity:0.8}}/>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ROW 3: Budget — горизонтально, 3 ячейки в ряд */}
      <View style={{height:row3H,flexDirection:'row',gap:gap}}>
        {[
          {label:'BUDGET USED', value:`${Math.round(bPct)}%`, color:bPct>90?D.red:bPct>75?D.orange:D.blue},
          {label:'SPENT',       value:fmt$M(spent),           color:D.text,  sub:fmt$M(total)},
          {label:'REMAINING',   value:fmt$M(Math.max(0,total-spent)), color:bPct>90?D.red:D.green},
        ].map(({label,value,color,sub})=>(
          <View key={label} style={{flex:1,backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:8,justifyContent:'center',alignItems:'center',overflow:'hidden'}}>
            <Text style={{fontSize:fs*0.65,color:D.muted,letterSpacing:0.8,marginBottom:2,textAlign:'center'}}>{label}</Text>
            <Text style={{fontSize:Math.min(fs*1.4, row3H*0.45),fontWeight:'900',color,textAlign:'center'}} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            {sub&&<Text style={{fontSize:fs*0.65,color:D.muted,marginTop:1}}>{sub}</Text>}
          </View>
        ))}
      </View>

    </View>
  );
}

// ── Project row ─────────────────────────────────────────────────
function ProjectRow({p,data,rowH,totalW,camIndex}:{p:Project;data:SheetData;rowH:number;totalW:number;camIndex:number}){
  const sideW=Math.floor(totalW*0.33);
  const midW=totalW-sideW*2-2;
  // fs: conservative — min of width-based and height-based, hard cap 16
  const fs=Math.max(9, Math.min(Math.floor(sideW/24), Math.floor(rowH/20), 16));
  return(
    <View style={{flexDirection:'row',height:rowH,overflow:'hidden'}}>
      <View style={{width:sideW,borderRightWidth:1,borderRightColor:D.border}}>
        <LeftDash p={p} data={data} w={sideW} h={rowH} fs={fs}/>
      </View>
      <View style={{width:midW}}>
        <CamFeed name={p.project_name} w={midW} h={rowH} camIndex={camIndex}/>
      </View>
      <View style={{width:sideW,borderLeftWidth:1,borderLeftColor:D.border}}>
        <RightDash p={p} data={data} w={sideW} h={rowH} fs={fs}/>
      </View>
    </View>
  );
}

// ── Main ────────────────────────────────────────────────────────
export default function HomeScreen(){
  const {data,loading,error,refresh}=useSheetData();
  const {width,height}=useWindowDimensions();
  const router=useRouter();
  const isTV=Platform.OS==='web'&&width>=900;

  if(loading)return(
    <View style={{flex:1,backgroundColor:D.bg,alignItems:'center',justifyContent:'center'}}>
      <Text style={{color:D.muted,fontSize:20,letterSpacing:4}}>LOADING DATA...</Text>
    </View>
  );
  if(error||!data)return(
    <View style={{flex:1,backgroundColor:D.bg,alignItems:'center',justifyContent:'center',gap:16}}>
      <Text style={{color:D.red,fontSize:16}}>⚠ {error??'No data'}</Text>
      <TouchableOpacity onPress={refresh} style={{padding:12,backgroundColor:D.card,borderWidth:1,borderColor:D.border}}>
        <Text style={{color:D.text}}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if(isTV){
    const n=Math.min(data.projects.length,3);
    const rowH=Math.floor(height/n);
    return(
      <View style={{flex:1,backgroundColor:D.bg,height}}>
        <Stack.Screen options={{headerShown:false}}/>
        {data.projects.slice(0,n).map((p,i)=>(
          <React.Fragment key={p.project_id}>
            <ProjectRow p={p} data={data} rowH={rowH} totalW={width} camIndex={i}/>
            {i<n-1&&<View style={{height:1,backgroundColor:D.border}}/>}
          </React.Fragment>
        ))}
      </View>
    );
  }

  // Mobile
  return(
    <ScrollView style={{flex:1,backgroundColor:D.bg}} contentContainerStyle={{padding:14,gap:12}}>
      <Stack.Screen options={{headerShown:true,title:'ISKER',headerTitleAlign:'center',
        headerStyle:{backgroundColor:D.panel},
        headerTitleStyle:{color:D.text,fontWeight:'800',fontSize:16,letterSpacing:3},
        headerShadowVisible:false}}/>
      {data.projects.map(p=>{
        const prog=Number(p.progress_pct),cpi=Number(p.cpi);
        return(
          <TouchableOpacity key={p.project_id}
            style={{backgroundColor:D.card,borderWidth:1,borderColor:D.border,padding:14,gap:10}}
            onPress={()=>router.push({pathname:'/project/[id]',params:{id:p.project_id}})}>
            <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
              <View style={{width:8,height:8,borderRadius:4,backgroundColor:sCol(p.status)}}/>
              <Text style={{color:sCol(p.status),fontSize:10,fontWeight:'700',letterSpacing:1}}>{p.status.toUpperCase()}</Text>
            </View>
            <Text style={{color:D.text,fontSize:16,fontWeight:'800'}}>{p.project_name}</Text>
            <Text style={{color:D.muted,fontSize:11}}>{p.location}</Text>
            <View style={{alignItems:'center'}}>
              <ArcGauge pct={prog} color={D.blue} size={120} label={fmtP(prog)} sublabel="progress"/>
            </View>
            <View style={{flexDirection:'row',gap:8}}>
              <View style={{flex:1,backgroundColor:cpi>=1?D.greenDim:D.redDim,padding:8,alignItems:'center'}}>
                <Text style={{fontSize:14,fontWeight:'800',color:iCol(cpi)}}>CPI {cpi}</Text>
              </View>
              <View style={{flex:1,backgroundColor:Number(p.spi)>=1?D.greenDim:D.redDim,padding:8,alignItems:'center'}}>
                <Text style={{fontSize:14,fontWeight:'800',color:iCol(Number(p.spi))}}>SPI {p.spi}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
