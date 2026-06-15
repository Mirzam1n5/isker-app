import React, { useEffect, useState, createContext, useContext } from 'react';
import { View, Text, Platform, useWindowDimensions, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import Svg, { Path, Circle, G, Text as ST, Line, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useSheetData, SheetData, Project, Worker, BudgetRow, Milestone, EvmRow, Issue } from '../hooks/useSheetData';

// ── Theme palettes ──────────────────────────────────────────────────
const LIGHT = {
  bg:'#f0f2f7',       panel:'#ffffff',    card:'#ffffff',     border:'#e2e6ef',
  text:'#1a1d2e',     sub:'#5a5f7a',      muted:'#9499b5',
  green:'#1a9e5c',    greenDim:'#e6f7ef',
  red:'#d63b3b',      redDim:'#fdeaea',
  yellow:'#c48a00',   yellowDim:'#fdf5e0',
  blue:'#2872d4',     blueDim:'#e8f0fd',
  accent:'#6355d4',   accentDim:'#eeecfc',
  orange:'#d4622a',   orangeDim:'#fdf0ea',
  cyan:'#0d8fa0',     cyanDim:'#e4f6f8',
  shadow:'rgba(0,0,0,0.06)',
};

const DARK = {
  bg:'#0a0b11',       panel:'#0f1019',    card:'#13141f',     border:'#1e2035',
  text:'#e8e9f5',     sub:'#6e6e96',      muted:'#3a3a55',
  green:'#3ecf78',    greenDim:'#0a1e12',
  red:'#e8504a',      redDim:'#1e0a09',
  yellow:'#e0b84a',   yellowDim:'#1e1708',
  blue:'#4d94e8',     blueDim:'#081628',
  accent:'#8b7ff5',   accentDim:'#120f2a',
  orange:'#e8854a',   orangeDim:'#1e1008',
  cyan:'#3ec8c8',     cyanDim:'#071818',
  shadow:'rgba(0,0,0,0.4)',
};

type Palette = typeof LIGHT;

// ── Theme context ─────────────────────────────────────────────────
const ThemeContext = createContext<{D:Palette;isDark:boolean;toggleTheme:()=>void}>({
  D:LIGHT, isDark:false, toggleTheme:()=>{},
});
function useTheme(){ return useContext(ThemeContext); }

// ── Helpers (theme-aware, take D as first arg) ──────────────────────
const getPC = (D:Palette) => [D.blue, D.accent, D.orange];
const getDC = (D:Palette) => [D.blue, D.accent, D.green, D.orange, D.yellow, D.cyan, D.red];

const num  = (v:any) => parseFloat(String(v??0).replace(/\s/g,'').replace(',','.')) || 0;
const fmtM = (v:number) => v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${v.toFixed(0)}`;
const fmtP = (v:number) => `${Math.round(v)}%`;
const sCol = (D:Palette,s:string) => ['On Track','Active','Resolved','Done'].includes(s)?D.green:s==='Delayed'?D.red:D.blue;
const iCol = (D:Palette,v:number) => v>=1?D.green:D.red;

// ── Card wrapper ──────────────────────────────────────────────────
function Card({children,style}:{children:React.ReactNode;style?:any}) {
  const {D} = useTheme();
  return (
    <View style={[{
      backgroundColor:D.card, borderRadius:10,
      borderWidth:1, borderColor:D.border,
      shadowColor:D.shadow, shadowOffset:{width:0,height:2},
      shadowOpacity:1, shadowRadius:6, elevation:2,
    }, style]}>
      {children}
    </View>
  );
}

function Clock() {
  const {D} = useTheme();
  const [t,setT]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(id);},[]);
  return <Text style={{color:D.muted,fontSize:11,fontWeight:'600',letterSpacing:1}}>{t.toLocaleTimeString()}</Text>;
}

function SH({label,color}:{label:string;color?:string}) {
  const {D} = useTheme();
  const c = color ?? D.sub;
  return (
    <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:10}}>
      <View style={{width:3,height:14,backgroundColor:c,borderRadius:2}}/>
      <Text style={{fontSize:11,fontWeight:'800',color:c,letterSpacing:1.5,textTransform:'uppercase'}}>{label}</Text>
    </View>
  );
}

function Legend({items}:{items:{label:string;color:string}[]}) {
  const {D} = useTheme();
  return (
    <View style={{flexDirection:'row',gap:14,flexWrap:'wrap'}}>
      {items.map(item=>(
        <View key={item.label} style={{flexDirection:'row',alignItems:'center',gap:5}}>
          <View style={{width:14,height:2.5,backgroundColor:item.color,borderRadius:1}}/>
          <Text style={{fontSize:10,color:D.muted}}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── ChartBox ──────────────────────────────────────────────────────
function ChartBox({h,children}:{h:number;children:(w:number)=>React.ReactNode}) {
  const [w,setW]=useState(0);
  return (
    <View style={{width:'100%' as any}} onLayout={e=>setW(Math.floor(e.nativeEvent.layout.width))}>
      {w>0?children(w):<View style={{height:h}}/>}
    </View>
  );
}

// ── Arc Gauge ─────────────────────────────────────────────────────
function ArcGauge({pct,color,size,label,sublabel}:{pct:number;color:string;size:number;label?:string;sublabel?:string}) {
  const {D} = useTheme();
  const cx=size/2,cy=size*0.62,r=size*0.37,sw=size*0.10;
  const p=Math.min(1,Math.max(0,pct/100));
  const toR=(d:number)=>d*Math.PI/180;
  const S=210,ARC=240;
  const apt=(d:number)=>({x:cx+r*Math.cos(toR(d)),y:cy+r*Math.sin(toR(d))});
  const arc=(f:number,t:number)=>{const s=apt(f),e=apt(t),lg=t-f>180?1:0;return`M${s.x},${s.y} A${r},${r} 0 ${lg} 1 ${e.x},${e.y}`;};
  const endD=S+ARC*p,nr=toR(endD),nL=r*0.76;
  const tx=cx+nL*Math.cos(nr),ty=cy+nL*Math.sin(nr);
  const br=toR(endD+90),bw=sw*0.12;
  const b1x=cx+bw*Math.cos(br),b1y=cy+bw*Math.sin(br),b2x=cx-bw*Math.cos(br),b2y=cy-bw*Math.sin(br);
  const segs=[{f:210,t:258,c:D.red},{f:258,t:306,c:D.orange},{f:306,t:354,c:D.yellow},{f:354,t:402,c:D.green},{f:402,t:450,c:'#128a44'}];
  return (
    <Svg width={size} height={size*0.72}>
      <Path d={arc(S,S+ARC)} fill="none" stroke={D.border} strokeWidth={sw} strokeLinecap="butt"/>
      {segs.map((sg,i)=><Path key={i} d={arc(sg.f,sg.t)} fill="none" stroke={sg.c} strokeWidth={sw} opacity={0.25} strokeLinecap="butt"/>)}
      {p>0.001&&<Path d={arc(S,endD)} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="butt"/>}
      <Path d={`M${b1x},${b1y} L${tx},${ty} L${b2x},${b2y} Z`} fill={D.text}/>
      <Circle cx={cx} cy={cy} r={sw*0.3} fill={D.text}/>
      <ST x={cx} y={cy+r*0.22} textAnchor="middle" fontSize={size*0.17} fontWeight="900" fill={color}>{label??fmtP(pct)}</ST>
      {sublabel&&<ST x={cx} y={cy+r*0.46} textAnchor="middle" fontSize={size*0.095} fill={D.muted}>{sublabel}</ST>}
    </Svg>
  );
}

// ── Donut ─────────────────────────────────────────────────────────
function Donut({slices,size,label,sublabel}:{slices:{v:number;c:string}[];size:number;label?:string;sublabel?:string}) {
  const {D} = useTheme();
  const total=slices.reduce((s,d)=>s+d.v,0)||1;
  const cx=size/2,cy=size/2,r=size*0.34,sw=size*0.16;
  let angle=-Math.PI/2;
  return (
    <Svg width={size} height={size}>
      {slices.map((sl,i)=>{
        const sweep=(sl.v/total)*2*Math.PI;
        const x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle);
        angle+=sweep;
        const x2=cx+r*Math.cos(angle),y2=cy+r*Math.sin(angle);
        const lg=sweep>Math.PI?1:0;
        if(sl.v===0)return null;
        if(Math.abs(sl.v-total)<0.001)return<Circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={sl.c} strokeWidth={sw}/>;
        return<Path key={i} d={`M${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2}`} fill="none" stroke={sl.c} strokeWidth={sw} strokeLinecap="butt"/>;
      })}
      {label&&<ST x={cx} y={sublabel?cy-2:cy+5} textAnchor="middle" fontSize={size*0.19} fontWeight="900" fill={D.text}>{label}</ST>}
      {sublabel&&<ST x={cx} y={cy+size*0.13} textAnchor="middle" fontSize={size*0.1} fill={D.muted}>{sublabel}</ST>}
    </Svg>
  );
}

// ── Line / S-Curve ────────────────────────────────────────────────
function LineCurve({series,w,h,labels,refLine}:{
  series:{data:number[];color:string;dashed?:boolean}[];
  w:number;h:number;labels?:string[];refLine?:number;
}) {
  const {D} = useTheme();
  const all=series.flatMap(s=>s.data);
  if(all.length<2)return null;
  const rawMin=Math.min(...all),rawMax=Math.max(...all,rawMin+0.01);
  const pad=(rawMax-rawMin)*0.15||rawMax*0.1||0.1;
  const mn=Math.max(0,rawMin-pad),mx=rawMax+pad;
  const pL=44,pR=16,pT=10,pB=labels?28:10;
  const cw=w-pL-pR,ch=h-pT-pB;
  const n=Math.max(...series.map(s=>s.data.length));
  const toXY=(v:number,i:number,len:number)=>({x:pL+(i/Math.max(len-1,1))*cw,y:pT+(1-(v-mn)/(mx-mn))*ch});
  const yTicks=[mn,mn+(mx-mn)*0.25,mn+(mx-mn)*0.5,mn+(mx-mn)*0.75,mx];
  return (
    <Svg width={w} height={h}>
      <Defs>{series.map((s,si)=>(
        <LinearGradient key={si} id={`lg${si}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={s.color} stopOpacity="0.12"/>
          <Stop offset="1" stopColor={s.color} stopOpacity="0"/>
        </LinearGradient>
      ))}</Defs>
      {yTicks.map((t,i)=>{
        const y=pT+(1-(t-mn)/(mx-mn))*ch;
        return<G key={i}>
          <Line x1={pL} y1={y} x2={w-pR} y2={y} stroke={D.border} strokeWidth={0.8}/>
          <ST x={pL-4} y={y+4} textAnchor="end" fontSize={9} fill={D.muted}>{t>=1e6?`${(t/1e6).toFixed(1)}M`:t>=1e3?`${(t/1e3).toFixed(0)}K`:t<10?t.toFixed(2):t.toFixed(0)}</ST>
        </G>;
      })}
      {refLine!=null&&(()=>{const y=pT+(1-(refLine-mn)/(mx-mn))*ch;return<Line x1={pL} y1={y} x2={w-pR} y2={y} stroke={D.yellow} strokeWidth={1.5} strokeDasharray="5,3"/>;})()}
      {series.map((s,si)=>{
        const pts=s.data.map((v,i)=>toXY(v,i,s.data.length));
        const d=pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
        const area=`${d} L${pts[pts.length-1].x},${pT+ch} L${pts[0].x},${pT+ch} Z`;
        return<G key={si}>
          <Path d={area} fill={`url(#lg${si})`}/>
          <Path d={d} fill="none" stroke={s.color} strokeWidth={s.dashed?2:2.5} strokeDasharray={s.dashed?'6,3':undefined} strokeLinejoin="round"/>
          {pts.map((p,i)=><Circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color}/>)}
        </G>;
      })}
      {labels&&labels.map((l,i)=>{
        const x=pL+(i/(n-1))*cw;
        return<ST key={i} x={x} y={h-5} textAnchor="middle" fontSize={9} fill={D.muted}>{l}</ST>;
      })}
    </Svg>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────
function BarChart({bars,w,h,grouped}:{bars:{label:string;v:number;v2?:number;color:string;c2?:string}[];w:number;h:number;grouped?:boolean}) {
  const {D} = useTheme();
  const max=Math.max(...bars.flatMap(b=>[b.v,b.v2??0]),1);
  const pT=24,pB=26,pL=8,pR=8,cw=w-pL-pR,ch=h-pT-pB,gap=cw/bars.length;
  const bw=grouped?Math.max(10,gap*0.32):Math.max(16,gap*0.58);
  return (
    <Svg width={w} height={h}>
      <Line x1={pL} y1={pT+ch} x2={w-pR} y2={pT+ch} stroke={D.border} strokeWidth={1}/>
      {bars.map((b,i)=>{
        const cx=pL+gap*i+gap/2;
        const bh=Math.max(4,(b.v/max)*ch),x=grouped?cx-bw-1:cx-bw/2,y=pT+ch-bh;
        const bh2=b.v2!=null?Math.max(4,(b.v2/max)*ch):0,x2=cx+2,y2=pT+ch-bh2;
        const lbl=b.v>=1e6?`${(b.v/1e6).toFixed(1)}M`:b.v>=1e3?`${(b.v/1e3).toFixed(0)}K`:String(b.v);
        const lbl2=b.v2!=null?(b.v2>=1e6?`${(b.v2/1e6).toFixed(1)}M`:b.v2>=1e3?`${(b.v2/1e3).toFixed(0)}K`:String(b.v2)):'';
        return<G key={i}>
          <Rect x={x} y={y} width={bw} height={bh} fill={b.color} opacity={0.8} rx={3}/>
          <ST x={cx-(grouped?bw/2+1:0)} y={y-4} textAnchor="middle" fontSize={10} fill={b.color} fontWeight="700">{lbl}</ST>
          {grouped&&b.v2!=null&&<>
            <Rect x={x2} y={y2} width={bw} height={bh2} fill={b.c2??D.orange} opacity={0.7} rx={3}/>
            <ST x={cx+bw/2+1} y={y2-4} textAnchor="middle" fontSize={10} fill={b.c2??D.orange} fontWeight="700">{lbl2}</ST>
          </>}
          <ST x={cx} y={h-6} textAnchor="middle" fontSize={9} fill={D.muted}>{b.label}</ST>
        </G>;
      })}
    </Svg>
  );
}

// ── HBar ──────────────────────────────────────────────────────────
function HBar({label,v,max,color,sub}:{label:string;v:number;max:number;color:string;sub?:string}) {
  const {D} = useTheme();
  const pct=max>0?(v/max)*100:0;
  return (
    <View style={{gap:3}}>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}>
        <Text style={{fontSize:12,color:D.text,flex:1}} numberOfLines={1}>{label}</Text>
        <Text style={{fontSize:12,color,fontWeight:'700',marginLeft:8}}>{sub??v}</Text>
      </View>
      <View style={{height:5,backgroundColor:D.border,borderRadius:3}}>
        <View style={{height:5,width:`${Math.min(pct,100)}%` as any,backgroundColor:color,borderRadius:3}}/>
      </View>
    </View>
  );
}

// ── Gantt ─────────────────────────────────────────────────────────
function Gantt({ms,w,h}:{ms:Milestone[];w:number;h:number}) {
  const {D} = useTheme();
  if(!ms.length)return<View style={{width:w,height:h,alignItems:'center',justifyContent:'center'}}><Text style={{color:D.muted,fontSize:12}}>No milestones</Text></View>;
  const toMs=(d:string)=>new Date(d).getTime();
  const valid=ms.flatMap(m=>[m.planned_start,m.planned_end].filter(d=>d&&!isNaN(toMs(d))));
  if(!valid.length)return null;
  const minD=Math.min(...valid.map(toMs)),maxD=Math.max(...valid.map(toMs)),span=maxD-minD||1;
  const rowH=Math.max(22,Math.floor((h-20)/ms.length));
  const pL=112,pR=8,pT=16,tw=w-pL-pR;
  const sc=(s:string)=>s==='Done'?D.green:s==='Delayed'?D.red:s==='In Progress'?D.blue:D.muted;
  return (
    <Svg width={w} height={Math.max(h,ms.length*rowH+pT+10)}>
      {[0,0.25,0.5,0.75,1].map((f,i)=><Line key={i} x1={pL+tw*f} y1={pT-6} x2={pL+tw*f} y2={pT+ms.length*rowH} stroke={D.border} strokeWidth={0.8}/>)}
      {ms.map((m,i)=>{
        const y=pT+i*rowH,col=sc(m.status);
        const ps=m.planned_start&&!isNaN(toMs(m.planned_start))?(toMs(m.planned_start)-minD)/span:0;
        const pe=m.planned_end&&!isNaN(toMs(m.planned_end))?(toMs(m.planned_end)-minD)/span:ps+0.1;
        const bx=pL+ps*tw,bw=Math.max(6,(pe-ps)*tw);
        const prog=num(m.progress_pct)/100;
        return<G key={i}>
          <ST x={pL-6} y={y+rowH*0.67} textAnchor="end" fontSize={9} fill={D.sub}>{(m.milestone_name??'').slice(0,14)}</ST>
          <Rect x={pL} y={y+3} width={tw} height={rowH-6} fill={D.bg} rx={3}/>
          <Rect x={bx} y={y+4} width={bw} height={rowH-8} fill={col} opacity={0.2} rx={3}/>
          {prog>0&&<Rect x={bx} y={y+4} width={bw*prog} height={rowH-8} fill={col} opacity={0.85} rx={3}/>}
        </G>;
      })}
    </Svg>
  );
}

// ── ChartBox2: measures BOTH width & height (for flex-fit charts) ──
function ChartBox2({children}:{children:(w:number,h:number)=>React.ReactNode}) {
  const [size,setSize]=useState({w:0,h:0});
  return (
    <View style={{flex:1,width:'100%' as any}} onLayout={e=>{
      const {width,height}=e.nativeEvent.layout;
      setSize({w:Math.floor(width),h:Math.floor(height)});
    }}>
      {size.w>0&&size.h>0?children(size.w,size.h):null}
    </View>
  );
}

// ── Gantt (exact-fit, no minimum row height) ────────────────────
function GanttFit({ms,w,h}:{ms:Milestone[];w:number;h:number}) {
  const {D} = useTheme();
  if(!ms.length)return<View style={{width:w,height:h,alignItems:'center',justifyContent:'center'}}><Text style={{color:D.muted,fontSize:11}}>No milestones</Text></View>;
  const toMs=(d:string)=>new Date(d).getTime();
  const valid=ms.flatMap(m=>[m.planned_start,m.planned_end].filter(d=>d&&!isNaN(toMs(d))));
  if(!valid.length)return null;
  const minD=Math.min(...valid.map(toMs)),maxD=Math.max(...valid.map(toMs)),span=maxD-minD||1;
  const rowH=h/ms.length;
  const fontSize=Math.max(7,Math.min(10,rowH*0.4));
  const pL=Math.min(110,w*0.3),pR=8,pT=4,tw=w-pL-pR;
  const sc=(s:string)=>s==='Done'?D.green:s==='Delayed'?D.red:s==='In Progress'?D.blue:D.muted;
  return (
    <Svg width={w} height={h}>
      {[0,0.25,0.5,0.75,1].map((f,i)=><Line key={i} x1={pL+tw*f} y1={pT} x2={pL+tw*f} y2={h} stroke={D.border} strokeWidth={0.8}/>)}
      {ms.map((m,i)=>{
        const y=pT+i*rowH,col=sc(m.status);
        const ps=m.planned_start&&!isNaN(toMs(m.planned_start))?(toMs(m.planned_start)-minD)/span:0;
        const pe=m.planned_end&&!isNaN(toMs(m.planned_end))?(toMs(m.planned_end)-minD)/span:ps+0.1;
        const bx=pL+ps*tw,bw=Math.max(4,(pe-ps)*tw);
        const prog=num(m.progress_pct)/100;
        const barH=Math.max(4,rowH-6);
        return<G key={i}>
          <ST x={pL-6} y={y+rowH*0.65} textAnchor="end" fontSize={fontSize} fill={D.sub}>{(m.milestone_name??'').slice(0,Math.floor(pL/6))}</ST>
          <Rect x={pL} y={y+(rowH-barH)/2} width={tw} height={barH} fill={D.bg} rx={2}/>
          <Rect x={bx} y={y+(rowH-barH)/2} width={bw} height={barH} fill={col} opacity={0.2} rx={2}/>
          {prog>0&&<Rect x={bx} y={y+(rowH-barH)/2} width={bw*prog} height={barH} fill={col} opacity={0.85} rx={2}/>}
        </G>;
      })}
    </Svg>
  );
}

// ════════════════════════════════════════════════════════════════
// PROJECT DASHBOARD — TV / PRESENTATION MODE (fits one screen)
// ════════════════════════════════════════════════════════════════
function ProjectDashboardTV({p,data,color}:{p:Project;data:SheetData;color:string}) {
  const {D} = useTheme();
  const PC = getPC(D);
  const DC = getDC(D);

  const workers  = data.workers.filter(w=>w.project_id===p.project_id);
  const evm      = data.evm.filter(e=>e.project_id===p.project_id);
  const budget   = data.budget.filter(b=>b.project_id===p.project_id);
  const schedule = data.schedule.filter(m=>m.project_id===p.project_id);
  const issues   = data.issues.filter(i=>i.project_id===p.project_id);

  const prog  = num(p.progress_pct);
  const cpi   = num(p.cpi);
  const spi   = num(p.spi);
  const spent = num(p.spent_to_date_usd);
  const total = num(p.total_budget_usd);
  const bPct  = total>0?(spent/total)*100:0;
  const bCol  = bPct>90?D.red:bPct>70?D.yellow:D.green;

  const activeW = workers.filter(w=>w.status==='Active').length;
  const openIss = issues.filter(i=>i.status==='Open').length;
  const highIss = issues.filter(i=>i.status==='Open'&&i.priority==='High').length;

  const byDept:{[k:string]:number}={};
  workers.forEach(w=>{byDept[w.department]=(byDept[w.department]??0)+1;});
  const depts=Object.entries(byDept).sort((a,b)=>b[1]-a[1]);

  const evmMonths=evm.map(e=>e.month?.slice(5,7)??'');
  const pvS=evm.map(e=>num(e.pv_usd));
  const evS=evm.map(e=>num(e.ev_usd));
  const acS=evm.map(e=>num(e.ac_usd));
  const cpiS=evm.map(e=>num(e.cpi));
  const spiS=evm.map(e=>num(e.spi));
  const latestEvm=evm[evm.length-1];

  const months=[...new Set(budget.map(b=>b.month))].sort();
  const mPl=months.map(m=>budget.filter(b=>b.month===m).reduce((s,r)=>s+num(r.planned_usd),0));
  const mAc=months.map(m=>budget.filter(b=>b.month===m).reduce((s,r)=>s+num(r.actual_usd),0));

  const cats=[...new Set(budget.map(b=>b.category))];
  const catData=cats.map(cat=>{
    const rows=budget.filter(b=>b.category===cat);
    return{cat,pl:rows.reduce((s,r)=>s+num(r.planned_usd),0),ac:rows.reduce((s,r)=>s+num(r.actual_usd),0)};
  }).sort((a,b)=>b.pl-a.pl).slice(0,4);

  const phases=[...new Set(schedule.map(m=>m.phase))].filter(Boolean) as string[];
  const msDone=schedule.filter(m=>m.status==='Done').length;
  const msInP =schedule.filter(m=>m.status==='In Progress').length;
  const msDel =schedule.filter(m=>m.status==='Delayed').length;

  return(
    <View style={{flex:1,gap:8}}>

      {/* ══ HEADER STRIP ══ */}
      <Card style={{borderLeftWidth:4,borderLeftColor:color,paddingVertical:8,paddingHorizontal:14,
        flexDirection:'row',alignItems:'center',gap:14}}>
        <View style={{gap:1}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <View style={{width:6,height:6,borderRadius:3,backgroundColor:sCol(D,p.status)}}/>
            <Text style={{fontSize:9,color:sCol(D,p.status),fontWeight:'800',letterSpacing:1}}>{p.status.toUpperCase()}</Text>
          </View>
          <Text style={{fontSize:18,color:D.text,fontWeight:'900'}}>{p.project_name}</Text>
          <Text style={{fontSize:10,color:D.sub}}>{p.client} · {p.location}</Text>
        </View>
        <Text style={{fontSize:34,fontWeight:'900',color,marginLeft:'auto' as any}}>{fmtP(prog)}</Text>
        <View style={{width:1,height:36,backgroundColor:D.border}}/>
        <View style={{flexDirection:'row',gap:8,flex:1,justifyContent:'flex-end'}}>
          {[
            {l:'Budget',v:fmtM(total),c:D.text},
            {l:'Spent',v:fmtM(spent),c:bCol,s:fmtP(bPct)},
            {l:'CPI',v:cpi.toFixed(2),c:iCol(D,cpi)},
            {l:'SPI',v:spi.toFixed(2),c:iCol(D,spi)},
            {l:'Workers',v:`${activeW}/${workers.length}`,c:D.cyan},
            {l:'Issues',v:String(openIss),c:openIss>0?D.yellow:D.green,s:`${highIss} crit.`},
          ].map(kpi=>(
            <View key={kpi.l} style={{backgroundColor:D.bg,borderRadius:6,borderWidth:1,borderColor:D.border,paddingHorizontal:10,paddingVertical:4,alignItems:'center',minWidth:64}}>
              <Text style={{fontSize:8,color:D.muted,letterSpacing:1,textTransform:'uppercase'}}>{kpi.l}</Text>
              <Text style={{fontSize:15,fontWeight:'900',color:kpi.c,lineHeight:17}}>{kpi.v}</Text>
              {kpi.s&&<Text style={{fontSize:8,color:D.muted}}>{kpi.s}</Text>}
            </View>
          ))}
        </View>
      </Card>

      {/* ══ ROW 1: Gauge | CPI/SPI | Manpower | Milestones ══ */}
      <View style={{flex:5,flexDirection:'row',gap:8}}>
        {/* Gauge */}
        <Card style={{width:160,padding:10,alignItems:'center',justifyContent:'center'}}>
          <ChartBox2>{(cw,ch)=>{
            const size=Math.min(cw,ch/0.72)*0.98;
            return(
              <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
                <ArcGauge pct={prog} color={color} size={size} label={fmtP(prog)} sublabel="complete"/>
              </View>
            );
          }}</ChartBox2>
        </Card>

        {/* CPI / SPI stacked */}
        <View style={{width:140,gap:8}}>
          <Card style={{flex:1,alignItems:'center',justifyContent:'center',gap:1,
            backgroundColor:cpi>=1?D.greenDim:D.redDim,borderColor:cpi>=1?D.green:D.red}}>
            <Text style={{fontSize:9,color:D.sub,letterSpacing:1.5}}>CPI</Text>
            <Text style={{fontSize:30,fontWeight:'900',color:iCol(D,cpi),lineHeight:32}}>{cpi.toFixed(2)}</Text>
            <Text style={{fontSize:9,color:iCol(D,cpi),fontWeight:'700'}}>{cpi>=1?'ON BUDGET':'OVER BUDGET'}</Text>
          </Card>
          <Card style={{flex:1,alignItems:'center',justifyContent:'center',gap:1,
            backgroundColor:spi>=1?D.greenDim:D.redDim,borderColor:spi>=1?D.green:D.red}}>
            <Text style={{fontSize:9,color:D.sub,letterSpacing:1.5}}>SPI</Text>
            <Text style={{fontSize:30,fontWeight:'900',color:iCol(D,spi),lineHeight:32}}>{spi.toFixed(2)}</Text>
            <Text style={{fontSize:9,color:iCol(D,spi),fontWeight:'700'}}>{spi>=1?'ON SCHEDULE':'BEHIND'}</Text>
          </Card>
        </View>

        {/* Manpower */}
        <Card style={{flex:1,padding:12,gap:8}}>
          <SH label="Manpower" color={D.cyan}/>
          <View style={{flex:1,flexDirection:'row',gap:14,alignItems:'center'}}>
            <View style={{alignItems:'center',gap:4}}>
              <Donut slices={[{v:activeW,c:D.green},{v:workers.length-activeW,c:D.muted}]} size={84} label={String(activeW)} sublabel="active"/>
              <Text style={{fontSize:10,color:D.muted}}>of {workers.length} total</Text>
            </View>
            <View style={{flex:1,gap:5}}>
              {depts.slice(0,6).map((d,i)=>(
                <HBar key={d[0]} label={d[0]} v={d[1]} max={depts[0][1]} color={DC[i%7]} sub={String(d[1])}/>
              ))}
            </View>
          </View>
        </Card>

        {/* Milestone Summary */}
        <Card style={{width:230,padding:12,gap:8}}>
          <SH label="Milestone Summary" color={D.accent}/>
          <View style={{flexDirection:'row',gap:6}}>
            {[{l:'Done',v:msDone,c:D.green},{l:'In Prog',v:msInP,c:D.blue},{l:'Delayed',v:msDel,c:msDel>0?D.red:D.muted}].map(item=>(
              <View key={item.l} style={{flex:1,backgroundColor:item.c+'18',borderWidth:1,borderColor:item.c+'44',padding:6,alignItems:'center',borderRadius:6}}>
                <Text style={{fontSize:8,color:D.muted,letterSpacing:1}}>{item.l.toUpperCase()}</Text>
                <Text style={{fontSize:18,fontWeight:'900',color:item.c}}>{item.v}</Text>
              </View>
            ))}
          </View>
          <View style={{flex:1,gap:5,justifyContent:'center'}}>
            {phases.map(phase=>{
              const phMs=schedule.filter(m=>m.phase===phase);
              const phDone=phMs.filter(m=>m.status==='Done').length;
              const phPct=phMs.length>0?(phDone/phMs.length)*100:0;
              const phCol=phPct===100?D.green:phMs.some(m=>m.status==='Delayed')?D.red:D.blue;
              return(
                <View key={phase} style={{gap:2}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                    <Text style={{fontSize:10,color:D.text}}>{phase}</Text>
                    <Text style={{fontSize:10,color:phCol,fontWeight:'700'}}>{fmtP(phPct)}</Text>
                  </View>
                  <View style={{height:4,backgroundColor:D.bg,borderRadius:2}}>
                    <View style={{height:4,width:`${phPct}%` as any,backgroundColor:phCol,borderRadius:2}}/>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      </View>

      {/* ══ ROW 2: Budget trend | Category | EVM S-Curve | CPI/SPI trend ══ */}
      <View style={{flex:5,flexDirection:'row',gap:8}}>
        <Card style={{flex:3,padding:12,gap:6}}>
          <SH label="Budget Monthly Trend" color={D.blue}/>
          {months.length>=2
            ?<ChartBox2>{(cw,ch)=><LineCurve series={[{data:mPl,color:D.blue,dashed:true},{data:mAc,color:D.orange}]} w={cw} h={ch} labels={months.map(m=>m?.slice(5,7)??'')}/>}</ChartBox2>
            :<View style={{flex:1}}/>
          }
          <Legend items={[{label:'Planned',color:D.blue},{label:'Actual',color:D.orange}]}/>
        </Card>
        <Card style={{flex:2,padding:12,gap:6}}>
          <SH label="By Category" color={D.orange}/>
          <View style={{flex:1,gap:8,justifyContent:'center'}}>
            {catData.map(c=>{
              const max=catData[0]?.pl??1,over=c.ac>c.pl;
              return(
                <View key={c.cat} style={{gap:2}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                    <Text style={{fontSize:11,color:D.text,flex:1}} numberOfLines={1}>{c.cat}</Text>
                    <Text style={{fontSize:11,color:over?D.red:D.green,fontWeight:'700'}}>{fmtM(c.ac)}</Text>
                  </View>
                  <View style={{height:4,backgroundColor:D.bg,borderRadius:2}}>
                    <View style={{height:4,width:`${(c.pl/max)*100}%` as any,backgroundColor:D.blue,opacity:0.3,borderRadius:2}}/>
                  </View>
                  <View style={{height:4,marginTop:-4}}>
                    <View style={{height:4,width:`${(c.ac/max)*100}%` as any,backgroundColor:over?D.red:D.green,borderRadius:2}}/>
                  </View>
                </View>
              );
            })}
          </View>
          <Legend items={[{label:'Planned',color:D.blue},{label:'Actual',color:D.green}]}/>
        </Card>
        {evm.length>=2&&<>
          <Card style={{flex:3,padding:12,gap:6}}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
              <SH label="EVM S-Curve" color={color}/>
              {latestEvm&&(
                <View style={{flexDirection:'row',gap:5}}>
                  {[
                    {l:'EAC',v:fmtM(num(latestEvm.eac_usd)),c:num(latestEvm.eac_usd)>num(latestEvm.bac_usd)?D.red:D.green},
                    {l:'CV', v:(num(latestEvm.cv_usd)>=0?'+':'')+fmtM(num(latestEvm.cv_usd)),c:num(latestEvm.cv_usd)>=0?D.green:D.red},
                    {l:'SV', v:(num(latestEvm.sv_usd)>=0?'+':'')+fmtM(num(latestEvm.sv_usd)),c:num(latestEvm.sv_usd)>=0?D.green:D.red},
                  ].map(item=>(
                    <View key={item.l} style={{backgroundColor:D.bg,borderWidth:1,borderColor:D.border,paddingHorizontal:7,paddingVertical:2,alignItems:'center',borderRadius:5}}>
                      <Text style={{fontSize:8,color:D.muted}}>{item.l}</Text>
                      <Text style={{fontSize:11,fontWeight:'800',color:item.c}}>{item.v}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <ChartBox2>{(cw,ch)=><LineCurve
              series={[{data:pvS,color:D.blue,dashed:true},{data:evS,color:D.green},{data:acS,color:D.red}]}
              w={cw} h={ch} labels={evmMonths}
            />}</ChartBox2>
            <Legend items={[{label:'Planned Value',color:D.blue},{label:'Earned Value',color:D.green},{label:'Actual Cost',color:D.red}]}/>
          </Card>
          <Card style={{flex:2,padding:12,gap:6}}>
            <SH label="CPI & SPI Trend" color={color}/>
            <ChartBox2>{(cw,ch)=><LineCurve
              series={[{data:cpiS,color:D.green},{data:spiS,color:D.yellow}]}
              w={cw} h={ch} labels={evmMonths} refLine={1}
            />}</ChartBox2>
            <Legend items={[{label:'CPI',color:D.green},{label:'SPI',color:D.yellow},{label:'1.0',color:D.yellow}]}/>
          </Card>
        </>}
      </View>

      {/* ══ ROW 3: Gantt | Issues ══ */}
      <View style={{flex:4,flexDirection:'row',gap:8}}>
        <Card style={{flex:3,padding:12,gap:6}}>
          <SH label="Schedule / Gantt" color={D.accent}/>
          <ChartBox2>{(cw,ch)=><GanttFit ms={schedule} w={cw} h={ch}/>}</ChartBox2>
          <View style={{flexDirection:'row',gap:10}}>
            {[{l:'Done',c:D.green},{l:'In Progress',c:D.blue},{l:'Delayed',c:D.red},{l:'Pending',c:D.muted}].map(s=>(
              <View key={s.l} style={{flexDirection:'row',alignItems:'center',gap:4}}>
                <View style={{width:8,height:8,backgroundColor:s.c,borderRadius:2}}/>
                <Text style={{fontSize:10,color:D.muted}}>{s.l}</Text>
              </View>
            ))}
          </View>
        </Card>
        <Card style={{flex:2,padding:12,gap:8}}>
          <SH label="Issues" color={D.red}/>
          <View style={{flex:1,flexDirection:'row',gap:14,alignItems:'center'}}>
            <Donut slices={[
              {v:issues.filter(i=>i.status==='Open'&&i.priority==='High').length,c:D.red},
              {v:issues.filter(i=>i.status==='Open'&&i.priority==='Medium').length,c:D.yellow},
              {v:issues.filter(i=>i.status==='Open'&&i.priority==='Low').length,c:D.blue},
              {v:issues.filter(i=>i.status!=='Open').length,c:D.green},
            ]} size={84} label={String(openIss)} sublabel="open"/>
            <View style={{flex:1,gap:8}}>
              {[{l:'High',c:D.red},{l:'Medium',c:D.yellow},{l:'Low',c:D.blue},{l:'Resolved',c:D.green}].map(row=>{
                const cnt=row.l==='Resolved'?issues.filter(i=>i.status!=='Open').length:issues.filter(i=>i.status==='Open'&&i.priority===row.l).length;
                return(
                  <View key={row.l} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                      <View style={{width:9,height:9,borderRadius:4.5,backgroundColor:row.c}}/>
                      <Text style={{fontSize:13,color:D.sub}}>{row.l}</Text>
                    </View>
                    <Text style={{fontSize:16,color:row.c,fontWeight:'800'}}>{cnt}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>
      </View>

    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// PROJECT DASHBOARD
// ════════════════════════════════════════════════════════════════
function ProjectDashboard({p,data,color}:{p:Project;data:SheetData;color:string}) {
  const {D} = useTheme();
  const PC = getPC(D);
  const DC = getDC(D);

  const workers  = data.workers.filter(w=>w.project_id===p.project_id);
  const evm      = data.evm.filter(e=>e.project_id===p.project_id);
  const budget   = data.budget.filter(b=>b.project_id===p.project_id);
  const schedule = data.schedule.filter(m=>m.project_id===p.project_id);
  const issues   = data.issues.filter(i=>i.project_id===p.project_id);

  const prog  = num(p.progress_pct);
  const cpi   = num(p.cpi);
  const spi   = num(p.spi);
  const spent = num(p.spent_to_date_usd);
  const total = num(p.total_budget_usd);
  const bPct  = total>0?(spent/total)*100:0;
  const bCol  = bPct>90?D.red:bPct>70?D.yellow:D.green;

  const activeW = workers.filter(w=>w.status==='Active').length;
  const openIss = issues.filter(i=>i.status==='Open').length;
  const highIss = issues.filter(i=>i.status==='Open'&&i.priority==='High').length;

  const byDept:{[k:string]:number}={};
  workers.forEach(w=>{byDept[w.department]=(byDept[w.department]??0)+1;});
  const depts=Object.entries(byDept).sort((a,b)=>b[1]-a[1]);

  const evmMonths=evm.map(e=>e.month?.slice(5,7)??'');
  const pvS=evm.map(e=>num(e.pv_usd));
  const evS=evm.map(e=>num(e.ev_usd));
  const acS=evm.map(e=>num(e.ac_usd));
  const cpiS=evm.map(e=>num(e.cpi));
  const spiS=evm.map(e=>num(e.spi));
  const latestEvm=evm[evm.length-1];

  const months=[...new Set(budget.map(b=>b.month))].sort();
  const mPl=months.map(m=>budget.filter(b=>b.month===m).reduce((s,r)=>s+num(r.planned_usd),0));
  const mAc=months.map(m=>budget.filter(b=>b.month===m).reduce((s,r)=>s+num(r.actual_usd),0));

  const cats=[...new Set(budget.map(b=>b.category))];
  const catData=cats.map(cat=>{
    const rows=budget.filter(b=>b.category===cat);
    return{cat,pl:rows.reduce((s,r)=>s+num(r.planned_usd),0),ac:rows.reduce((s,r)=>s+num(r.actual_usd),0)};
  }).sort((a,b)=>b.pl-a.pl).slice(0,5);

  const phases=[...new Set(schedule.map(m=>m.phase))].filter(Boolean) as string[];
  const msDone=schedule.filter(m=>m.status==='Done').length;
  const msInP =schedule.filter(m=>m.status==='In Progress').length;
  const msDel =schedule.filter(m=>m.status==='Delayed').length;

  return(
    <View style={{gap:14}}>

      {/* ══ ROW 1: Header ══ */}
      <Card style={{borderLeftWidth:5,borderLeftColor:color,padding:20,gap:12}}>
        <View style={{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between'}}>
          <View style={{gap:4}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <View style={{width:8,height:8,borderRadius:4,backgroundColor:sCol(D,p.status)}}/>
              <Text style={{fontSize:10,color:sCol(D,p.status),fontWeight:'800',letterSpacing:1.5}}>{p.status.toUpperCase()}</Text>
              <Text style={{fontSize:10,color:D.muted}}>·  {p.start_date} → {p.end_date}</Text>
            </View>
            <Text style={{fontSize:26,color:D.text,fontWeight:'900'}}>{p.project_name}</Text>
            <Text style={{fontSize:13,color:D.sub}}>{p.client}  ·  {p.location}</Text>
          </View>
          <Text style={{fontSize:50,fontWeight:'900',color,lineHeight:52}}>{fmtP(prog)}</Text>
        </View>
        {/* KPI strip */}
        <View style={{flexDirection:'row',gap:8}}>
          {[
            {l:'Budget',   v:fmtM(total),          c:D.text},
            {l:'Spent',    v:fmtM(spent),           c:bCol,  s:fmtP(bPct)+' used'},
            {l:'CPI',      v:cpi.toFixed(2),        c:iCol(D,cpi), s:cpi>=1?'On budget':'Over budget'},
            {l:'SPI',      v:spi.toFixed(2),        c:iCol(D,spi), s:spi>=1?'On schedule':'Behind'},
            {l:'Workers',  v:String(activeW),       c:D.cyan,    s:`of ${workers.length}`},
            {l:'Issues',   v:String(openIss),       c:openIss>0?D.yellow:D.green, s:`${highIss} critical`},
          ].map(kpi=>(
            <View key={kpi.l} style={{flex:1,backgroundColor:D.bg,borderRadius:8,borderWidth:1,borderColor:D.border,padding:10,alignItems:'center'}}>
              <Text style={{fontSize:9,color:D.muted,letterSpacing:1.5,textTransform:'uppercase',marginBottom:2}}>{kpi.l}</Text>
              <Text style={{fontSize:19,fontWeight:'900',color:kpi.c,lineHeight:21}}>{kpi.v}</Text>
              {kpi.s&&<Text style={{fontSize:9,color:D.muted,marginTop:1}}>{kpi.s}</Text>}
            </View>
          ))}
        </View>
        {/* Budget progress bar */}
        <View style={{gap:4}}>
          <View style={{height:8,backgroundColor:D.bg,borderRadius:4}}>
            <View style={{height:8,width:`${Math.min(bPct,100)}%` as any,backgroundColor:bCol,borderRadius:4}}/>
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between'}}>
            <Text style={{fontSize:10,color:D.muted}}>Spent <Text style={{color:D.text,fontWeight:'700'}}>{fmtM(spent)}</Text></Text>
            <Text style={{fontSize:10,color:D.muted}}>Remaining <Text style={{color:D.green,fontWeight:'700'}}>{fmtM(Math.max(0,total-spent))}</Text></Text>
            <Text style={{fontSize:10,color:D.muted}}>Total <Text style={{color:D.text,fontWeight:'700'}}>{fmtM(total)}</Text></Text>
          </View>
        </View>
      </Card>

      {/* ══ ROW 2: Gauge + CPI/SPI tiles + Manpower + Milestone Summary ══ */}
      <View style={{flexDirection:'row',gap:14}}>

        {/* Gauge */}
        <Card style={{width:190,padding:16,alignItems:'center',gap:10,justifyContent:'center'}}>
          <ArcGauge pct={prog} color={color} size={158} label={fmtP(prog)} sublabel="complete"/>
          {p.notes&&<Text style={{fontSize:10,color:D.muted,textAlign:'center',lineHeight:15}} numberOfLines={3}>{p.notes}</Text>}
        </Card>

        {/* CPI / SPI */}
        <View style={{width:160,gap:10}}>
          <Card style={{flex:1,padding:14,alignItems:'center',justifyContent:'center',gap:3,backgroundColor:cpi>=1?D.greenDim:D.redDim,borderColor:cpi>=1?D.green:D.red}}>
            <Text style={{fontSize:10,color:D.sub,letterSpacing:1.5}}>COST PERF.</Text>
            <Text style={{fontSize:38,fontWeight:'900',color:iCol(D,cpi),lineHeight:40}}>{cpi.toFixed(2)}</Text>
            <Text style={{fontSize:10,color:iCol(D,cpi),fontWeight:'700'}}>{cpi>=1?'ON BUDGET':'OVER BUDGET'}</Text>
          </Card>
          <Card style={{flex:1,padding:14,alignItems:'center',justifyContent:'center',gap:3,backgroundColor:spi>=1?D.greenDim:D.redDim,borderColor:spi>=1?D.green:D.red}}>
            <Text style={{fontSize:10,color:D.sub,letterSpacing:1.5}}>SCHED. PERF.</Text>
            <Text style={{fontSize:38,fontWeight:'900',color:iCol(D,spi),lineHeight:40}}>{spi.toFixed(2)}</Text>
            <Text style={{fontSize:10,color:iCol(D,spi),fontWeight:'700'}}>{spi>=1?'ON SCHEDULE':'BEHIND'}</Text>
          </Card>
        </View>

        {/* Manpower — NO worker names */}
        <Card style={{flex:1,padding:16,gap:12}}>
          <SH label="Manpower" color={D.cyan}/>
          <View style={{flexDirection:'row',gap:16,alignItems:'flex-start'}}>
            <View style={{alignItems:'center',gap:8}}>
              <Donut slices={[{v:activeW,c:D.green},{v:workers.length-activeW,c:D.muted}]} size={96} label={String(activeW)} sublabel="active"/>
              <View style={{flexDirection:'row',gap:10}}>
                <View style={{alignItems:'center'}}>
                  <Text style={{fontSize:9,color:D.muted}}>TOTAL</Text>
                  <Text style={{fontSize:15,fontWeight:'800',color:D.text}}>{workers.length}</Text>
                </View>
                <View style={{width:1,backgroundColor:D.border}}/>
                <View style={{alignItems:'center'}}>
                  <Text style={{fontSize:9,color:D.muted}}>OFF</Text>
                  <Text style={{fontSize:15,fontWeight:'800',color:D.muted}}>{workers.length-activeW}</Text>
                </View>
              </View>
            </View>
            <View style={{flex:1,gap:7}}>
              <Text style={{fontSize:9,color:D.muted,letterSpacing:1.5,textTransform:'uppercase',marginBottom:2}}>By Department</Text>
              {depts.slice(0,7).map((d,i)=>(
                <HBar key={d[0]} label={d[0]} v={d[1]} max={depts[0][1]} color={DC[i%7]} sub={String(d[1])}/>
              ))}
            </View>
          </View>
        </Card>

        {/* Milestone Summary — next to manpower */}
        <Card style={{width:220,padding:16,gap:12}}>
          <SH label="Milestone Summary" color={D.accent}/>
          {/* Counts */}
          <View style={{flexDirection:'row',gap:6}}>
            {[{l:'Done',v:msDone,c:D.green},{l:'In Prog',v:msInP,c:D.blue},{l:'Delayed',v:msDel,c:msDel>0?D.red:D.muted}].map(item=>(
              <View key={item.l} style={{flex:1,backgroundColor:item.c+'18',borderWidth:1,borderColor:item.c+'44',padding:8,alignItems:'center',borderRadius:6}}>
                <Text style={{fontSize:8,color:D.muted,letterSpacing:1}}>{item.l.toUpperCase()}</Text>
                <Text style={{fontSize:22,fontWeight:'900',color:item.c}}>{item.v}</Text>
              </View>
            ))}
          </View>
          {/* Phase bars */}
          <View style={{gap:7}}>
            {phases.map(phase=>{
              const phMs=schedule.filter(m=>m.phase===phase);
              const phDone=phMs.filter(m=>m.status==='Done').length;
              const phPct=phMs.length>0?(phDone/phMs.length)*100:0;
              const phCol=phPct===100?D.green:phMs.some(m=>m.status==='Delayed')?D.red:D.blue;
              return(
                <View key={phase} style={{gap:3}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                    <Text style={{fontSize:11,color:D.text}}>{phase}</Text>
                    <Text style={{fontSize:11,color:phCol,fontWeight:'700'}}>{fmtP(phPct)}</Text>
                  </View>
                  <View style={{height:5,backgroundColor:D.bg,borderRadius:3}}>
                    <View style={{height:5,width:`${phPct}%` as any,backgroundColor:phCol,borderRadius:3}}/>
                  </View>
                </View>
              );
            })}
          </View>
          {/* SPI pill */}
          <View style={{backgroundColor:spi>=1?D.greenDim:D.redDim,borderWidth:1,borderColor:spi>=1?D.green:D.red,padding:10,alignItems:'center',borderRadius:8,marginTop:'auto' as any}}>
            <Text style={{fontSize:9,color:D.sub,letterSpacing:1.5}}>SCHEDULE SPI</Text>
            <Text style={{fontSize:26,fontWeight:'900',color:iCol(D,spi),lineHeight:28}}>{spi.toFixed(2)}</Text>
            <Text style={{fontSize:10,color:iCol(D,spi),fontWeight:'700'}}>{spi>=1?'ON SCHEDULE':'BEHIND'}</Text>
          </View>
        </Card>
      </View>

      {/* ══ ROW 3: Budget trend + By Category ══ */}
      <View style={{flexDirection:'row',gap:14}}>
        <Card style={{flex:5,padding:16,gap:10}}>
          <SH label="Budget Monthly Trend" color={D.blue}/>
          {months.length>=2
            ?<ChartBox h={150}>{(cw)=><LineCurve
                series={[{data:mPl,color:D.blue,dashed:true},{data:mAc,color:D.orange}]}
                w={cw} h={150} labels={months.map(m=>m?.slice(5,7)??'')}
              />}</ChartBox>
            :<Text style={{color:D.muted,fontSize:12,height:150,paddingTop:60,textAlign:'center'}}>Not enough data</Text>
          }
          <Legend items={[{label:'Planned',color:D.blue},{label:'Actual',color:D.orange}]}/>
        </Card>
        <Card style={{flex:3,padding:16,gap:10}}>
          <SH label="By Category" color={D.orange}/>
          <View style={{gap:9}}>
            {catData.map(c=>{
              const max=catData[0]?.pl??1,over=c.ac>c.pl;
              return(
                <View key={c.cat} style={{gap:3}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                    <Text style={{fontSize:12,color:D.text,flex:1}} numberOfLines={1}>{c.cat}</Text>
                    <Text style={{fontSize:12,color:over?D.red:D.green,fontWeight:'700'}}>{fmtM(c.ac)}</Text>
                  </View>
                  <View style={{height:4,backgroundColor:D.bg,borderRadius:2}}>
                    <View style={{height:4,width:`${(c.pl/max)*100}%` as any,backgroundColor:D.blue,opacity:0.3,borderRadius:2}}/>
                  </View>
                  <View style={{height:4,marginTop:-4}}>
                    <View style={{height:4,width:`${(c.ac/max)*100}%` as any,backgroundColor:over?D.red:D.green,borderRadius:2}}/>
                  </View>
                </View>
              );
            })}
          </View>
          <Legend items={[{label:'Planned',color:D.blue},{label:'Actual',color:D.green}]}/>
        </Card>
      </View>

      {/* ══ ROW 4: EVM S-Curve + CPI/SPI trend ══ */}
      {evm.length>=2&&(
        <View style={{flexDirection:'row',gap:14}}>
          <Card style={{flex:5,padding:16,gap:10}}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
              <SH label="EVM S-Curve" color={color}/>
              {latestEvm&&(
                <View style={{flexDirection:'row',gap:8}}>
                  {[
                    {l:'EAC',v:fmtM(num(latestEvm.eac_usd)),c:num(latestEvm.eac_usd)>num(latestEvm.bac_usd)?D.red:D.green},
                    {l:'CV', v:(num(latestEvm.cv_usd)>=0?'+':'')+fmtM(num(latestEvm.cv_usd)),c:num(latestEvm.cv_usd)>=0?D.green:D.red},
                    {l:'SV', v:(num(latestEvm.sv_usd)>=0?'+':'')+fmtM(num(latestEvm.sv_usd)),c:num(latestEvm.sv_usd)>=0?D.green:D.red},
                  ].map(item=>(
                    <View key={item.l} style={{backgroundColor:D.bg,borderWidth:1,borderColor:D.border,paddingHorizontal:12,paddingVertical:6,alignItems:'center',minWidth:80,borderRadius:6}}>
                      <Text style={{fontSize:9,color:D.muted,letterSpacing:1}}>{item.l}</Text>
                      <Text style={{fontSize:15,fontWeight:'800',color:item.c}}>{item.v}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <ChartBox h={155}>{(cw)=><LineCurve
              series={[{data:pvS,color:D.blue,dashed:true},{data:evS,color:D.green},{data:acS,color:D.red}]}
              w={cw} h={155} labels={evmMonths}
            />}</ChartBox>
            <Legend items={[{label:'Planned Value',color:D.blue},{label:'Earned Value',color:D.green},{label:'Actual Cost',color:D.red}]}/>
          </Card>
          <Card style={{flex:3,padding:16,gap:10}}>
            <SH label="CPI & SPI Trend" color={color}/>
            <ChartBox h={155}>{(cw)=><LineCurve
              series={[{data:cpiS,color:D.green},{data:spiS,color:D.yellow}]}
              w={cw} h={155} labels={evmMonths} refLine={1}
            />}</ChartBox>
            <Legend items={[{label:'CPI',color:D.green},{label:'SPI',color:D.yellow},{label:'1.0 target',color:D.yellow}]}/>
          </Card>
        </View>
      )}

      {/* ══ ROW 5: Gantt ══ */}
      {schedule.length>0&&(
        <Card style={{padding:16,gap:10}}>
          <SH label="Schedule / Gantt" color={D.accent}/>
          <ChartBox h={schedule.length*26+24}>{(cw)=><Gantt ms={schedule} w={cw} h={schedule.length*26+24}/>}</ChartBox>
          <View style={{flexDirection:'row',gap:12}}>
            {[{l:'Done',c:D.green},{l:'In Progress',c:D.blue},{l:'Delayed',c:D.red},{l:'Pending',c:D.muted}].map(s=>(
              <View key={s.l} style={{flexDirection:'row',alignItems:'center',gap:4}}>
                <View style={{width:8,height:8,backgroundColor:s.c,borderRadius:2}}/>
                <Text style={{fontSize:10,color:D.muted}}>{s.l}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* ══ ROW 6: Issues ══ */}
      {issues.length>0&&(
        <View style={{flexDirection:'row',gap:14}}>
          <Card style={{width:210,padding:16,gap:12}}>
            <SH label="Issues" color={D.red}/>
            <View style={{alignItems:'center'}}>
              <Donut slices={[
                {v:issues.filter(i=>i.status==='Open'&&i.priority==='High').length,c:D.red},
                {v:issues.filter(i=>i.status==='Open'&&i.priority==='Medium').length,c:D.yellow},
                {v:issues.filter(i=>i.status==='Open'&&i.priority==='Low').length,c:D.blue},
                {v:issues.filter(i=>i.status!=='Open').length,c:D.green},
              ]} size={88} label={String(openIss)} sublabel="open"/>
            </View>
            <View style={{gap:6}}>
              {[{l:'High',c:D.red},{l:'Medium',c:D.yellow},{l:'Low',c:D.blue},{l:'Resolved',c:D.green}].map(row=>{
                const cnt=row.l==='Resolved'?issues.filter(i=>i.status!=='Open').length:issues.filter(i=>i.status==='Open'&&i.priority===row.l).length;
                return(
                  <View key={row.l} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                      <View style={{width:8,height:8,borderRadius:4,backgroundColor:row.c}}/>
                      <Text style={{fontSize:12,color:D.sub}}>{row.l}</Text>
                    </View>
                    <Text style={{fontSize:14,color:row.c,fontWeight:'800'}}>{cnt}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
          <Card style={{flex:1,padding:16,gap:6}}>
            <SH label="Open Issues" color={D.red}/>
            {issues.filter(i=>i.status==='Open').length===0
              ?<View style={{flex:1,alignItems:'center',justifyContent:'center',padding:20}}>
                  <Text style={{fontSize:14,color:D.green,fontWeight:'700'}}>✓ No open issues</Text>
                </View>
              :issues.filter(i=>i.status==='Open').slice(0,10).map((iss,i)=>{
                const pc=iss.priority==='High'?D.red:iss.priority==='Medium'?D.yellow:D.blue;
                return(
                  <View key={i} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:D.border}}>
                    <View style={{paddingHorizontal:7,paddingVertical:2,backgroundColor:pc+'18',borderWidth:1,borderColor:pc,borderRadius:4}}>
                      <Text style={{fontSize:9,color:pc,fontWeight:'800',letterSpacing:1}}>{iss.priority?.toUpperCase()??'—'}</Text>
                    </View>
                    <Text style={{flex:1,fontSize:12,color:D.text}} numberOfLines={1}>{iss.title}</Text>
                    {iss.assigned_to&&<Text style={{fontSize:10,color:D.sub}}>{iss.assigned_to}</Text>}
                    {iss.due_date&&<Text style={{fontSize:10,color:D.muted}}>{iss.due_date}</Text>}
                  </View>
                );
              })
            }
          </Card>
        </View>
      )}

    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// WEB LAYOUT
// ════════════════════════════════════════════════════════════════
const MAX_W = 1400;

function WebLayout({data}:{data:SheetData}) {
  const {D,isDark,toggleTheme} = useTheme();
  const PC = getPC(D);
  const [activeIdx,setActiveIdx]=useState(0);
  const [tvMode,setTvMode]=useState(false);
  const projects=data.projects;
  const p=projects[activeIdx];
  const color=PC[activeIdx%3];

  return(
    <View style={{flex:1,backgroundColor:D.bg}}>
      <Stack.Screen options={{headerShown:false}}/>

      {/* Project tabs — centred */}
      <View style={{backgroundColor:D.panel,borderBottomWidth:1,borderBottomColor:D.border,alignItems:'center',
        shadowColor:'rgba(0,0,0,0.05)',shadowOffset:{width:0,height:2},shadowOpacity:1,shadowRadius:4,elevation:2}}>
        <View style={{flexDirection:'row',alignItems:'center',maxWidth:tvMode?undefined:MAX_W,width:'100%' as any,paddingHorizontal:24}}>
          <View style={{flex:1,flexDirection:'row',justifyContent:'center'}}>
            {projects.map((proj,i)=>{
              const on=i===activeIdx;
              const col=PC[i%3];
              return(
                <TouchableOpacity key={proj.project_id} onPress={()=>setActiveIdx(i)}
                  style={{paddingHorizontal:tvMode?18:28,paddingVertical:tvMode?9:15,borderBottomWidth:3,
                    borderBottomColor:on?col:'transparent',marginBottom:-1,
                    flexDirection:'row',alignItems:'center',gap:8}}>
                  <View style={{width:8,height:8,borderRadius:4,backgroundColor:on?col:D.muted}}/>
                  <Text style={{fontSize:tvMode?12:14,fontWeight:'800',letterSpacing:0.3,color:on?D.text:D.sub}}>{proj.project_name}</Text>
                  <View style={{paddingHorizontal:7,paddingVertical:2,backgroundColor:sCol(D,proj.status)+'18',
                    borderWidth:1,borderColor:sCol(D,proj.status)+'66',borderRadius:4}}>
                    <Text style={{fontSize:9,color:sCol(D,proj.status),fontWeight:'800',letterSpacing:0.8}}>{proj.status.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Theme + TV toggles */}
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            {/* Theme toggle */}
            <TouchableOpacity onPress={toggleTheme}
              style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:6,
                borderRadius:6,borderWidth:1,borderColor:D.border,backgroundColor:D.bg}}>
              <Text style={{fontSize:14}}>{isDark?'☀️':'🌙'}</Text>
              <Text style={{fontSize:10,fontWeight:'800',letterSpacing:1,color:D.muted}}>
                {isDark?'LIGHT':'DARK'}
              </Text>
            </TouchableOpacity>
            {/* TV mode toggle */}
            <TouchableOpacity onPress={()=>setTvMode(v=>!v)}
              style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:6,
                borderRadius:6,borderWidth:1,borderColor:tvMode?D.accent:D.border,
                backgroundColor:tvMode?D.accentDim:D.bg}}>
              <View style={{width:14,height:10,borderRadius:2,borderWidth:1.5,borderColor:tvMode?D.accent:D.muted}}/>
              <Text style={{fontSize:10,fontWeight:'800',letterSpacing:1,color:tvMode?D.accent:D.muted}}>
                {tvMode?'EXIT TV':'TV MODE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Dashboard */}
      {tvMode ? (
        <View style={{flex:1,padding:12}}>
          {p?<ProjectDashboardTV p={p} data={data} color={color}/>:null}
        </View>
      ) : (
        <ScrollView style={{flex:1}} contentContainerStyle={{alignItems:'center',paddingVertical:24,paddingBottom:40}}>
          <View style={{width:'100%' as any,maxWidth:MAX_W,paddingHorizontal:24}}>
            {p?<ProjectDashboard p={p} data={data} color={color}/>:null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// MOBILE HOME
// ════════════════════════════════════════════════════════════════
function MobileHome({data}:{data:SheetData}) {
  const {D} = useTheme();
  const PC = getPC(D);
  const router=useRouter();
  return(
    <ScrollView style={{flex:1,backgroundColor:D.bg}} contentContainerStyle={{padding:14,gap:12}}>
      <Stack.Screen options={{
        headerShown:true,title:'ISKER',headerTitleAlign:'center',
        headerStyle:{backgroundColor:D.panel},
        headerTitleStyle:{color:D.text,fontWeight:'800',fontSize:16,letterSpacing:3},
        headerShadowVisible:false,
      }}/>
      {data.projects.map((p,i)=>{
        const prog=num(p.progress_pct),cpi=num(p.cpi),spi=num(p.spi);
        const col=PC[i%3];
        return(
          <TouchableOpacity key={p.project_id}
            style={{backgroundColor:D.card,borderRadius:12,borderWidth:1,borderColor:D.border,
              borderTopWidth:4,borderTopColor:col,padding:16,gap:12,
              shadowColor:'rgba(0,0,0,0.06)',shadowOffset:{width:0,height:2},shadowOpacity:1,shadowRadius:6,elevation:2}}
            onPress={()=>router.push({pathname:'/project/[id]',params:{id:p.project_id}})}>
            <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
              <View style={{width:8,height:8,borderRadius:4,backgroundColor:sCol(D,p.status)}}/>
              <Text style={{color:sCol(D,p.status),fontSize:10,fontWeight:'700',letterSpacing:1}}>{p.status.toUpperCase()}</Text>
            </View>
            <Text style={{color:D.text,fontSize:18,fontWeight:'900'}}>{p.project_name}</Text>
            <Text style={{color:D.muted,fontSize:12}}>{p.location}</Text>
            <View style={{alignItems:'center'}}>
              <ArcGauge pct={prog} color={col} size={140} label={fmtP(prog)} sublabel="progress"/>
            </View>
            <View style={{flexDirection:'row',gap:10}}>
              <View style={{flex:1,backgroundColor:cpi>=1?D.greenDim:D.redDim,padding:10,alignItems:'center',
                borderWidth:1,borderColor:cpi>=1?D.green:D.red,borderRadius:8}}>
                <Text style={{fontSize:10,color:D.sub}}>CPI</Text>
                <Text style={{fontSize:20,fontWeight:'900',color:iCol(D,cpi)}}>{cpi.toFixed(2)}</Text>
              </View>
              <View style={{flex:1,backgroundColor:spi>=1?D.greenDim:D.redDim,padding:10,alignItems:'center',
                borderWidth:1,borderColor:spi>=1?D.green:D.red,borderRadius:8}}>
                <Text style={{fontSize:10,color:D.sub}}>SPI</Text>
                <Text style={{fontSize:20,fontWeight:'900',color:iCol(D,spi)}}>{spi.toFixed(2)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const [isDark,setIsDark]=useState(false);
  const D = isDark?DARK:LIGHT;
  const toggleTheme=()=>setIsDark(v=>!v);

  return(
    <ThemeContext.Provider value={{D,isDark,toggleTheme}}>
      <HomeScreenInner/>
    </ThemeContext.Provider>
  );
}

function HomeScreenInner() {
  const {D}=useTheme();
  const {data,loading,error,refresh}=useSheetData();
  const {width}=useWindowDimensions();
  const isWeb=Platform.OS==='web'&&width>=768;

  if(loading)return(
    <View style={{flex:1,backgroundColor:D.bg,alignItems:'center',justifyContent:'center',gap:12}}>
      <Stack.Screen options={{headerShown:false}}/>
      <View style={{width:40,height:40,borderRadius:20,backgroundColor:D.blue,opacity:0.15}}/>
      <Text style={{color:D.muted,fontSize:16,letterSpacing:3,fontWeight:'600'}}>LOADING...</Text>
    </View>
  );

  if(error||!data)return(
    <View style={{flex:1,backgroundColor:D.bg,alignItems:'center',justifyContent:'center',gap:16}}>
      <Stack.Screen options={{headerShown:false}}/>
      <Text style={{color:D.red,fontSize:16,fontWeight:'600'}}>⚠ {error??'No data'}</Text>
      <TouchableOpacity onPress={refresh}
        style={{paddingHorizontal:20,paddingVertical:12,backgroundColor:D.blue,borderRadius:8}}>
        <Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return isWeb?<WebLayout data={data}/>:<MobileHome data={data}/>;
}
