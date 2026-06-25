import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { View, Text, Platform, useWindowDimensions, ScrollView, TouchableOpacity, TextInput, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, G, Text as ST, Line, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useSheetData, SheetData, Project, Worker, BudgetRow, Milestone, EvmRow, Issue } from '../hooks/useSheetData';
import { getJSON, setJSON } from '../hooks/useStorage';
import { SHEET_ID as DEFAULT_SHEET_ID } from '../constants';

// ── Theme palettes ──────────────────────────────────────────────────
const LIGHT = {
  bg:'#f5f6f8',       panel:'#ffffff',    card:'#ffffff',     border:'#e8e9ed',
  text:'#15161a',     sub:'#6b6d76',      muted:'#9b9da6',
  green:'#34b378',    greenDim:'#e6f7ee',
  red:'#e8604a',      redDim:'#fdeae5',
  yellow:'#e0a830',   yellowDim:'#fdf3e0',
  blue:'#5aa8e8',     blueDim:'#e9f3fd',
  accent:'#c4895a',   accentDim:'#f6ece1',
  orange:'#f5a558',   orangeDim:'#fdf0e1',
  cyan:'#5aa8e8',     cyanDim:'#e9f3fd',
  shadow:'rgba(15,16,20,0.06)',
};

const DARK = {
  bg:'#0e0f12',       panel:'#15161a',    card:'#1a1b20',     border:'#262830',
  text:'#f0f1f4',     sub:'#8e9099',      muted:'#4a4c55',
  green:'#5fa97f',    greenDim:'#13201a',
  red:'#d97a5c',      redDim:'#241510',
  yellow:'#d6a84f',   yellowDim:'#241e10',
  blue:'#7fb0d4',     blueDim:'#10202c',
  accent:'#c98a52',   accentDim:'#221a10',
  orange:'#e8a667',   orangeDim:'#241c10',
  cyan:'#7fb0d4',     cyanDim:'#10202c',
  shadow:'rgba(0,0,0,0.45)',
};

type Palette = typeof LIGHT;

// ── Theme context ─────────────────────────────────────────────────
const ThemeContext = createContext<{D:Palette;isDark:boolean;toggleTheme:()=>void}>({
  D:LIGHT, isDark:false, toggleTheme:()=>{},
});
function useTheme(){ return useContext(ThemeContext); }

// ── Helpers (theme-aware, take D as first arg) ──────────────────────
const getPC = (D:Palette) => [D.blue, D.accent, D.orange];
const getDC = (D:Palette) => [
  D.blue, D.orange, D.green, D.yellow, D.red,
  '#9b7fd4', '#4fb8a8', '#e8869a', '#6fa86f', '#c9986b',
];

const num  = (v:any) => parseFloat(String(v??0).replace(/\s/g,'').replace(',','.')) || 0;
const fmtM = (v:number) => v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${v.toFixed(0)}`;
const fmtP = (v:number) => `${Math.round(v)}%`;
const sCol = (D:Palette,s:string) => ['On Track','Active','Resolved','Done'].includes(s)?D.green:s==='Delayed'?D.red:D.blue;
const iCol = (D:Palette,v:number) => v>=1?D.green:D.red;


// ── Responsive breakpoints ────────────────────────────────────────
function useResponsive() {
  const {width} = useWindowDimensions();
  return {
    isNarrow: width < 900,   // tablet / small laptop
    isMid:    width < 1200,  // medium laptop
    isWide:   width >= 1200, // large monitor / TV
    colW: (cols:number, gap=14) => Math.floor((Math.min(width-48, 1352) - gap*(cols-1)) / cols),
  };
}

// ── Card wrapper ──────────────────────────────────────────────────
function Card({children,style}:{children:React.ReactNode;style?:any}) {
  const {D} = useTheme();
  return (
    <View style={[{
      backgroundColor:D.card, borderRadius:20,
      borderWidth:1, borderColor:D.border,
      shadowColor:D.shadow, shadowOffset:{width:0,height:4},
      shadowOpacity:1, shadowRadius:14, elevation:3,
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
    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:14}}>
      <View style={{width:4,height:18,backgroundColor:c,borderRadius:2}}/>
      <Text style={{fontSize:15,fontWeight:'800',color:D.text,letterSpacing:0.2}}>{label}</Text>
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
  // Soft semi-circle gauge, no needle, no segment ticks — just a smooth
  // progress arc over a pale 3-stop gradient track, like the reference.
  const cx=size/2, cy=size*0.58, r=size*0.40, sw=size*0.13;
  const p=Math.min(1,Math.max(0,pct/100));
  const toR=(d:number)=>d*Math.PI/180;
  const S=180, ARC=180; // clean half-circle, flat ends
  const apt=(d:number)=>({x:cx+r*Math.cos(toR(d)),y:cy+r*Math.sin(toR(d))});
  const arc=(f:number,t:number)=>{const s=apt(f),e=apt(t),lg=t-f>180?1:0;return`M${s.x},${s.y} A${r},${r} 0 ${lg} 1 ${e.x},${e.y}`;};
  const endD=S+ARC*p;
  const gid = `gauge-grad-${Math.round(size)}`;
  return (
    <Svg width={size} height={size*0.66}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={1}/>
          <Stop offset="1" stopColor={D.yellow} stopOpacity={1}/>
        </LinearGradient>
      </Defs>
      {/* pale track */}
      <Path d={arc(S,S+ARC)} fill="none" stroke={D.border} strokeWidth={sw} strokeLinecap="round"/>
      {/* progress arc with soft gradient */}
      {p>0.001&&<Path d={arc(S,endD)} fill="none" stroke={`url(#${gid})`} strokeWidth={sw} strokeLinecap="round"/>}
      <ST x={cx} y={cy+r*0.05} textAnchor="middle" fontFamily="System" fontSize={size*0.20} fontWeight="800" fill={D.text}>{label??fmtP(pct)}</ST>
      {sublabel&&<ST x={cx} y={cy+r*0.36} textAnchor="middle" fontFamily="System" fontSize={size*0.10} fontWeight="500" fill={D.muted}>{sublabel}</ST>}
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
      {label&&<ST x={cx} y={sublabel?cy-2:cy+5} textAnchor="middle" fontFamily="System" fontSize={size*0.19} fontWeight="800" fill={D.text}>{label}</ST>}
      {sublabel&&<ST x={cx} y={cy+size*0.13} textAnchor="middle" fontFamily="System" fontSize={size*0.1} fontWeight="500" fill={D.muted}>{sublabel}</ST>}
    </Svg>
  );
}

// ── Line / S-Curve ────────────────────────────────────────────────
function LineCurve({series,w,h,labels,refLine}:{
  series:{data:number[];color:string;dashed?:boolean;strokeWidth?:number}[];
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
          <ST fontFamily="System" x={pL-4} y={y+4} textAnchor="end" fontSize={9} fill={D.muted}>{t>=1e6?`${(t/1e6).toFixed(1)}M`:t>=1e3?`${(t/1e3).toFixed(0)}K`:t<10?t.toFixed(2):t.toFixed(0)}</ST>
        </G>;
      })}
      {refLine!=null&&(()=>{const y=pT+(1-(refLine-mn)/(mx-mn))*ch;return<Line x1={pL} y1={y} x2={w-pR} y2={y} stroke={D.yellow} strokeWidth={1.5} strokeDasharray="5,3"/>;})()}
      {series.map((s,si)=>{
        const pts=s.data.map((v,i)=>toXY(v,i,s.data.length));
        const d=pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
        const area=`${d} L${pts[pts.length-1].x},${pT+ch} L${pts[0].x},${pT+ch} Z`;
        return<G key={si}>
          <Path d={area} fill={`url(#lg${si})`}/>
          <Path d={d} fill="none" stroke={s.color} strokeWidth={s.strokeWidth??(s.dashed?2:2.5)} strokeDasharray={s.dashed?'6,3':undefined} strokeLinejoin="round"/>
          {pts.map((p,i)=><Circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color}/>)}
        </G>;
      })}
      {labels&&labels.map((l,i)=>{
        const x=pL+(i/(n-1))*cw;
        return<ST fontFamily="System" key={i} x={x} y={h-5} textAnchor="middle" fontSize={9} fill={D.muted}>{l}</ST>;
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
          <ST fontFamily="System" x={cx-(grouped?bw/2+1:0)} y={y-4} textAnchor="middle" fontSize={10} fill={b.color} fontWeight="700">{lbl}</ST>
          {grouped&&b.v2!=null&&<>
            <Rect x={x2} y={y2} width={bw} height={bh2} fill={b.c2??D.orange} opacity={0.7} rx={3}/>
            <ST fontFamily="System" x={cx+bw/2+1} y={y2-4} textAnchor="middle" fontSize={10} fill={b.c2??D.orange} fontWeight="700">{lbl2}</ST>
          </>}
          <ST fontFamily="System" x={cx} y={h-6} textAnchor="middle" fontSize={9} fill={D.muted}>{b.label}</ST>
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
      <View style={{height:7,backgroundColor:D.border,borderRadius:4}}>
        <View style={{height:7,width:`${Math.min(pct,100)}%` as any,backgroundColor:color,borderRadius:4}}/>
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
          <ST fontFamily="System" x={pL-6} y={y+rowH*0.67} textAnchor="end" fontSize={9} fill={D.sub}>{(m.milestone_name??'').slice(0,14)}</ST>
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
          <ST fontFamily="System" x={pL-6} y={y+rowH*0.65} textAnchor="end" fontSize={fontSize} fill={D.sub}>{(m.milestone_name??'').slice(0,Math.floor(pL/6))}</ST>
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
  const [openModal,setOpenModal] = useState<'milestones'|'budget'|null>(null);

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

  const cats=[...new Set(budget.map(b=>b.category))];
  const catData=cats.map(cat=>{
    const rows=budget.filter(b=>b.category===cat);
    return{cat,pl:rows.reduce((s,r)=>s+num(r.planned_usd),0),ac:rows.reduce((s,r)=>s+num(r.actual_usd),0)};
  }).sort((a,b)=>b.pl-a.pl).slice(0,10);

  const phases=[...new Set(schedule.map(m=>m.phase))].filter(Boolean) as string[];
  const msDone=schedule.filter(m=>m.status==='Done').length;
  const msInP =schedule.filter(m=>m.status==='In Progress').length;
  const msDel =schedule.filter(m=>m.status==='Delayed').length;

  return(
    <View style={{flex:1,gap:14}}>

      {/* ══ HEADER STRIP ══ */}
      <Card style={{borderLeftWidth:5,borderLeftColor:color,paddingVertical:14,paddingHorizontal:22,
        flexDirection:'row',alignItems:'center',gap:18}}>
        <View style={{gap:2}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
            <View style={{width:7,height:7,borderRadius:3.5,backgroundColor:sCol(D,p.status)}}/>
            <Text style={{fontSize:11,color:sCol(D,p.status),fontWeight:'800',letterSpacing:1}}>{p.status.toUpperCase()}</Text>
          </View>
          <Text style={{fontSize:23,color:D.text,fontWeight:'900'}}>{p.project_name}</Text>
          <Text style={{fontSize:12,color:D.sub}}>{p.client} · {p.location}</Text>
        </View>
        <View style={{flex:1}}/>
        <View style={{flexDirection:'row',gap:10}}>
          {[
            {l:'Budget',v:fmtM(total),c:D.text},
            {l:'Spent',v:fmtM(spent),c:bCol,s:fmtP(bPct)},
            {l:'CPI',v:cpi.toFixed(2),c:iCol(D,cpi)},
            {l:'SPI',v:spi.toFixed(2),c:iCol(D,spi)},
          ].map(kpi=>(
            <View key={kpi.l} style={{backgroundColor:D.bg,borderRadius:12,borderWidth:1,borderColor:D.border,paddingHorizontal:16,paddingVertical:8,alignItems:'center',minWidth:84}}>
              <Text style={{fontSize:10,color:D.muted,letterSpacing:1,textTransform:'uppercase'}}>{kpi.l}</Text>
              <Text style={{fontSize:20,fontWeight:'900',color:kpi.c,lineHeight:23}}>{kpi.v}</Text>
              {kpi.s&&<Text style={{fontSize:10,color:D.muted}}>{kpi.s}</Text>}
            </View>
          ))}
        </View>
      </Card>

      {/* ══ ROW 1: Gauge | CPI/SPI | Milestones (full) ══ */}
      <View style={{flex:5,flexDirection:'row',gap:14}}>

        {/* Gauge */}
        <Card style={{flex:1.2,minWidth:150,maxWidth:220,padding:14,alignItems:'center',justifyContent:'center'}}>
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
        <View style={{width:170,gap:12}}>
          <Card style={{flex:1,alignItems:'center',justifyContent:'center',gap:3,
            backgroundColor:cpi>=1?D.greenDim:D.redDim,borderColor:cpi>=1?D.green:D.red}}>
            <Text style={{fontSize:11,color:D.sub,letterSpacing:1.5}}>CPI</Text>
            <Text style={{fontSize:38,fontWeight:'900',color:iCol(D,cpi),lineHeight:41}}>{cpi.toFixed(2)}</Text>
            <Text style={{fontSize:11,color:iCol(D,cpi),fontWeight:'700'}}>{cpi>=1?'ON BUDGET':'OVER BUDGET'}</Text>
          </Card>
          <Card style={{flex:1,alignItems:'center',justifyContent:'center',gap:3,
            backgroundColor:spi>=1?D.greenDim:D.redDim,borderColor:spi>=1?D.green:D.red}}>
            <Text style={{fontSize:11,color:D.sub,letterSpacing:1.5}}>SPI</Text>
            <Text style={{fontSize:38,fontWeight:'900',color:iCol(D,spi),lineHeight:41}}>{spi.toFixed(2)}</Text>
            <Text style={{fontSize:11,color:iCol(D,spi),fontWeight:'700'}}>{spi>=1?'ON SCHEDULE':'BEHIND'}</Text>
          </Card>
        </View>

        {/* Milestones — truncated phase list + View all on TV */}
        <Card style={{flex:1.6,padding:18,gap:10}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <SH label="Milestones" color={D.cyan}/>
            <View style={{flexDirection:'row',gap:8}}>
              {[{l:'Done',v:msDone,c:D.green},{l:'In Prog',v:msInP,c:D.blue},{l:'Delayed',v:msDel,c:msDel>0?D.red:D.muted}].map(item=>(
                <View key={item.l} style={{backgroundColor:item.c+'18',borderWidth:1,borderColor:item.c+'44',
                  paddingHorizontal:11,paddingVertical:6,borderRadius:8,alignItems:'center'}}>
                  <Text style={{fontSize:9,color:D.muted,letterSpacing:1}}>{item.l.toUpperCase()}</Text>
                  <Text style={{fontSize:18,fontWeight:'900',color:item.c}}>{item.v}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{flex:1,gap:8,justifyContent:'center'}}>
            {phases.slice(0,6).map(phase=>{
              const phMs=schedule.filter(m=>m.phase===phase);
              const phDone=phMs.filter(m=>m.status==='Done').length;
              const phPct=phMs.length>0?(phDone/phMs.length)*100:0;
              const phCol=phPct===100?D.green:phMs.some(m=>m.status==='Delayed')?D.red:D.blue;
              return(
                <View key={phase} style={{gap:4}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                    <Text style={{fontSize:13,color:D.text,fontWeight:'600'}} numberOfLines={1}>{phase}</Text>
                    <Text style={{fontSize:13,color:phCol,fontWeight:'800'}}>{fmtP(phPct)}</Text>
                  </View>
                  <View style={{height:14,backgroundColor:D.bg,borderRadius:7}}>
                    <View style={{height:14,width:`${phPct}%` as any,backgroundColor:phCol,borderRadius:7}}/>
                  </View>
                </View>
              );
            })}
          </View>
          {phases.length>6&&<ViewAllPill onPress={()=>setOpenModal('milestones')} count={phases.length} color={D.cyan}/>}
        </Card>
      </View>

      {/* ══ Milestones detail modal ══ */}
      {openModal==='milestones'&&(
        <DetailModal title="Milestones — All Phases" color={D.cyan} onClose={()=>setOpenModal(null)}>
          <View style={{gap:16}}>
            {phases.map(phase=>{
              const phMs=schedule.filter(m=>m.phase===phase);
              const phDone=phMs.filter(m=>m.status==='Done').length;
              const phPct=phMs.length>0?(phDone/phMs.length)*100:0;
              const phCol=phPct===100?D.green:phMs.some(m=>m.status==='Delayed')?D.red:D.blue;
              return(
                <View key={phase} style={{gap:6}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                    <Text style={{fontSize:16,color:D.text,fontWeight:'700'}}>{phase}</Text>
                    <Text style={{fontSize:16,color:phCol,fontWeight:'800'}}>{fmtP(phPct)}</Text>
                  </View>
                  <View style={{height:16,backgroundColor:D.bg,borderRadius:8}}>
                    <View style={{height:16,width:`${phPct}%` as any,backgroundColor:phCol,borderRadius:8}}/>
                  </View>
                  <Text style={{fontSize:12,color:D.muted}}>{phDone} of {phMs.length} milestones done</Text>
                </View>
              );
            })}
          </View>
        </DetailModal>
      )}

      {/* ══ ROW 2: EVM S-Curve | CPI/SPI Trend | Budget by Category (full) ══ */}
      {evm.length>=2&&(
        <View style={{flex:6,flexDirection:'row',gap:14}}>
          <Card style={{flex:3,padding:22,gap:12}}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
              <SH label="EVM S-Curve" color={color}/>
              {latestEvm&&(
                <View style={{flexDirection:'row',gap:8}}>
                  {[
                    {l:'EAC',v:fmtM(num(latestEvm.eac_usd)),c:num(latestEvm.eac_usd)>num(latestEvm.bac_usd)?D.red:D.green},
                    {l:'CV', v:(num(latestEvm.cv_usd)>=0?'+':'')+fmtM(num(latestEvm.cv_usd)),c:num(latestEvm.cv_usd)>=0?D.green:D.red},
                    {l:'SV', v:(num(latestEvm.sv_usd)>=0?'+':'')+fmtM(num(latestEvm.sv_usd)),c:num(latestEvm.sv_usd)>=0?D.green:D.red},
                  ].map(item=>(
                    <View key={item.l} style={{backgroundColor:D.bg,borderWidth:1,borderColor:D.border,paddingHorizontal:14,paddingVertical:7,alignItems:'center',borderRadius:10,minWidth:82}}>
                      <Text style={{fontSize:10,color:D.muted,letterSpacing:1}}>{item.l}</Text>
                      <Text style={{fontSize:16,fontWeight:'800',color:item.c}}>{item.v}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <ChartBox2>{(cw,ch)=><LineCurve
              series={[{data:pvS,color:D.blue,dashed:true,strokeWidth:3},{data:evS,color:D.green,strokeWidth:3},{data:acS,color:D.red,strokeWidth:3}]}
              w={cw} h={ch} labels={evmMonths}
            />}</ChartBox2>
            <Legend items={[{label:'Planned Value',color:D.blue},{label:'Earned Value',color:D.green},{label:'Actual Cost',color:D.red}]}/>
          </Card>
          <Card style={{flex:2,padding:22,gap:12}}>
            <SH label="CPI & SPI Trend" color={color}/>
            <ChartBox2>{(cw,ch)=><LineCurve
              series={[{data:cpiS,color:D.green,strokeWidth:3},{data:spiS,color:D.yellow,strokeWidth:3}]}
              w={cw} h={ch} labels={evmMonths} refLine={1}
            />}</ChartBox2>
            <Legend items={[{label:'CPI',color:D.green},{label:'SPI',color:D.yellow},{label:'1.0',color:D.muted}]}/>
          </Card>
          <Card style={{flex:1.8,padding:18,gap:10}}>
            <SH label="Budget by Category" color={D.orange}/>
            <View style={{alignItems:'center'}}>
              <Donut
                slices={catData.map((c,i)=>({v:c.ac,c:DC[i%DC.length]}))}
                size={108}
                label={fmtM(catData.reduce((s,c)=>s+c.ac,0))}
                sublabel="actual"
              />
            </View>
            <View style={{flex:1,gap:9}}>
                {catData.slice(0,5).map((c,i)=>{
                  const over=c.ac>c.pl;
                  const pct=c.pl>0?Math.round((c.ac/c.pl)*100):0;
                  return(
                    <View key={c.cat} style={{gap:4}}>
                      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                        <View style={{flexDirection:'row',alignItems:'center',gap:7,flex:1}}>
                          <View style={{width:9,height:9,borderRadius:4.5,backgroundColor:DC[i%DC.length]}}/>
                          <Text style={{fontSize:13,color:D.text,flex:1,fontWeight:'600'}} numberOfLines={1}>{c.cat}</Text>
                        </View>
                        <Text style={{fontSize:13,fontWeight:'800',color:over?D.red:D.green}}>{pct}%</Text>
                      </View>
                      <View style={{height:14,backgroundColor:D.bg,borderRadius:7,overflow:'hidden'}}>
                        <View style={{height:14,width:`${Math.min(pct,100)}%` as any,backgroundColor:over?D.red:DC[i%DC.length],borderRadius:7}}/>
                      </View>
                    </View>
                  );
                })}
            </View>
            {catData.length>5&&<ViewAllPill onPress={()=>setOpenModal('budget')} count={catData.length} color={D.orange}/>}
          </Card>
        </View>
      )}

      {/* ══ Budget by Category detail modal ══ */}
      {openModal==='budget'&&(
        <DetailModal title="Budget by Category — Full Breakdown" color={D.orange} onClose={()=>setOpenModal(null)}>
          <View style={{alignItems:'center',marginBottom:20}}>
            <Donut
              slices={catData.map((c,i)=>({v:c.ac,c:DC[i%DC.length]}))}
              size={160}
              label={fmtM(catData.reduce((s,c)=>s+c.ac,0))}
              sublabel="actual"
            />
          </View>
          <View style={{gap:14}}>
            {catData.map((c,i)=>{
              const over=c.ac>c.pl;
              const pct=c.pl>0?Math.round((c.ac/c.pl)*100):0;
              return(
                <View key={c.cat} style={{gap:6}}>
                  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8,flex:1}}>
                      <View style={{width:11,height:11,borderRadius:5.5,backgroundColor:DC[i%DC.length]}}/>
                      <Text style={{fontSize:15,color:D.text,flex:1,fontWeight:'600'}} numberOfLines={1}>{c.cat}</Text>
                    </View>
                    <Text style={{fontSize:13,color:D.muted,marginRight:10}}>{fmtM(c.ac)} / {fmtM(c.pl)}</Text>
                    <Text style={{fontSize:15,fontWeight:'800',color:over?D.red:D.green}}>{pct}%</Text>
                  </View>
                  <View style={{height:16,backgroundColor:D.bg,borderRadius:8,overflow:'hidden'}}>
                    <View style={{height:16,width:`${Math.min(pct,100)}%` as any,backgroundColor:over?D.red:DC[i%DC.length],borderRadius:8}}/>
                  </View>
                </View>
              );
            })}
          </View>
        </DetailModal>
      )}

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
  const {isNarrow,isMid} = useResponsive();

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
  }).sort((a,b)=>b.pl-a.pl).slice(0,10);

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

      {/* ══ ROW 2: Gauge + CPI/SPI + Milestones + Budget by Category ══ */}
      <View style={{flexDirection:isNarrow?'column':'row',gap:14}}>

        {/* Gauge */}
        <Card style={{flex:1.2,minWidth:160,maxWidth:220,padding:16,alignItems:'center',gap:10,justifyContent:'center'}}>
          <ArcGauge pct={prog} color={color} size={158} label={fmtP(prog)} sublabel="complete"/>
          {p.notes&&<Text style={{fontSize:10,color:D.muted,textAlign:'center',lineHeight:15}} numberOfLines={3}>{p.notes}</Text>}
        </Card>

        {/* CPI / SPI */}
        <View style={{flex:1,minWidth:130,maxWidth:180,gap:10}}>
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

        {/* Milestones */}
        <Card style={{flex:2,padding:16,gap:14}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <SH label="Milestones" color={D.cyan}/>
            <View style={{flexDirection:'row',gap:6}}>
              {[{l:'Done',v:msDone,c:D.green},{l:'In Prog',v:msInP,c:D.blue},{l:'Delayed',v:msDel,c:msDel>0?D.red:D.muted}].map(item=>(
                <View key={item.l} style={{backgroundColor:item.c+'18',borderWidth:1,borderColor:item.c+'44',
                  paddingHorizontal:10,paddingVertical:5,borderRadius:6,alignItems:'center',minWidth:58}}>
                  <Text style={{fontSize:8,color:D.muted,letterSpacing:1}}>{item.l.toUpperCase()}</Text>
                  <Text style={{fontSize:18,fontWeight:'900',color:item.c}}>{item.v}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{flex:1,gap:6}}>
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
                  <View style={{height:14,backgroundColor:D.bg,borderRadius:7}}>
                    <View style={{height:14,width:`${phPct}%` as any,backgroundColor:phCol,borderRadius:7}}/>
                  </View>
                </View>
              );
            })}
            <View style={{backgroundColor:spi>=1?D.greenDim:D.redDim,borderWidth:1,
              borderColor:spi>=1?D.green:D.red,padding:8,borderRadius:6,
              flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
              <Text style={{fontSize:10,color:D.sub,letterSpacing:1}}>SCHEDULE SPI</Text>
              <Text style={{fontSize:18,fontWeight:'900',color:iCol(D,spi)}}>{spi.toFixed(2)}
                <Text style={{fontSize:10,fontWeight:'600'}}> {spi>=1?'✓ on track':'⚠ behind'}</Text>
              </Text>
            </View>
          </View>
        </Card>

        {/* Budget by Category */}
        <Card style={{flex:2,padding:16,gap:14}}>
          <SH label="Budget by Category" color={D.orange}/>
          <View style={{alignItems:'center'}}>
            <Donut
              slices={catData.map((c,i)=>({v:c.ac,c:DC[i%7]}))}
              size={104}
              label={fmtM(catData.reduce((s,c)=>s+c.ac,0))}
              sublabel="actual"
            />
          </View>
          <View style={{flex:1,gap:10,justifyContent:'center'}}>
            {catData.map((c,i)=>{
              const max=catData[0]?.pl??1,over=c.ac>c.pl;
              const pct=c.pl>0?Math.round((c.ac/c.pl)*100):0;
              return(
                <View key={c.cat} style={{gap:4}}>
                  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
                      <View style={{width:8,height:8,borderRadius:4,backgroundColor:DC[i%7]}}/>
                      <Text style={{fontSize:12,color:D.text,flex:1}} numberOfLines={1}>{c.cat}</Text>
                    </View>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                      <Text style={{fontSize:11,color:D.muted}}>{fmtM(c.ac)}</Text>
                      <Text style={{fontSize:11,fontWeight:'800',color:over?D.red:D.green,minWidth:36,textAlign:'right'}}>{pct}%</Text>
                    </View>
                  </View>
                  <View style={{height:14,backgroundColor:D.bg,borderRadius:7,overflow:'hidden'}}>
                    <View style={{position:'absolute',top:0,left:0,height:14,width:`${(c.pl/max)*100}%` as any,backgroundColor:DC[i%7],opacity:0.25,borderRadius:7}}/>
                    <View style={{position:'absolute',top:0,left:0,height:14,width:`${(c.ac/max)*100}%` as any,backgroundColor:over?D.red:DC[i%7],opacity:0.85,borderRadius:7}}/>
                  </View>
                </View>
              );
            })}
          </View>
          <Legend items={[{label:'Planned',color:D.blue},{label:'Actual',color:D.green}]}/>
        </Card>
      </View>

      {/* ══ ROW 3: EVM S-Curve + CPI/SPI trend + Issues ══ */}
      {evm.length>=2&&(
        <View style={{flexDirection:isMid?'column':'row',gap:14}}>
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


    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// WEB LAYOUT
// ════════════════════════════════════════════════════════════════
const MAX_W = 1400;


// ════════════════════════════════════════════════════════════════
// MULTI-SHEET MANAGER
// ════════════════════════════════════════════════════════════════

// Parse Sheet ID from a Google Sheets URL or raw ID
function parseSheetId(input:string):string|null {
  const trimmed = input.trim();
  // Full URL: https://docs.google.com/spreadsheets/d/SHEET_ID/edit...
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if(urlMatch) return urlMatch[1];
  // Raw ID (alphanumeric + _ -)
  if(/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

interface SheetEntry { id: string; label: string; }
const SHEETS_STORAGE_KEY = 'isker_extra_sheets';
const THEME_STORAGE_KEY = 'isker_theme_dark';

// Shared hook: extra sheets list, synced with server API so all users
// see the same list. On startup, fetches from /api/sheets. When adding/removing,
// calls the server API which persists to sheets.json.
function useExtraSheets() {
  const [extraSheets, setExtraSheetsState] = useState<SheetEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from server on mount
  useEffect(() => {
    let mounted = true;
    fetch('/api/sheets')
      .then(r => r.json())
      .then(data => {
        if (mounted) { setExtraSheetsState(data); setLoaded(true); }
      })
      .catch(err => {
        console.warn('Failed to load sheets from server:', err);
        if (mounted) { setLoaded(true); } // fallback: show empty list
      });
    return () => { mounted = false; };
  }, []);

  const setExtraSheets = useCallback((updater: SheetEntry[] | ((prev: SheetEntry[]) => SheetEntry[])) => {
    setExtraSheetsState(prev => {
      const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
      // Note: we don't persist here; the server does it when you call handleAddSheet/handleRemoveSheet
      return next;
    });
  }, []);

  return { extraSheets, setExtraSheets, loaded };
}

// Shared hook: dark/light theme preference persisted across platforms.
function usePersistedTheme() {
  const [isDark, setIsDarkState] = useState(true);
  useEffect(() => {
    let mounted = true;
    getJSON<boolean>(THEME_STORAGE_KEY, true).then(v => { if (mounted) setIsDarkState(v); });
    return () => { mounted = false; };
  }, []);
  const setIsDark = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setIsDarkState(prev => {
      const next = typeof v === 'function' ? (v as any)(prev) : v;
      setJSON(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);
  return [isDark, setIsDark] as const;
}

// Single project data fetcher component
function ProjectTab({sheetId,color,tvMode}:{sheetId:string;color:string;tvMode:boolean}) {
  const {D} = useTheme();
  const {data,loading,error,refresh} = useSheetData(sheetId);

  if(loading) return(
    <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:10}}>
      <Text style={{color:D.muted,fontSize:14,letterSpacing:3}}>LOADING...</Text>
    </View>
  );

  if(error||!data) return(
    <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:14}}>
      <Text style={{color:D.red,fontSize:14}}>⚠ Failed to load data</Text>
      <Text style={{color:D.muted,fontSize:11,maxWidth:400,textAlign:'center'}}>{error}</Text>
      <TouchableOpacity onPress={refresh}
        style={{paddingHorizontal:16,paddingVertical:8,backgroundColor:D.blue,borderRadius:6}}>
        <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const p = data.projects[0];
  if(!p) return(
    <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
      <Text style={{color:D.muted,fontSize:14}}>No project found in this sheet</Text>
    </View>
  );

  if(tvMode) return(
    <View style={{flex:1,padding:12}}>
      <ProjectDashboardTV p={p} data={data} color={color}/>
    </View>
  );

  return(
    <ScrollView style={{flex:1}} contentContainerStyle={{alignItems:'center',paddingVertical:24,paddingBottom:40}}>
      <View style={{width:'100%' as any,maxWidth:MAX_W,paddingHorizontal:24}}>
        <ProjectDashboard p={p} data={data} color={color}/>
      </View>
    </ScrollView>
  );
}

// Add project modal
// ── Generic detail modal — full list view for a TV card ────────────
function DetailModal({title,color,onClose,children}:{title:string;color:string;onClose:()=>void;children:React.ReactNode}) {
  const {D} = useTheme();
  return(
    <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,
      backgroundColor:'rgba(0,0,0,0.55)',alignItems:'center',justifyContent:'center',zIndex:100} as any}>
      <View style={{backgroundColor:D.panel,borderWidth:1,borderColor:D.border,borderRadius:18,
        padding:28,width:'80%' as any,maxWidth:1100,maxHeight:'82%' as any,
        shadowColor:'#000',shadowOffset:{width:0,height:10},shadowOpacity:0.25,shadowRadius:30,elevation:12}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
            <View style={{width:4,height:22,backgroundColor:color,borderRadius:2}}/>
            <Text style={{fontSize:20,fontWeight:'900',color:D.text}}>{title}</Text>
          </View>
          <TouchableOpacity onPress={onClose}
            style={{width:34,height:34,borderRadius:17,backgroundColor:D.bg,borderWidth:1,borderColor:D.border,
              alignItems:'center',justifyContent:'center'}}>
            <Text style={{fontSize:16,color:D.sub,fontWeight:'900',lineHeight:18}}>×</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

// ── "View all" pill, shown at the bottom of a truncated TV card ────
function ViewAllPill({onPress,count,color}:{onPress:()=>void;count:number;color:string}) {
  const {D} = useTheme();
  return(
    <TouchableOpacity onPress={onPress} style={{flexDirection:'row',alignItems:'center',justifyContent:'center',
      gap:6,paddingVertical:9,borderRadius:9,backgroundColor:color+'18',borderWidth:1,borderColor:color+'44'}}>
      <Text style={{fontSize:12,fontWeight:'800',color}}>View all {count}</Text>
      <Text style={{fontSize:12,fontWeight:'900',color}}>→</Text>
    </TouchableOpacity>
  );
}

function AddProjectModal({onAdd,onClose}:{onAdd:(entry:SheetEntry)=>void;onClose:()=>void}) {
  const {D} = useTheme();
  const [url,setUrl] = useState('');
  const [label,setLabel] = useState('');
  const [err,setErr] = useState('');

  const handleAdd = () => {
    const id = parseSheetId(url);
    if(!id){ setErr('Invalid URL or Sheet ID'); return; }
    if(!label.trim()){ setErr('Please enter a project name'); return; }
    onAdd({id, label:label.trim()});
    onClose();
  };

  return(
    <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,
      backgroundColor:'rgba(0,0,0,0.45)',alignItems:'center',justifyContent:'center',zIndex:100} as any}>
      <View style={{backgroundColor:D.panel,borderWidth:1,borderColor:D.border,borderRadius:12,
        padding:28,width:480,gap:16,shadowColor:'#000',shadowOffset:{width:0,height:8},
        shadowOpacity:0.2,shadowRadius:24,elevation:10}}>
        <Text style={{fontSize:18,fontWeight:'900',color:D.text,letterSpacing:0.3}}>Add Project</Text>
        <Text style={{fontSize:13,color:D.sub,lineHeight:18}}>
          Paste a Google Sheets link or Sheet ID. Make sure the sheet is set to{' '}
          <Text style={{color:D.blue,fontWeight:'700'}}>"Anyone with the link can view"</Text>.
        </Text>
        {/* Sheet URL input */}
        <View style={{gap:6}}>
          <Text style={{fontSize:11,color:D.muted,letterSpacing:1,textTransform:'uppercase'}}>Google Sheets URL or ID</Text>
          <View style={{backgroundColor:D.bg,borderWidth:1,borderColor:D.border,borderRadius:8,paddingHorizontal:12,paddingVertical:10}}>
            <TextInput
              value={url}
              onChangeText={t=>{setUrl(t);setErr('');}}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              placeholderTextColor={D.muted}
              style={{fontSize:13,color:D.text,outline:'none'} as any}
            />
          </View>
        </View>
        {/* Project name input */}
        <View style={{gap:6}}>
          <Text style={{fontSize:11,color:D.muted,letterSpacing:1,textTransform:'uppercase'}}>Project Name</Text>
          <View style={{backgroundColor:D.bg,borderWidth:1,borderColor:D.border,borderRadius:8,paddingHorizontal:12,paddingVertical:10}}>
            <TextInput
              value={label}
              onChangeText={t=>{setLabel(t);setErr('');}}
              placeholder="e.g. TR - Heater Island 2"
              placeholderTextColor={D.muted}
              style={{fontSize:13,color:D.text,outline:'none'} as any}
            />
          </View>
        </View>
        {err&&<Text style={{fontSize:12,color:D.red,fontWeight:'600'}}>{err}</Text>}
        <View style={{flexDirection:'row',gap:10,marginTop:4}}>
          <TouchableOpacity onPress={onClose}
            style={{flex:1,paddingVertical:11,borderRadius:8,borderWidth:1,borderColor:D.border,alignItems:'center'}}>
            <Text style={{fontSize:13,color:D.sub,fontWeight:'700'}}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAdd}
            style={{flex:1,paddingVertical:11,borderRadius:8,backgroundColor:D.blue,alignItems:'center'}}>
            <Text style={{fontSize:13,color:'#fff',fontWeight:'800'}}>Add Project</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function WebLayout({sheets,setSheets}:{sheets:SheetEntry[];setSheets:(s:SheetEntry[]|((_:SheetEntry[])=>SheetEntry[]))=>void}) {
  const {D,isDark,toggleTheme} = useTheme();
  const PC = getPC(D);
  const [activeIdx,setActiveIdx]=useState(0);
  const [tvMode,setTvMode]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [confirmRemove,setConfirmRemove]=useState<{idx:number;label:string}|null>(null);

  const allTabs = sheets.map(e=>({...e,isDefault:false}));

  const handleAddSheet = async (entry:SheetEntry) => {
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const updated = await fetch('/api/sheets').then(r => r.json());
        setSheets(updated);
        setActiveIdx(updated.length - 1);
      }
    } catch (e) {
      console.error('Failed to add sheet:', e);
    }
  };

  const handleRemoveSheet = async (idx:number) => {
    const sheetId = allTabs[idx]?.id;
    if (!sheetId) return;
    try {
      const res = await fetch(`/api/sheets/${sheetId}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = await fetch('/api/sheets').then(r => r.json());
        setSheets(updated);
        if(activeIdx>=updated.length) setActiveIdx(Math.max(0, updated.length-1));
      }
    } catch (e) {
      console.error('Failed to remove sheet:', e);
    }
  };

  const activeTab = allTabs[activeIdx] ?? allTabs[0];
  const color = PC[activeIdx%3];

  return(
    <View style={{flex:1,backgroundColor:D.bg}}>
      <Stack.Screen options={{headerShown:false}}/>

      {/* Confirm remove modal */}
      {confirmRemove&&(
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.6)',
          zIndex:999,alignItems:'center',justifyContent:'center'}}>
          <View style={{backgroundColor:D.panel,borderRadius:12,borderWidth:1,borderColor:D.border,
            padding:28,maxWidth:380,width:'90%' as any,gap:16}}>
            <Text style={{color:D.text,fontSize:16,fontWeight:'900'}}>Remove Project?</Text>
            <Text style={{color:D.muted,fontSize:13,lineHeight:20}}>
              Are you sure you want to remove{' '}
              <Text style={{color:D.text,fontWeight:'700'}}>{confirmRemove.label}</Text>
              {' '}from ISKER? The Google Sheet itself won't be affected.
            </Text>
            <View style={{flexDirection:'row',gap:10,justifyContent:'flex-end'}}>
              <TouchableOpacity onPress={()=>setConfirmRemove(null)}
                style={{paddingHorizontal:18,paddingVertical:9,borderRadius:7,
                  borderWidth:1,borderColor:D.border,backgroundColor:D.bg}}>
                <Text style={{color:D.text,fontSize:13,fontWeight:'700'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>{handleRemoveSheet(confirmRemove.idx);setConfirmRemove(null);}}
                style={{paddingHorizontal:18,paddingVertical:9,borderRadius:7,backgroundColor:D.red}}>
                <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Tab bar */}
      <View style={{backgroundColor:D.panel,borderBottomWidth:1,borderBottomColor:D.border,alignItems:'center',
        shadowColor:'rgba(0,0,0,0.05)',shadowOffset:{width:0,height:2},shadowOpacity:1,shadowRadius:4,elevation:2}}>
        <View style={{flexDirection:'row',alignItems:'center',maxWidth:tvMode?undefined:MAX_W,width:'100%' as any,paddingHorizontal:24}}>

          {/* Project tabs */}
          <View style={{flex:1,flexDirection:'row',alignItems:'center'}}>
            {allTabs.map((tab,i)=>{
              const on=i===activeIdx;
              const col=PC[i%3];
              return(
                <View key={tab.id+i} style={{flexDirection:'row',alignItems:'center'}}>
                  <TouchableOpacity onPress={()=>setActiveIdx(i)}
                    style={{paddingHorizontal:tvMode?14:20,paddingVertical:tvMode?9:14,borderBottomWidth:3,
                      borderBottomColor:on?col:'transparent',marginBottom:-1,
                      flexDirection:'row',alignItems:'center',gap:7}}>
                    <View style={{width:7,height:7,borderRadius:3.5,backgroundColor:on?col:D.muted}}/>
                    <Text style={{fontSize:tvMode?12:13,fontWeight:'800',letterSpacing:0.3,color:on?D.text:D.sub}}>{tab.label}</Text>
                  </TouchableOpacity>
                  {/* Remove button — shows confirm dialog */}
                  {!tab.isDefault&&on&&(
                    <TouchableOpacity onPress={()=>setConfirmRemove({idx:i,label:tab.label})}
                      style={{width:18,height:18,borderRadius:9,backgroundColor:D.redDim,
                        borderWidth:1,borderColor:D.red,alignItems:'center',justifyContent:'center',marginLeft:-4}}>
                      <Text style={{fontSize:11,color:D.red,fontWeight:'900',lineHeight:13}}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            <TouchableOpacity onPress={()=>setShowAdd(true)}
              style={{paddingHorizontal:12,paddingVertical:8,marginLeft:4,
                flexDirection:'row',alignItems:'center',gap:5,
                borderRadius:6,borderWidth:1,borderColor:D.border,backgroundColor:D.bg,marginBottom:4}}>
              <Text style={{fontSize:16,color:D.accent,fontWeight:'800',lineHeight:18}}>+</Text>
              <Text style={{fontSize:11,color:D.accent,fontWeight:'700',letterSpacing:0.5}}>Add Sheet</Text>
            </TouchableOpacity>
          </View>

          {/* Theme + TV toggles */}
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <TouchableOpacity onPress={toggleTheme}
              style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:6,
                borderRadius:6,borderWidth:1,borderColor:D.border,backgroundColor:D.bg}}>
              <Text style={{fontSize:14}}>{isDark?'☀️':'🌙'}</Text>
              <Text style={{fontSize:10,fontWeight:'800',letterSpacing:1,color:D.muted}}>{isDark?'LIGHT':'DARK'}</Text>
            </TouchableOpacity>
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

      {/* Dashboard content — all tabs load via ProjectTab */}
      {activeTab && <ProjectTab sheetId={activeTab.id} color={color} tvMode={tvMode}/>}

      {/* Add sheet modal */}
      {showAdd&&<AddProjectModal onAdd={handleAddSheet} onClose={()=>setShowAdd(false)}/>}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// MOBILE HOME
// ════════════════════════════════════════════════════════════════
// Shows the default sheet's projects PLUS a horizontal sheet-picker for
// any extra Google Sheets the user added on web — so mobile and web
// always reflect the same connected sheets (shared AsyncStorage state).
function MobileHome({sheets,setSheets}:{sheets:SheetEntry[];setSheets:(s:SheetEntry[]|((_:SheetEntry[])=>SheetEntry[]))=>void}) {
  const {D,isDark,toggleTheme} = useTheme();
  const PC = getPC(D);
  const router=useRouter();
  const [activeIdx,setActiveIdx]=useState(0);
  const [showAdd,setShowAdd]=useState(false);

  const allTabs = sheets;
  const activeSheet = allTabs[activeIdx] ?? allTabs[0];

  const handleAddSheet = async (entry:SheetEntry) => {
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const updated = await fetch('/api/sheets').then(r => r.json());
        setSheets(updated);
        setActiveIdx(updated.length - 1);
      }
    } catch (e) {
      console.error('Failed to add sheet:', e);
    }
  };

  const {data,loading,error,refresh} = useSheetData(activeSheet?.id);

  return(
    <View style={{flex:1,backgroundColor:D.bg}}>
      <Stack.Screen options={{
        headerShown:true,title:'ISKER',headerTitleAlign:'center',
        headerStyle:{backgroundColor:D.panel},
        headerTitleStyle:{color:D.text,fontWeight:'800',fontSize:16,letterSpacing:3},
        headerShadowVisible:false,
        headerRight:()=>(
          <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
            <TouchableOpacity onPress={()=>setShowAdd(true)} style={{paddingHorizontal:8}}>
              <Ionicons name="add-circle-outline" size={22} color={D.text}/>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={{paddingHorizontal:8}}>
              <Ionicons name={isDark?'sunny-outline':'moon-outline'} size={20} color={D.text}/>
            </TouchableOpacity>
          </View>
        ),
      }}/>

      {showAdd && <AddProjectModal onAdd={handleAddSheet} onClose={()=>setShowAdd(false)}/>}

      {/* Sheet tabs */}
      {allTabs.length>1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{maxHeight:46,borderBottomWidth:1,borderBottomColor:D.border,backgroundColor:D.panel}}
          contentContainerStyle={{paddingHorizontal:10,gap:6,alignItems:'center'}}>
          {allTabs.map((tab,i)=>{
            const active=activeIdx===i;
            return(
              <Pressable key={tab.id+i} onPress={()=>setActiveIdx(i)}
                style={{paddingHorizontal:12,paddingVertical:7,borderRadius:8,
                  backgroundColor:active?D.blue:D.card,
                  borderWidth:1,borderColor:active?D.blue:D.border}}>
                <Text style={{fontSize:12,fontWeight:'700',color:active?'#fff':D.sub}} numberOfLines={1}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {loading && (
        <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
          <Text style={{color:D.muted,fontSize:14,letterSpacing:2}}>LOADING SHEET...</Text>
        </View>
      )}

      {!loading && error && (
        <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:10,padding:20}}>
          <Text style={{color:D.red,fontSize:14,textAlign:'center'}}>⚠ {error}</Text>
          <TouchableOpacity onPress={refresh} style={{paddingHorizontal:16,paddingVertical:8,backgroundColor:D.blue,borderRadius:6}}>
            <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && data && (
        <ScrollView style={{flex:1}} contentContainerStyle={{padding:14,gap:12}}>
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
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const [isDark,setIsDark]=usePersistedTheme();
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
  const {width}=useWindowDimensions();
  const isWeb=Platform.OS==='web'&&width>=768;
  const {extraSheets,setExtraSheets,loaded}=useExtraSheets();
  const [showAdd,setShowAdd]=useState(false);

  if(!loaded)return(
    <View style={{flex:1,backgroundColor:D.bg,alignItems:'center',justifyContent:'center',gap:12}}>
      <Stack.Screen options={{headerShown:false}}/>
      <View style={{width:40,height:40,borderRadius:20,backgroundColor:D.blue,opacity:0.15}}/>
      <Text style={{color:D.muted,fontSize:16,letterSpacing:3,fontWeight:'600'}}>LOADING...</Text>
    </View>
  );

  if(extraSheets.length===0)return(
    <View style={{flex:1,backgroundColor:D.bg,alignItems:'center',justifyContent:'center',gap:20}}>
      <Stack.Screen options={{headerShown:false}}/>
      <Text style={{color:D.text,fontSize:24,fontWeight:'900',letterSpacing:3}}>ISKER</Text>
      <Text style={{color:D.muted,fontSize:14,textAlign:'center',maxWidth:300,lineHeight:22}}>
        Add a Google Sheet to get started
      </Text>
      <TouchableOpacity onPress={()=>setShowAdd(true)}
        style={{paddingHorizontal:24,paddingVertical:13,backgroundColor:D.blue,borderRadius:8,
          flexDirection:'row',alignItems:'center',gap:8}}>
        <Text style={{color:'#fff',fontSize:14,fontWeight:'800'}}>+ Add Project</Text>
      </TouchableOpacity>
      {showAdd&&(
        <AddProjectModal
          onAdd={async(entry)=>{
            await fetch('/api/sheets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)});
            const updated=await fetch('/api/sheets').then(r=>r.json());
            setExtraSheets(updated);
            setShowAdd(false);
          }}
          onClose={()=>setShowAdd(false)}
        />
      )}
    </View>
  );

  return isWeb?<WebLayout sheets={extraSheets} setSheets={setExtraSheets}/>:<MobileHome sheets={extraSheets} setSheets={setExtraSheets}/>;
}
