import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect, Line, G, Text as ST, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useSheetData, Project, SheetData } from '../hooks/useSheetData';

const D = {
  bg:'#07080f', panel:'#0d0e1a', card:'#13141f', border:'#22233a',
  text:'#eeeef8', sub:'#8888aa', muted:'#44445a',
  green:'#00e676', greenDim:'#0a2618',
  red:'#ff4444',   redDim:'#280a0a',
  yellow:'#ffd740',yellowDim:'#2a2000',
  blue:'#4fc3f7',  blueDim:'#072030',
  accent:'#7c6af7',accentDim:'#1a1640',
  orange:'#ff9100',orangeDim:'#271500',
};

const fmt$M = (v:number) => v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${v}`;
const fmtPct = (v:number) => `${Math.round(v)}%`;
function sColor(s:string){ return ['On Track','Active','Resolved','Done','Completed'].includes(s)?D.green:['Delayed','Open','Critical'].includes(s)?D.red:['In Progress'].includes(s)?D.blue:D.muted; }
function iColor(v:number){ return v>=1?D.green:D.red; }

// ── Arc Gauge (sidebar only) ──────────────────────────────────────
function ArcGauge({pct,color,size=110,label,sublabel}:{pct:number;color:string;size?:number;label?:string;sublabel?:string}){
  const cx=size/2,cy=size*0.62,r=size*0.40,sw=size*0.10;
  const p=Math.min(1,Math.max(0,pct/100));
  const toRad=(d:number)=>d*Math.PI/180;
  const startDeg=210,totalArc=240;
  function arcPt(deg:number){return{x:cx+r*Math.cos(toRad(deg)),y:cy+r*Math.sin(toRad(deg))};}
  function arcPath(from:number,to:number){const s=arcPt(from),e=arcPt(to),large=to-from>180?1:0;return`M${s.x},${s.y} A${r},${r} 0 ${large} 1 ${e.x},${e.y}`;}
  const segs=[{from:210,to:258,c:'#e53935'},{from:258,to:306,c:'#fb8c00'},{from:306,to:354,c:'#fdd835'},{from:354,to:402,c:'#7cb342'},{from:402,to:450,c:'#00c853'}];
  const endDeg=startDeg+totalArc*p;
  const nrad=toRad(endDeg),nLen=r*0.78;
  const tipX=cx+nLen*Math.cos(nrad),tipY=cy+nLen*Math.sin(nrad);
  const bRad=toRad(endDeg+90),bw=sw*0.14;
  const b1x=cx+bw*Math.cos(bRad),b1y=cy+bw*Math.sin(bRad),b2x=cx-bw*Math.cos(bRad),b2y=cy-bw*Math.sin(bRad);
  const ticks=[0,25,50,75,100];
  return(
    <View style={{alignItems:'center'}}>
      <Svg width={size} height={size*0.75}>
        <Path d={arcPath(startDeg,startDeg+totalArc)} fill="none" stroke={D.border} strokeWidth={sw} strokeLinecap="butt"/>
        {segs.map((seg,i)=><Path key={i} d={arcPath(seg.from,seg.to)} fill="none" stroke={seg.c} strokeWidth={sw} opacity={0.2} strokeLinecap="butt"/>)}
        {p>0.001&&<Path d={arcPath(startDeg,endDeg)} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="butt"/>}
        {ticks.map(t=>{const deg=startDeg+(t/100)*totalArc,pos=arcPt(deg),offset=sw*1.4,rad=toRad(deg),lx=cx+(r+offset)*Math.cos(rad),ly=cy+(r+offset)*Math.sin(rad);return<ST key={t} x={lx} y={ly+3} textAnchor="middle" fontSize={size*0.08} fill={D.muted}>{t}</ST>;})}
        <Path d={`M${b1x},${b1y} L${tipX},${tipY} L${b2x},${b2y} Z`} fill={D.text}/>
        <Circle cx={cx} cy={cy} r={sw*0.32} fill={D.text}/>
      </Svg>
      {label!=null&&<Text style={{fontSize:size*0.17,fontWeight:'800',color,marginTop:-size*0.05}}>{label}</Text>}
      {sublabel!=null&&<Text style={{fontSize:size*0.09,color:D.muted,marginTop:1,textAlign:'center'}}>{sublabel}</Text>}
    </View>
  );
}

// ── Line Chart ────────────────────────────────────────────────────
function LineChart({series,w=300,h=110}:{series:{data:number[];color:string;label:string}[];w?:number;h?:number}){
  const allVals=series.flatMap(s=>s.data);
  if(allVals.length<2)return null;
  const min=Math.min(...allVals),max=Math.max(...allVals),range=max-min||1;
  const padL=36,padR=12,padT=10,padB=22;
  const cw=w-padL-padR,ch=h-padT-padB;
  const maxLen=Math.max(...series.map(s=>s.data.length));
  function toPath(data:number[],filled:boolean){
    const pts=data.map((v,i)=>({x:padL+(i/(maxLen-1))*cw,y:padT+(1-(v-min)/range)*ch}));
    const line=pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
    if(filled){const area=`${line} L${pts[pts.length-1].x},${padT+ch} L${pts[0].x},${padT+ch} Z`;return{line,area,pts};}
    return{line,area:'',pts};
  }
  // Y axis labels
  const yTicks=[min,min+range*0.5,max];
  return(
    <Svg width={w} height={h}>
      <Defs>
        {series.map((s,i)=>(
          <LinearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={s.color} stopOpacity={0.25}/>
            <Stop offset="1" stopColor={s.color} stopOpacity={0.0}/>
          </LinearGradient>
        ))}
      </Defs>
      {/* Grid */}
      {[0,0.5,1].map((t,i)=>{
        const y=padT+t*ch;
        return<Line key={i} x1={padL} y1={y} x2={w-padR} y2={y} stroke={D.border} strokeWidth={1} strokeDasharray={i===0||i===2?'0':'4 4'}/>;
      })}
      {/* Y labels */}
      {yTicks.map((v,i)=>{
        const y=padT+(1-(v-min)/range)*ch;
        return<ST key={i} x={padL-4} y={y+4} textAnchor="end" fontSize={9} fill={D.muted}>{v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v.toFixed(1)}</ST>;
      })}
      {/* Series */}
      {series.map((s,i)=>{
        if(s.data.length<2)return null;
        const {line,area,pts}=toPath(s.data,true);
        return(
          <G key={i}>
            {area&&<Path d={area} fill={`url(#g${i})`}/>}
            <Path d={line} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
            <Circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={4} fill={s.color}/>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Column Chart ──────────────────────────────────────────────────
function ColChart({data,colors,w=300,h=110,showVals=true}:{data:{label:string;value:number}[];colors?:string[];w?:number;h?:number;showVals?:boolean}){
  if(!data.length)return null;
  const max=Math.max(...data.map(d=>d.value),1);
  const padT=32,padH=4;
  const cw=w-padH*2,ch=h-padT;
  const bw=Math.floor((cw/data.length)*0.82);
  const gap=cw/data.length;
  return(
    <Svg width={w} height={h}>
      <Line x1={padH} y1={padT+ch} x2={w-padH} y2={padT+ch} stroke={D.border} strokeWidth={1}/>
      {data.map((d,i)=>{
        const bh=Math.max(10,(d.value/max)*ch);
        const bx=padH+gap*i+gap/2-bw/2;
        const by=padT+ch-bh;
        const col=colors?colors[i%colors.length]:D.accent;
        const fs=Math.max(13,Math.min(20,bw*0.48));
        const tx=bx+bw/2;
        const ty=padT+ch-4;
        return(
          <G key={i}>
            <Rect x={bx} y={by} width={bw} height={bh} fill={col} opacity={0.92}/>
            <ST x={tx} y={by-6} textAnchor="middle" fontSize={fs*0.9} fill={col} fontWeight="800">{d.value}</ST>
            <ST x={0} y={0} fontSize={fs} fill={D.bg} fontWeight="800"
              transform={`translate(${tx}, ${ty}) rotate(-90) translate(6, ${bw*0.35})`}>
              {d.label}
            </ST>
          </G>
        );
      })}
    </Svg>
  );
}
// ── Horizontal Bars ───────────────────────────────────────────────
function HBars({data,w=280,h=120}:{data:{label:string;value:number;color:string;max?:number}[];w?:number;h?:number}){
  const globalMax=Math.max(...data.map(d=>d.max??d.value),1);
  const rowH=h/data.length;
  const padL=72,padR=36;
  return(
    <Svg width={w} height={h}>
      {data.map((d,i)=>{
        const bw=((d.value/(d.max??globalMax))*(w-padL-padR));
        const y=i*rowH+rowH*0.18;
        const bh=rowH*0.6;
        return(
          <G key={i}>
            <ST x={padL-6} y={y+bh*0.75} textAnchor="end" fontSize={11} fill={D.sub}>{d.label}</ST>
            <Rect x={padL} y={y} width={w-padL-padR} height={bh} fill={D.border} rx={0}/>
            <Rect x={padL} y={y} width={Math.max(4,bw)} height={bh} fill={d.color} rx={0} opacity={0.9}/>
            <ST x={padL+bw+5} y={y+bh*0.75} textAnchor="start" fontSize={11} fill={d.color} fontWeight="bold">{d.value}</ST>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Big Stat ──────────────────────────────────────────────────────
function BStat({value,label,sub,color=D.text,bordered=false}:{value:string;label:string;sub?:string;color?:string;bordered?:boolean}){
  return(
    <View style={[ss.bstat,bordered&&{borderWidth:2,borderColor:color+'66'}]}>
      <Text style={[ss.bval,{color}]}>{value}</Text>
      <Text style={ss.blab}>{label}</Text>
      {sub&&<Text style={[ss.bsub,{color:sub.includes('✓')?D.green:sub.includes('⚠')?D.red:D.muted}]}>{sub}</Text>}
    </View>
  );
}

function SL({t}:{t:string}){return<Text style={ss.sl}>{t}</Text>;}

// ─────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────

// ── Donut chart ────────────────────────────────────────────────────
function DonutChart({slices,size=110,label,sublabel}:{slices:{value:number;color:string;label:string}[];size?:number;label?:string;sublabel?:string}){
  const total=slices.reduce((s,d)=>s+d.value,0)||1;
  const cx=size/2,cy=size/2,r=size*0.34,sw=size*0.17;
  let angle=-Math.PI/2;
  const paths=slices.map(sl=>{
    const sweep=(sl.value/total)*2*Math.PI;
    const x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle);
    angle+=sweep;
    const x2=cx+r*Math.cos(angle),y2=cy+r*Math.sin(angle);
    const large=sweep>Math.PI?1:0;
    return{path:`M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`,color:sl.color,label:sl.label,value:sl.value};
  });
  return(
    <View style={{alignItems:'center',gap:6}}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={D.border} strokeWidth={sw}/>
        {paths.map((p,i)=>(
          p.value>0&&<Path key={i} d={p.path} fill="none" stroke={p.color} strokeWidth={sw} strokeLinecap="butt"/>
        ))}
        {label&&<ST x={cx} y={cy-4} textAnchor="middle" fontSize={size*0.19} fill={D.text} fontWeight="bold">{label}</ST>}
        {sublabel&&<ST x={cx} y={cy+size*0.14} textAnchor="middle" fontSize={size*0.12} fill={D.muted}>{sublabel}</ST>}
      </Svg>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center'}}>
        {slices.map((sl,i)=>(
          <View key={i} style={{flexDirection:'row',alignItems:'center',gap:4}}>
            <View style={{width:9,height:9,backgroundColor:sl.color}}/>
            <Text style={{color:D.sub,fontSize:11}}>{sl.label} <Text style={{color:sl.color,fontWeight:'700'}}>{sl.value}</Text></Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Radial bars (like a circular progress stack) ───────────────────
function RadialBars({items,size=120}:{items:{label:string;pct:number;color:string}[];size?:number}){
  const cx=size/2,cy=size/2;
  const rings=items.slice(0,4);
  const gap=size*0.072,rOuter=size*0.42;
  return(
    <View style={{alignItems:'center',gap:8}}>
      <Svg width={size} height={size}>
        {rings.map((item,i)=>{
          const r=rOuter-i*gap*2.2,sw=gap*1.1;
          const p=Math.min(0.999,Math.max(0.001,item.pct/100));
          const angle=p*2*Math.PI-Math.PI/2;
          const x1=cx,y1=cy-r;
          const x2=cx+r*Math.cos(angle),y2=cy+r*Math.sin(angle);
          const large=p>0.5?1:0;
          return(
            <G key={i}>
              <Circle cx={cx} cy={cy} r={r} fill="none" stroke={D.border} strokeWidth={sw}/>
              <Path d={`M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`} fill="none" stroke={item.color} strokeWidth={sw} strokeLinecap="round"/>
            </G>
          );
        })}
      </Svg>
      <View style={{gap:4}}>
        {rings.map((item,i)=>(
          <View key={i} style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <View style={{width:10,height:10,backgroundColor:item.color}}/>
            <Text style={{color:D.sub,fontSize:12,width:90}} numberOfLines={1}>{item.label}</Text>
            <Text style={{color:item.color,fontSize:13,fontWeight:'800'}}>{Math.round(item.pct)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TabOverview({p,data}:{p:Project;data:SheetData}){
  const spent=Number(p.spent_to_date_usd),total=Number(p.total_budget_usd);
  const bPct=total>0?(spent/total)*100:0;
  const prog=Number(p.progress_pct),cpi=Number(p.cpi),spi=Number(p.spi);
  const bColor=bPct>90?D.red:bPct>75?D.orange:D.green;

  // EVM
  const evm=data.evm.filter(e=>e.project_id===p.project_id);

  // Issues
  const issues=data.issues.filter(i=>i.project_id===p.project_id);
  const openH=issues.filter(i=>i.status==='Open'&&i.priority==='High').length;
  const openM=issues.filter(i=>i.status==='Open'&&i.priority==='Medium').length;
  const openL=issues.filter(i=>i.status==='Open'&&i.priority==='Low').length;
  const closedI=issues.filter(i=>i.status==='Resolved').length;

  // Workers
  const workers=data.workers.filter(w=>w.project_id===p.project_id);
  const wActive=workers.filter(w=>w.status==='Active').length;
  const byDept:Record<string,number>={};
  workers.forEach(w=>{byDept[w.department]=(byDept[w.department]??0)+1;});
  const topDepts=Object.entries(byDept).sort((a,b)=>b[1]-a[1]).slice(0,4);

  // Equipment
  const eq=data.equipment.filter(e=>e.project_id===p.project_id);
  const eqActive=eq.filter(e=>e.status==='Active').length;
  const eqMaint=eq.filter(e=>e.status==='Maintenance').length;

  // Schedule
  const ms=data.schedule.filter(m=>m.project_id===p.project_id);
  const msDone=ms.filter(m=>['Done','Completed'].includes(m.status)).length;
  const msDelayed=ms.filter(m=>m.status==='Delayed').length;
  const msInProg=ms.filter(m=>m.status==='In Progress').length;

  // Radial rings data: progress per phase
  const byPhase:Record<string,{total:number;done:number}>={};
  ms.forEach(m=>{if(!byPhase[m.phase])byPhase[m.phase]={total:0,done:0};byPhase[m.phase].total++;if(['Done','Completed'].includes(m.status))byPhase[m.phase].done++;});
  const phaseRings=Object.entries(byPhase).map(([label,v],i)=>({
    label,pct:v.total>0?(v.done/v.total)*100:0,
    color:[D.green,D.blue,D.accent,D.orange][i%4],
  }));

  return(
    <View style={ss.tc}>
      {/* ── Top KPI stats ── */}
      <View style={ss.srow}>
        <BStat value={fmtPct(prog)}  label="PROGRESS"    color={D.blue}      bordered/>
        <BStat value={String(cpi)}   label="CPI"         color={iColor(cpi)} sub={cpi>=1?'✓ on cost':'⚠ overrun'} bordered/>
        <BStat value={String(spi)}   label="SPI"         color={iColor(spi)} sub={spi>=1?'✓ on time':'⚠ delayed'} bordered/>
        <BStat value={fmtPct(bPct)}  label="BUDGET USED" color={bColor}      sub={`${fmt$M(spent)} / ${fmt$M(total)}`} bordered/>
        <BStat value={String(issues.filter(i=>i.status==='Open').length)} label="OPEN ISSUES" color={openH>0?D.red:D.orange} bordered/>
        <BStat value={String(workers.length)} label="WORKERS"  bordered/>
        <BStat value={String(eq.length)}      label="EQUIPMENT" bordered/>
        <BStat value={`${msDone}/${ms.length}`} label="MILESTONES" color={D.green} bordered/>
      </View>

      {/* ── Row 1: S-curve + CPI/SPI line + Issues donut ── */}
      <View style={[ss.crow,{gap:24}]}>
        {evm.length>=2&&(
          <View style={ss.cb}>
            <SL t="S-CURVE  —  EV · PV · AC  ($M)"/>
            <LineChart
              series={[
                {data:evm.map(e=>Number(e.pv_usd)/1e6),color:D.muted, label:'PV'},
                {data:evm.map(e=>Number(e.ev_usd)/1e6),color:D.green, label:'EV'},
                {data:evm.map(e=>Number(e.ac_usd)/1e6),color:D.orange,label:'AC'},
              ]}
              w={380} h={150}
            />
            <View style={ss.legend}>
              {([['PV',D.muted],['EV',D.green],['AC',D.orange]] as [string,string][]).map(([l,c])=>(
                <View key={l} style={ss.legItem}><View style={[ss.legDot,{backgroundColor:c}]}/><Text style={ss.legTxt}>{l}</Text></View>
              ))}
            </View>
          </View>
        )}
        {evm.length>=2&&(
          <View style={ss.cb}>
            <SL t="CPI / SPI TREND"/>
            <LineChart
              series={[
                {data:evm.map(e=>Number(e.cpi)),color:iColor(cpi),label:'CPI'},
                {data:evm.map(e=>Number(e.spi)),color:D.blue,     label:'SPI'},
              ]}
              w={240} h={150}
            />
            <View style={ss.legend}>
              {([['CPI',iColor(cpi)],['SPI',D.blue]] as [string,string][]).map(([l,c])=>(
                <View key={l} style={ss.legItem}><View style={[ss.legDot,{backgroundColor:c}]}/><Text style={ss.legTxt}>{l}</Text></View>
              ))}
            </View>
          </View>
        )}
        <View style={ss.cb}>
          <SL t="ISSUES BREAKDOWN"/>
          <DonutChart
            size={130}
            label={String(issues.length)}
            sublabel="total"
            slices={[
              {value:openH,  color:D.red,    label:'High'},
              {value:openM,  color:D.orange, label:'Med'},
              {value:openL,  color:D.yellow, label:'Low'},
              {value:closedI,color:D.green,  label:'Closed'},
            ]}
          />
        </View>
      </View>

      {/* ── Row 2: Workers donut + Schedule radial + Equipment donut ── */}
      <View style={[ss.crow,{gap:32,marginTop:4}]}>
        <View style={ss.cb}>
          <SL t="WORKFORCE STATUS"/>
          <DonutChart
            size={130}
            label={String(wActive)}
            sublabel="active"
            slices={[
              {value:wActive,             color:D.green,  label:'Active'},
              {value:workers.length-wActive,color:D.muted,label:'Inactive'},
            ]}
          />
        </View>
        {topDepts.length>0&&(
          <View style={ss.cb}>
            <SL t="WORKERS BY DEPT"/>
            <ColChart
              data={topDepts.map(([label,value])=>({label,value}))}
              colors={[D.accent,D.blue,D.green,D.orange]}
              w={240} h={140}
            />
          </View>
        )}
        {phaseRings.length>0&&(
          <View style={ss.cb}>
            <SL t="SCHEDULE BY PHASE"/>
            <RadialBars items={phaseRings} size={130}/>
          </View>
        )}
        <View style={ss.cb}>
          <SL t="EQUIPMENT STATUS"/>
          <DonutChart
            size={130}
            label={String(eqActive)}
            sublabel="active"
            slices={[
              {value:eqActive,            color:D.blue,   label:'Active'},
              {value:eqMaint,             color:D.orange, label:'Maint.'},
              {value:eq.length-eqActive-eqMaint,color:D.muted,label:'Idle'},
            ]}
          />
        </View>
        <View style={ss.cb}>
          <SL t="MILESTONE STATUS"/>
          <DonutChart
            size={130}
            label={String(msDone)}
            sublabel="done"
            slices={[
              {value:msDone,    color:D.green,  label:'Done'},
              {value:msInProg,  color:D.blue,   label:'Active'},
              {value:msDelayed, color:D.red,    label:'Delayed'},
              {value:ms.length-msDone-msInProg-msDelayed,color:D.muted,label:'Pending'},
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function TabWorkers({p,data}:{p:Project;data:SheetData}){
  const workers=data.workers.filter(w=>w.project_id===p.project_id);
  const active=workers.filter(w=>w.status==='Active').length;
  const byDept:Record<string,number>={};
  workers.forEach(w=>{byDept[w.department]=(byDept[w.department]??0)+1;});
  const depts=Object.entries(byDept).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const byRole:Record<string,number>={};
  workers.forEach(w=>{byRole[w.role]=(byRole[w.role]??0)+1;});
  const roles=Object.entries(byRole).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const COLS=[D.blue,D.accent,D.green,D.orange,D.yellow,D.red,'#e91e63','#00bcd4'];
  return(
    <View style={ss.tc}>
      <View style={ss.srow}>
        <BStat value={String(workers.length)} label="TOTAL"    bordered/>
        <BStat value={String(active)}         label="ACTIVE"   color={D.green} bordered/>
        <BStat value={String(workers.length-active)} label="INACTIVE" color={workers.length-active>0?D.orange:D.muted} bordered/>
        <BStat value={String(Object.keys(byDept).length)} label="DEPARTMENTS" bordered/>
      </View>
      <View style={ss.crow}>
        <View style={ss.cb}>
          <SL t="MANPOWER BY DEPARTMENT"/>
          <ColChart data={depts.map(([label,value])=>({label,value}))} colors={COLS} w={420} h={130}/>
        </View>
        <View style={ss.cb}>
          <SL t="TOP ROLES"/>
          <HBars data={roles.map(([label,value],i)=>({label,value,color:COLS[i]}))} w={280} h={roles.length*26}/>
        </View>
      </View>
    </View>
  );
}

function TabEquipment({p,data}:{p:Project;data:SheetData}){
  const eq=data.equipment.filter(e=>e.project_id===p.project_id);
  const active=eq.filter(e=>e.status==='Active').length;
  const maint=eq.filter(e=>e.status==='Maintenance').length;
  const idle=eq.filter(e=>e.status==='Idle').length;
  const byType:Record<string,number>={};
  eq.forEach(e=>{byType[e.type]=(byType[e.type]??0)+1;});
  const types=Object.entries(byType).sort((a,b)=>b[1]-a[1]);
  const COLS=[D.blue,D.accent,D.green,D.orange,D.yellow,D.red];
  return(
    <View style={ss.tc}>
      <View style={ss.srow}>
        <BStat value={String(eq.length)} label="TOTAL"       bordered/>
        <BStat value={String(active)}    label="ACTIVE"      color={D.green}  bordered/>
        <BStat value={String(maint)}     label="MAINTENANCE" color={maint>0?D.orange:D.muted} bordered/>
        <BStat value={String(idle)}      label="IDLE"        color={idle>0?D.yellow:D.muted} bordered/>
      </View>
      <View style={ss.crow}>
        <View style={ss.cb}>
          <SL t="BY EQUIPMENT TYPE"/>
          <ColChart data={types.map(([label,value])=>({label,value}))} colors={COLS} w={420} h={130}/>
        </View>
        <View style={ss.cb}>
          <SL t="STATUS MIX"/>
          <HBars data={[
            {label:'Active',     value:active, color:D.green,  max:eq.length},
            {label:'Maintenance',value:maint,  color:D.orange, max:eq.length},
            {label:'Idle',       value:idle,   color:D.yellow, max:eq.length},
          ]} w={260} h={90}/>
        </View>
      </View>
    </View>
  );
}

function TabBudget({p,data}:{p:Project;data:SheetData}){
  const rows=data.budget.filter(b=>b.project_id===p.project_id);
  const byCat:Record<string,{plan:number;actual:number}>={};
  rows.forEach(r=>{if(!byCat[r.category])byCat[r.category]={plan:0,actual:0};byCat[r.category].plan+=Number(r.planned_usd);byCat[r.category].actual+=Number(r.actual_usd);});
  const cats=Object.entries(byCat).sort((a,b)=>b[1].actual-a[1].actual);
  const totalP=cats.reduce((s,[,v])=>s+v.plan,0),totalA=cats.reduce((s,[,v])=>s+v.actual,0);
  const variance=totalP-totalA;
  const byMonth:Record<string,{p:number;a:number}>={};
  rows.forEach(r=>{if(!byMonth[r.month])byMonth[r.month]={p:0,a:0};byMonth[r.month].p+=Number(r.planned_usd);byMonth[r.month].a+=Number(r.actual_usd);});
  const months=Object.entries(byMonth).sort((a,b)=>a[0].localeCompare(b[0])).slice(-10);
  return(
    <View style={ss.tc}>
      <View style={ss.srow}>
        <BStat value={fmt$M(totalP)} label="PLANNED"  bordered/>
        <BStat value={fmt$M(totalA)} label="ACTUAL"   color={totalA>totalP?D.red:D.green} bordered/>
        <BStat value={fmt$M(Math.abs(variance))} label="VARIANCE" color={variance>=0?D.green:D.red} sub={variance>=0?'✓ under budget':'⚠ over budget'} bordered/>
      </View>
      <View style={ss.crow}>
        {months.length>=2&&(
          <View style={ss.cb}>
            <SL t="MONTHLY PLANNED vs ACTUAL ($K)"/>
            <LineChart
              series={[
                {data:months.map(([,v])=>v.p/1e3),color:D.muted, label:'Planned'},
                {data:months.map(([,v])=>v.a/1e3),color:D.green, label:'Actual'},
              ]}
              w={420} h={130}
            />
            <View style={ss.legend}>
              {[['Planned',D.muted],['Actual',D.green]].map(([l,c])=>(
                <View key={l} style={ss.legItem}><View style={[ss.legDot,{backgroundColor:String(c)}]}/><Text style={ss.legTxt}>{l}</Text></View>
              ))}
            </View>
          </View>
        )}
        <View style={ss.cb}>
          <SL t="SPEND BY CATEGORY ($K)"/>
          <HBars
            data={cats.slice(0,6).map(([label,v])=>({label,value:Math.round(v.actual/1e3),color:v.actual>v.plan?D.red:D.green,max:Math.round(totalA/1e3)}))}
            w={280} h={cats.slice(0,6).length*26}
          />
        </View>
      </View>
    </View>
  );
}

function TabSchedule({p,data}:{p:Project;data:SheetData}){
  const ms=data.schedule.filter(m=>m.project_id===p.project_id);
  const done=ms.filter(m=>['Done','Completed'].includes(m.status)).length;
  const delayed=ms.filter(m=>m.status==='Delayed').length;
  const inProg=ms.filter(m=>m.status==='In Progress').length;
  const byPhase:Record<string,{total:number;done:number}>={};
  ms.forEach(m=>{if(!byPhase[m.phase])byPhase[m.phase]={total:0,done:0};byPhase[m.phase].total++;if(['Done','Completed'].includes(m.status))byPhase[m.phase].done++;});
  const phases=Object.entries(byPhase);
  const active=ms.filter(m=>['In Progress','Delayed'].includes(m.status)).sort((a,b)=>b.status.localeCompare(a.status)).slice(0,6);
  return(
    <View style={ss.tc}>
      <View style={ss.srow}>
        <BStat value={String(ms.length)} label="TOTAL"       bordered/>
        <BStat value={String(done)}      label="DONE"        color={D.green}  bordered/>
        <BStat value={String(inProg)}    label="IN PROGRESS" color={D.blue}   bordered/>
        <BStat value={String(delayed)}   label="DELAYED"     color={delayed>0?D.red:D.muted} bordered/>
        <BStat value={p.end_date}        label="DEADLINE"    bordered/>
      </View>
      <View style={ss.crow}>
        {phases.length>0&&(
          <View style={ss.cb}>
            <SL t="COMPLETION BY PHASE (%)"/>
            <HBars
              data={phases.map(([label,v])=>({label,value:Math.round((v.done/v.total)*100),color:v.done===v.total?D.green:v.done===0?D.muted:D.blue,max:100}))}
              w={320} h={phases.length*28}
            />
          </View>
        )}
        <View style={ss.cb}>
          <SL t="ACTIVE MILESTONES"/>
          <View style={{gap:8,marginTop:4}}>
            {active.map(m=>(
              <View key={m.milestone_id} style={{flexDirection:'row',alignItems:'flex-start',gap:8}}>
                <View style={{width:8,height:8,backgroundColor:sColor(m.status),marginTop:3}}/>
                <View style={{flex:1}}>
                  <Text style={{color:D.text,fontSize:13,fontWeight:'600'}} numberOfLines={1}>{m.milestone_name}</Text>
                  <Text style={{color:D.muted,fontSize:11}}>{m.phase} · {fmtPct(Number(m.progress_pct))}</Text>
                </View>
                <Text style={{color:sColor(m.status),fontSize:11,fontWeight:'700'}}>{m.status}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function TabCPI({p,data}:{p:Project;data:SheetData}){
  const evm=data.evm.filter(e=>e.project_id===p.project_id);
  const last=evm[evm.length-1];
  const cpi=Number(p.cpi),spi=Number(p.spi);
  return(
    <View style={ss.tc}>
      <View style={ss.srow}>
        <BStat value={String(cpi)} label="CPI" color={iColor(cpi)} sub={cpi>=1?'✓ cost efficient':'⚠ cost overrun'} bordered/>
        <BStat value={String(spi)} label="SPI" color={iColor(spi)} sub={spi>=1?'✓ on schedule':'⚠ behind'} bordered/>
        {last&&<>
          <BStat value={fmt$M(Number(last.ev_usd))} label="EV"  color={D.blue}   bordered/>
          <BStat value={fmt$M(Number(last.ac_usd))} label="AC"  bordered/>
          <BStat value={fmt$M(Number(last.pv_usd))} label="PV"  color={D.muted}  bordered/>
          <BStat value={fmt$M(Number(last.eac_usd))}label="EAC" color={D.orange} bordered/>
          <BStat value={fmt$M(Math.abs(Number(last.cv_usd)))} label="COST VAR" color={Number(last.cv_usd)>=0?D.green:D.red} sub={Number(last.cv_usd)>=0?'✓ under':'⚠ over'} bordered/>
        </>}
      </View>
      {evm.length>=2&&(
        <View style={ss.crow}>
          <View style={ss.cb}>
            <SL t="CPI / SPI TREND OVER TIME"/>
            <LineChart
              series={[
                {data:evm.map(e=>Number(e.cpi)),color:iColor(cpi),label:'CPI'},
                {data:evm.map(e=>Number(e.spi)),color:D.blue,     label:'SPI'},
              ]}
              w={460} h={140}
            />
            <View style={ss.legend}>
              {[['CPI',iColor(cpi)],['SPI',D.blue]].map(([l,c])=>(
                <View key={l} style={ss.legItem}><View style={[ss.legDot,{backgroundColor:String(c)}]}/><Text style={ss.legTxt}>{l}</Text></View>
              ))}
            </View>
          </View>
          <View style={ss.cb}>
            <SL t="EV vs AC vs PV ($M)"/>
            <LineChart
              series={[
                {data:evm.map(e=>Number(e.pv_usd)/1e6),color:D.muted, label:'PV'},
                {data:evm.map(e=>Number(e.ev_usd)/1e6),color:D.green, label:'EV'},
                {data:evm.map(e=>Number(e.ac_usd)/1e6),color:D.orange,label:'AC'},
              ]}
              w={300} h={140}
            />
            <View style={ss.legend}>
              {[['PV',D.muted],['EV',D.green],['AC',D.orange]].map(([l,c])=>(
                <View key={l} style={ss.legItem}><View style={[ss.legDot,{backgroundColor:String(c)}]}/><Text style={ss.legTxt}>{l}</Text></View>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function TabReports({p,data}:{p:Project;data:SheetData}){
  const allR=data.dailyReports.filter(r=>r.project_id===p.project_id);
  const reports=[...allR].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  const issues=data.issues.filter(i=>i.project_id===p.project_id);
  const openH=issues.filter(i=>i.status==='Open'&&i.priority==='High').length;
  const openM=issues.filter(i=>i.status==='Open'&&i.priority==='Medium').length;
  const openL=issues.filter(i=>i.status==='Open'&&i.priority==='Low').length;
  const closed=issues.filter(i=>i.status==='Resolved').length;
  const incidents=reports.reduce((s,r)=>s+Number(r.incidents),0);
  return(
    <View style={ss.tc}>
      <View style={ss.srow}>
        <BStat value={String(allR.length)}     label="REPORTS"      bordered/>
        <BStat value={String(openH)}           label="HIGH ISSUES"  color={openH>0?D.red:D.muted}    bordered/>
        <BStat value={String(openM)}           label="MED ISSUES"   color={openM>0?D.orange:D.muted} bordered/>
        <BStat value={String(incidents)}       label="INCIDENTS"    color={incidents>0?D.orange:D.green} bordered/>
        <BStat value={String(closed)}          label="CLOSED"       color={D.green} bordered/>
      </View>
      <View style={ss.crow}>
        <View style={ss.cb}>
          <SL t="ISSUES BY PRIORITY"/>
          <ColChart
            data={[{label:'High',value:openH},{label:'Medium',value:openM},{label:'Low',value:openL},{label:'Closed',value:closed}]}
            colors={[D.red,D.orange,D.yellow,D.green]}
            w={300} h={130}
          />
        </View>
        <View style={[ss.cb,{flex:1}]}>
          <SL t="RECENT DAILY REPORTS"/>
          <View style={{gap:7,marginTop:4}}>
            {reports.map(r=>(
              <View key={r.report_id} style={{flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderBottomColor:D.border,paddingBottom:6}}>
                <Text style={{color:D.muted,fontSize:12,minWidth:80}}>{r.date}</Text>
                <Text style={{flex:1,color:D.text,fontSize:13}} numberOfLines={1}>{r.work_summary||'—'}</Text>
                {Number(r.incidents)>0&&<View style={{backgroundColor:D.redDim,paddingHorizontal:8,paddingVertical:2,}}>
                  <Text style={{color:D.red,fontSize:11,fontWeight:'700'}}>⚠ {r.incidents}</Text>
                </View>}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────
const TABS=[
  {key:'overview', label:'Overview', icon:'grid-outline'          as const},
  {key:'workers',  label:'Workers',  icon:'people-outline'        as const},
  {key:'equip',    label:'Equipment',icon:'construct-outline'     as const},
  {key:'budget',   label:'Budget',   icon:'cash-outline'          as const},
  {key:'schedule', label:'Schedule', icon:'calendar-outline'      as const},
  {key:'cpi',      label:'CPI / SPI',icon:'trending-up-outline'   as const},
  {key:'reports',  label:'Reports',  icon:'document-text-outline' as const},
];

// ── Project Row ───────────────────────────────────────────────────

// ── TV Collage ─────────────────────────────────────────────────────
function TVCollage({p,data}:{p:Project;data:SheetData}){
  const spent=Number(p.spent_to_date_usd),total=Number(p.total_budget_usd);
  const bPct=total>0?(spent/total)*100:0;
  const prog=Number(p.progress_pct),cpi=Number(p.cpi),spi=Number(p.spi);
  const bColor=bPct>90?D.red:bPct>75?D.orange:D.green;

  const evm=data.evm.filter(e=>e.project_id===p.project_id);
  const issues=data.issues.filter(i=>i.project_id===p.project_id);
  const openH=issues.filter(i=>i.status==='Open'&&i.priority==='High').length;
  const openM=issues.filter(i=>i.status==='Open'&&i.priority==='Medium').length;
  const openL=issues.filter(i=>i.status==='Open'&&i.priority==='Low').length;
  const closedI=issues.filter(i=>i.status==='Resolved').length;

  const workers=data.workers.filter(w=>w.project_id===p.project_id);
  const wActive=workers.filter(w=>w.status==='Active').length;
  const byDept:Record<string,number>={};
  workers.forEach(w=>{byDept[w.department]=(byDept[w.department]??0)+1;});
  const topDepts=Object.entries(byDept).sort((a,b)=>b[1]-a[1]).slice(0,6);

  const eq=data.equipment.filter(e=>e.project_id===p.project_id);
  const eqActive=eq.filter(e=>e.status==='Active').length;
  const eqMaint=eq.filter(e=>e.status==='Maintenance').length;

  const ms=data.schedule.filter(m=>m.project_id===p.project_id);
  const msDone=ms.filter(m=>['Done','Completed'].includes(m.status)).length;
  const msDelayed=ms.filter(m=>m.status==='Delayed').length;
  const msInProg=ms.filter(m=>m.status==='In Progress').length;

  const byPhase:Record<string,{total:number;done:number}>={};
  ms.forEach(m=>{if(!byPhase[m.phase])byPhase[m.phase]={total:0,done:0};byPhase[m.phase].total++;if(['Done','Completed'].includes(m.status))byPhase[m.phase].done++;});
  const phaseRings=Object.entries(byPhase).map(([label,v],i)=>({label,pct:v.total>0?(v.done/v.total)*100:0,color:[D.green,D.blue,D.accent,D.orange][i%4]}));

  const CH=290;

  return(
    <View style={ss.collage}>

      {/* Col 1: KPI stack */}
      <View style={ss.colKpi}>
        {[
          {v:fmtPct(prog), l:'PROGRESS',   c:D.blue,      s:p.end_date},
          {v:String(cpi),  l:'CPI',         c:iColor(cpi), s:cpi>=1?'✓ on cost':'⚠ overrun'},
          {v:String(spi),  l:'SPI',         c:iColor(spi), s:spi>=1?'✓ on time':'⚠ delayed'},
          {v:fmtPct(bPct), l:'BUDGET USED', c:bColor,      s:fmt$M(spent)+' / '+fmt$M(total)},
          {v:String(issues.filter(i=>i.status==='Open').length),l:'OPEN ISSUES',c:openH>0?D.red:openM>0?D.orange:D.green,s:'H:'+openH+' M:'+openM},
          {v:String(workers.length),l:'WORKERS',  c:D.text, s:wActive+' active'},
          {v:String(eq.length),     l:'EQUIPMENT',c:D.text, s:eqActive+' active'},
          {v:msDone+'/'+ms.length,  l:'MILESTONES',c:D.green,s:msDelayed>0?msDelayed+' delayed':'on track'},
        ].map(({v,l,c,s})=>(
          <View key={l} style={ss.kpiCell}>
            <Text style={[ss.kpiV,{color:c}]}>{v}</Text>
            <Text style={ss.kpiL}>{l}</Text>
            <Text style={ss.kpiS}>{s}</Text>
          </View>
        ))}
      </View>

      {/* Col 2: S-Curve */}
      {evm.length>=2&&(
        <View style={[ss.cell,{flex:1.5}]}>
          <SL t="S-CURVE  (EV · PV · AC, $M)"/>
          <LineChart
            series={[
              {data:evm.map(e=>Number(e.pv_usd)/1e6),color:D.muted, label:'PV'},
              {data:evm.map(e=>Number(e.ev_usd)/1e6),color:D.green, label:'EV'},
              {data:evm.map(e=>Number(e.ac_usd)/1e6),color:D.orange,label:'AC'},
            ]}
            w={300} h={CH}
          />
          <View style={ss.legend}>
            {([['PV',D.muted],['EV',D.green],['AC',D.orange]] as [string,string][]).map(([l,c])=>(
              <View key={l} style={ss.legItem}><View style={[ss.legDot,{backgroundColor:c}]}/><Text style={ss.legTxt}>{l}</Text></View>
            ))}
          </View>
        </View>
      )}

      {/* Col 3: CPI/SPI trend */}
      {evm.length>=2&&(
        <View style={[ss.cell,{flex:1.2}]}>
          <SL t="CPI / SPI TREND"/>
          <LineChart
            series={[
              {data:evm.map(e=>Number(e.cpi)),color:iColor(cpi),label:'CPI'},
              {data:evm.map(e=>Number(e.spi)),color:D.blue,     label:'SPI'},
            ]}
            w={240} h={CH}
          />
          <View style={ss.legend}>
            {([['CPI',iColor(cpi)],['SPI',D.blue]] as [string,string][]).map(([l,c])=>(
              <View key={l} style={ss.legItem}><View style={[ss.legDot,{backgroundColor:c}]}/><Text style={ss.legTxt}>{l}</Text></View>
            ))}
          </View>
        </View>
      )}

      {/* Col 4: Workforce bars */}
      {topDepts.length>0&&(
        <View style={[ss.cell,{flex:1.2}]}>
          <SL t="WORKFORCE BY DEPT"/>
          <ColChart
            data={topDepts.map(([label,value])=>({label,value}))}
            colors={[D.accent,D.blue,D.green,D.orange,D.yellow,'#e91e63']}
            w={240} h={CH}
          />
        </View>
      )}

      {/* Col 5: Issues + Equipment donuts */}
      <View style={[ss.cell,{flex:1,justifyContent:'space-around',alignItems:'center',overflow:'hidden'}]}>
        <View style={{alignItems:'center',gap:4}}>
          <SL t="ISSUES"/>
          <DonutChart size={130} label={String(issues.length)} sublabel="total"
            slices={[{value:openH,color:D.red,label:'H'},{value:openM,color:D.orange,label:'M'},{value:openL,color:D.yellow,label:'L'},{value:closedI,color:D.green,label:'✓'}]}/>
        </View>
        <View style={{alignItems:'center',gap:4}}>
          <SL t="EQUIPMENT"/>
          <DonutChart size={130} label={String(eqActive)} sublabel="active"
            slices={[{value:eqActive,color:D.blue,label:'Active'},{value:eqMaint,color:D.orange,label:'Maint'},{value:eq.length-eqActive-eqMaint,color:D.muted,label:'Idle'}]}/>
        </View>
      </View>

      {/* Col 6: Schedule phases radial */}
      {phaseRings.length>0&&(
        <View style={[ss.cell,{flex:0.95,alignItems:'center',justifyContent:'center'}]}>
          <SL t="SCHEDULE PHASES"/>
          <RadialBars items={phaseRings} size={200}/>
        </View>
      )}

      {/* Col 7: Milestone donut */}
      <View style={[ss.cell,{flex:0.85,alignItems:'center',justifyContent:'center'}]}>
        <SL t="MILESTONES"/>
        <DonutChart size={160} label={msDone+'/'+ms.length} sublabel="done"
          slices={[{value:msDone,color:D.green,label:'Done'},{value:msInProg,color:D.blue,label:'Active'},{value:msDelayed,color:D.red,label:'Delayed'},{value:ms.length-msDone-msInProg-msDelayed,color:D.muted,label:'Pending'}]}/>
      </View>

    </View>
  );
}


function ProjectRow({p,data}:{p:Project;data:SheetData}){
  const prog=Number(p.progress_pct);
  const cpi=Number(p.cpi),spi=Number(p.spi);

  return(
    <View style={ss.row}>
      {/* Sidebar */}
      <View style={ss.sidebar}>
        <View style={{flexDirection:'row',alignItems:'center',gap:5,marginBottom:6}}>
          <View style={{width:9,height:9,backgroundColor:sColor(p.status)}}/>
          <Text style={{fontSize:11,color:D.muted,fontWeight:'700',letterSpacing:1}}>{p.status.toUpperCase()}</Text>
        </View>
        <Text style={ss.sname} numberOfLines={2}>{p.project_name}</Text>
        <Text style={ss.smeta}>{p.location}</Text>
        <Text style={ss.smeta}>{p.client}</Text>
        <View style={{alignItems:'center',marginTop:8}}>
          <ArcGauge pct={prog} color={D.blue} size={110} label={fmtPct(prog)} sublabel="overall progress"/>
        </View>
        <View style={{flexDirection:'row',gap:6,marginTop:8,flexWrap:'wrap'}}>
          <View style={[ss.pill,{backgroundColor:cpi>=1?D.greenDim:D.redDim}]}>
            <Text style={[ss.pillT,{color:iColor(cpi)}]}>CPI {cpi}</Text>
          </View>
          <View style={[ss.pill,{backgroundColor:spi>=1?D.greenDim:D.redDim}]}>
            <Text style={[ss.pillT,{color:iColor(spi)}]}>SPI {spi}</Text>
          </View>
        </View>
      </View>

      {/* TV collage — no tabs, all at once */}
      <TVCollage p={p} data={data}/>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function HomeScreen(){
  const {data,loading,error,refresh}=useSheetData();
  const {width}=useWindowDimensions();
  const router=useRouter();
  const isTV=Platform.OS==='web'&&width>=900;

  if(loading)return(
    <View style={[ss.screen,{alignItems:'center',justifyContent:'center'}]}>
      <Text style={{color:D.muted,fontSize:22,letterSpacing:3}}>LOADING DATA...</Text>
    </View>
  );
  if(error||!data)return(
    <View style={[ss.screen,{alignItems:'center',justifyContent:'center',gap:16}]}>
      <Text style={{color:D.red,fontSize:18}}>⚠ {error??'No data'}</Text>
      <TouchableOpacity onPress={refresh} style={{padding:12,backgroundColor:D.card,}}>
        <Text style={{color:D.text}}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if(isTV){
    return(
      <View style={ss.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        {data.projects.slice(0,3).map((p,i)=>(
          <React.Fragment key={p.project_id}>
            <ProjectRow p={p} data={data}/>
            {i<2&&<View style={{height:1,backgroundColor:D.border}}/>}
          </React.Fragment>
        ))}
      </View>
    );
  }

  return(
    <ScrollView style={{flex:1,backgroundColor:D.bg}} contentContainerStyle={{padding:16,gap:12}}>
      <Stack.Screen options={{ headerShown: false }} />
      {data.projects.map(p=>(
        <TouchableOpacity key={p.project_id}
          style={{backgroundColor:D.card,padding:16,borderWidth:1,borderColor:D.border}}
          onPress={()=>router.push({pathname:'/project/[id]',params:{id:p.project_id}})}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:6}}>
            <View style={{width:8,height:8,backgroundColor:sColor(p.status)}}/>
            <Text style={{color:D.text,fontSize:16,fontWeight:'700',flex:1}}>{p.project_name}</Text>
          </View>
          <Text style={{color:D.muted,fontSize:12,marginBottom:10}}>{p.location} · {p.client}</Text>
          <ArcGauge pct={Number(p.progress_pct)} color={D.blue} size={100} label={fmtPct(Number(p.progress_pct))} sublabel="progress"/>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const ss=StyleSheet.create({
  screen:   {flex:1,backgroundColor:D.bg},
  row:      {flex:1,flexDirection:'row'},
  sidebar:  {width:220,padding:14,backgroundColor:D.panel,borderRightWidth:1,borderRightColor:D.border},
  sname:    {fontSize:16,fontWeight:'800',color:D.text,lineHeight:22,marginBottom:4},
  smeta:    {fontSize:11,color:D.muted,marginBottom:2},
  pill:     {paddingHorizontal:10,paddingVertical:4,},
  pillT:    {fontSize:13,fontWeight:'700'},
  tabbar:   {flexDirection:'row',backgroundColor:D.panel,borderBottomWidth:1,borderBottomColor:D.border,paddingHorizontal:4},
  tabbtn:   {flexDirection:'row',alignItems:'center',gap:5,paddingVertical:9,paddingHorizontal:13,borderBottomWidth:2,borderBottomColor:'transparent'},
  tabactive:{borderBottomColor:D.accent},
  tablab:   {fontSize:13,color:D.muted,fontWeight:'500'},
  tablabA:  {color:D.accent,fontWeight:'700'},
  // Tab content
  // TV collage
  collage:  {flex:1,flexDirection:'row',padding:6,gap:6},
  cell:     {flex:1,backgroundColor:D.card,padding:10,borderWidth:1,borderColor:D.border,overflow:'hidden'},
  colKpi:   {width:155,gap:3},
  kpiCell:  {flex:1,backgroundColor:D.card,paddingHorizontal:8,paddingVertical:3,borderWidth:1,borderColor:D.border,justifyContent:'center',overflow:'hidden'},
  kpiV:     {fontSize:20,fontWeight:'800',color:D.text,lineHeight:22},
  kpiL:     {fontSize:10,color:D.muted,textTransform:'uppercase',letterSpacing:0.5},
  kpiS:     {fontSize:10,color:D.muted},
  srow:     {flexDirection:'row',gap:8,flexWrap:'wrap'},
  bstat:    {backgroundColor:D.card,paddingVertical:12,paddingHorizontal:16,alignItems:'center',minWidth:100,borderWidth:1,borderColor:D.border},
  bval:     {fontSize:32,fontWeight:'800',color:D.text},
  blab:     {fontSize:12,color:D.muted,marginTop:3,textTransform:'uppercase',letterSpacing:0.6},
  bsub:     {fontSize:11,marginTop:2},
  crow:     {flexDirection:'row',gap:24,alignItems:'flex-start',flexWrap:'wrap'},
  cb:       {alignItems:'flex-start',gap:4},
  sl:       {fontSize:15,color:D.sub,letterSpacing:0.8,textTransform:'uppercase',marginBottom:8,fontWeight:'700'},
  legend:   {flexDirection:'row',gap:16,marginTop:6},
  legItem:  {flexDirection:'row',alignItems:'center',gap:6},
  legDot:   {width:14,height:4,},
  legTxt:   {fontSize:14,color:D.sub},
});
