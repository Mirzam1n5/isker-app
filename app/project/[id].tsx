import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSheetData } from '../../hooks/useSheetData';
import { useTheme } from '../../hooks/useTheme';

// ─── Helpers ─────────────────────────────────────────────────────
const num = (v: any) => parseFloat(String(v ?? 0).replace(/\s/g, '').replace(',', '.')) || 0;
const fmtM = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`;
const fmtP = (v: number) => `${Math.round(v)}%`;

// ─── Mini components ─────────────────────────────────────────────

function ArcProgress({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  const { D } = useTheme();
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (from: number, to: number) => {
    const x1 = cx + r * Math.cos(toRad(from));
    const y1 = cy + r * Math.sin(toRad(from));
    const x2 = cx + r * Math.cos(toRad(to));
    const y2 = cy + r * Math.sin(toRad(to));
    const lg = to - from > 180 ? 1 : 0;
    return `M${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2}`;
  };
  const filled = startAngle + (totalAngle * Math.min(pct, 100)) / 100;

  const { default: Svg, Path } = require('react-native-svg');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size * 0.75}>
        <Path d={arcPath(startAngle, endAngle)} fill="none" stroke={D.border} strokeWidth={10} strokeLinecap="round" />
        {pct > 0 && (
          <Path d={arcPath(startAngle, filled)} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
        )}
      </Svg>
      <Text style={{ position: 'absolute', bottom: 0, fontSize: 22, fontWeight: '900', color: D.text }}>
        {fmtP(pct)}
      </Text>
    </View>
  );
}

function KpiTile({ label, value, note, color }: { label: string; value: string; note?: string; color?: string }) {
  const { D } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: D.card, borderRadius: 10, borderWidth: 1, borderColor: D.border, padding: 12, gap: 2 }}>
      <Text style={{ fontSize: 10, color: D.muted, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: '900', color: color ?? D.text }}>{value}</Text>
      {note && <Text style={{ fontSize: 10, color: D.sub }}>{note}</Text>}
    </View>
  );
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  const { D } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <View style={{ width: 3, height: 14, backgroundColor: color, borderRadius: 2 }} />
      <Text style={{ fontSize: 11, fontWeight: '800', color: D.sub, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { D } = useTheme();
  return (
    <View style={[{ backgroundColor: D.card, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 14, marginBottom: 10 }, style]}>
      {children}
    </View>
  );
}

function PhaseBar({ phase, pct, color }: { phase: string; pct: number; color: string }) {
  const { D } = useTheme();
  return (
    <View style={{ gap: 4, marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, color: D.text }}>{phase}</Text>
        <Text style={{ fontSize: 12, color, fontWeight: '700' }}>{fmtP(pct)}</Text>
      </View>
      <View style={{ height: 7, backgroundColor: D.bg, borderRadius: 4 }}>
        <View style={{ height: 7, width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

function CatBar({ cat, ac, pl, color }: { cat: string; ac: number; pl: number; color: string }) {
  const { D } = useTheme();
  const max = Math.max(pl, ac, 1);
  const over = ac > pl;
  const pct = pl > 0 ? Math.round((ac / pl) * 100) : 0;
  return (
    <View style={{ gap: 3, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text style={{ fontSize: 12, color: D.text, flex: 1 }} numberOfLines={1}>{cat}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 11, color: D.muted }}>{fmtM(ac)}</Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: over ? D.red : D.green, minWidth: 36, textAlign: 'right' }}>{pct}%</Text>
        </View>
      </View>
      <View style={{ height: 7, backgroundColor: D.bg, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, height: 7, width: `${(pl / max) * 100}%`, backgroundColor: color, opacity: 0.25, borderRadius: 4 }} />
        <View style={{ position: 'absolute', top: 0, left: 0, height: 7, width: `${Math.min((ac / max) * 100, 100)}%`, backgroundColor: over ? D.red : color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────
export default function ProjectScreen() {
  const { id, sheetId } = useLocalSearchParams<{ id: string; sheetId?: string }>();
  const router = useRouter();
  const { D } = useTheme();
  const { data, loading, error, refresh } = useSheetData(sheetId);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator color={D.blue} size="large" />
      <Text style={{ color: D.muted, fontSize: 13, letterSpacing: 2 }}>LOADING...</Text>
    </View>
  );

  if (error || !data) return (
    <View style={{ flex: 1, backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ color: D.red, fontSize: 14 }}>⚠ {error ?? 'No data'}</Text>
      <TouchableOpacity onPress={refresh} style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: D.blue, borderRadius: 8 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const p = data.projects.find(pr => pr.project_id === id) ?? data.projects[0];
  if (!p) return (
    <View style={{ flex: 1, backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ color: D.muted }}>Project not found</Text>
    </View>
  );

  const prog = num(p.progress_pct);
  const cpi = num(p.cpi);
  const spi = num(p.spi);
  const budget = num(p.total_budget_usd);
  const spent = num(p.spent_to_date_usd);
  const iCol = (v: number) => v >= 1 ? D.green : D.red;

  // Milestones
  const schedule = data.schedule.filter(m => m.project_id === id);
  const phases = [...new Set(schedule.map(m => m.phase))].filter(Boolean) as string[];
  const msDone = schedule.filter(m => m.status === 'Done').length;
  const msInP = schedule.filter(m => m.status === 'In Progress').length;
  const msDel = schedule.filter(m => m.status === 'Delayed').length;

  // Budget by category
  const budgetRows = data.budget.filter(b => b.project_id === id);
  const catMap: Record<string, { pl: number; ac: number }> = {};
  budgetRows.forEach(b => {
    if (!catMap[b.category]) catMap[b.category] = { pl: 0, ac: 0 };
    catMap[b.category].pl += num(b.planned_usd);
    catMap[b.category].ac += num(b.actual_usd);
  });
  const catData = Object.entries(catMap).map(([cat, v]) => ({ cat, ...v })).sort((a, b) => b.ac - a.ac);
  const DC = [D.blue, D.orange, D.green, D.yellow, D.red, '#9b7fd4', '#4fb8a8'];

  // EVM
  const evm = data.evm.filter(e => e.project_id === id);
  const latestEvm = evm[evm.length - 1];
  const evmMonths = evm.map(e => String(e.month).slice(5));
  const pvS = evm.map(e => num(e.pv_usd));
  const evS = evm.map(e => num(e.ev_usd));
  const acS = evm.map(e => num(e.ac_usd));
  const cpiS = evm.map(e => num(e.cpi));
  const spiS = evm.map(e => num(e.spi));

  // Simple SVG line chart
  const MiniLine = ({ values, color, h = 80 }: { values: number[]; color: string; h?: number }) => {
    if (values.length < 2) return null;
    const { default: Svg, Path, Line } = require('react-native-svg');
    const mn = Math.min(...values);
    const mx = Math.max(...values);
    const range = mx - mn || 1;
    const w = 280;
    const pad = 8;
    const ew = (w - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => [pad + i * ew, pad + (1 - (v - mn) / range) * (h - pad * 2)] as [number, number]);
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
    return (
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <Line x1={pad} y1={pad + (1 - (1 - mn) / range) * (h - pad * 2)} x2={w - pad} y2={pad + (1 - (1 - mn) / range) * (h - pad * 2)} stroke={D.muted} strokeWidth={0.8} strokeDasharray="4,3" />
        <Path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: D.bg }}>
      <Stack.Screen options={{
        headerShown: true,
        title: p.project_name,
        headerStyle: { backgroundColor: D.panel },
        headerTitleStyle: { color: D.text, fontWeight: '800', fontSize: 15 },
        headerTintColor: D.text,
        headerShadowVisible: false,
      }} />

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40, gap: 10 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>

        {/* ── Header card ── */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: D.green + '20', borderRadius: 5, borderWidth: 1, borderColor: D.green }}>
              <Text style={{ fontSize: 10, color: D.green, fontWeight: '800', letterSpacing: 1 }}>{p.status.toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize: 11, color: D.muted }}>{p.location}</Text>
          </View>

          <ArcProgress pct={prog} color={D.blue} size={140} />

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <KpiTile label="Budget" value={fmtM(budget)} color={D.text} />
            <KpiTile label="Spent" value={fmtM(spent)} note={`${Math.round((spent / budget) * 100)}% used`} color={spent > budget ? D.red : D.text} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <KpiTile label="CPI" value={cpi.toFixed(2)} note={cpi >= 1 ? 'On budget' : 'Over budget'} color={iCol(cpi)} />
            <KpiTile label="SPI" value={spi.toFixed(2)} note={spi >= 1 ? 'On schedule' : 'Behind'} color={iCol(spi)} />
          </View>
        </Card>

        {/* ── Milestones ── */}
        <Card>
          <SectionHeader label="Milestones" color={D.cyan} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[{ l: 'Done', v: msDone, c: D.green }, { l: 'In Prog', v: msInP, c: D.blue }, { l: 'Delayed', v: msDel, c: msDel > 0 ? D.red : D.muted }].map(item => (
              <View key={item.l} style={{ flex: 1, alignItems: 'center', backgroundColor: item.c + '18', borderWidth: 1, borderColor: item.c + '44', borderRadius: 8, paddingVertical: 8 }}>
                <Text style={{ fontSize: 9, color: D.muted, letterSpacing: 1 }}>{item.l.toUpperCase()}</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: item.c }}>{item.v}</Text>
              </View>
            ))}
          </View>
          {phases.map(phase => {
            const phMs = schedule.filter(m => m.phase === phase);
            const phDone = phMs.filter(m => m.status === 'Done').length;
            const phPct = phMs.length > 0 ? (phDone / phMs.length) * 100 : 0;
            const phCol = phPct === 100 ? D.green : phMs.some(m => m.status === 'Delayed') ? D.red : D.blue;
            return <PhaseBar key={phase} phase={phase} pct={phPct} color={phCol} />;
          })}
          <View style={{ backgroundColor: spi >= 1 ? D.greenDim : D.redDim, borderWidth: 1, borderColor: spi >= 1 ? D.green : D.red, padding: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: D.sub }}>SCHEDULE SPI</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: iCol(spi) }}>{spi.toFixed(2)} {spi >= 1 ? '✓' : '⚠'}</Text>
          </View>
        </Card>

        {/* ── Budget by Category ── */}
        {catData.length > 0 && (
          <Card>
            <SectionHeader label="Budget by Category" color={D.orange} />
            {catData.map((c, i) => (
              <CatBar key={c.cat} cat={c.cat} ac={c.ac} pl={c.pl} color={DC[i % 7]} />
            ))}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 12, height: 6, backgroundColor: D.blue, opacity: 0.3, borderRadius: 2 }} />
                <Text style={{ fontSize: 9, color: D.muted }}>Planned</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 12, height: 6, backgroundColor: D.blue, borderRadius: 2 }} />
                <Text style={{ fontSize: 9, color: D.muted }}>Actual</Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── EVM S-Curve ── */}
        {evm.length >= 2 && (
          <Card>
            <SectionHeader label="EVM S-Curve" color={D.blue} />
            {latestEvm && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[
                  { l: 'EAC', v: fmtM(num(latestEvm.eac_usd)), c: num(latestEvm.eac_usd) > num(latestEvm.bac_usd) ? D.red : D.green },
                  { l: 'CV', v: `${num(latestEvm.cv_usd) >= 0 ? '+' : ''}${fmtM(num(latestEvm.cv_usd))}`, c: num(latestEvm.cv_usd) >= 0 ? D.green : D.red },
                  { l: 'SV', v: `${num(latestEvm.sv_usd) >= 0 ? '+' : ''}${fmtM(num(latestEvm.sv_usd))}`, c: num(latestEvm.sv_usd) >= 0 ? D.green : D.red },
                ].map(item => (
                  <View key={item.l} style={{ flex: 1, backgroundColor: D.bg, borderWidth: 1, borderColor: D.border, padding: 8, alignItems: 'center', borderRadius: 7 }}>
                    <Text style={{ fontSize: 9, color: D.muted, letterSpacing: 1 }}>{item.l}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: item.c }}>{item.v}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={{ fontSize: 10, color: D.muted, marginBottom: 4 }}>Planned Value</Text>
            <MiniLine values={pvS} color={D.blue} />
            <Text style={{ fontSize: 10, color: D.muted, marginTop: 8, marginBottom: 4 }}>Earned Value</Text>
            <MiniLine values={evS} color={D.green} />
            <Text style={{ fontSize: 10, color: D.muted, marginTop: 8, marginBottom: 4 }}>Actual Cost</Text>
            <MiniLine values={acS} color={D.red} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              {[{ l: 'Planned Value', c: D.blue }, { l: 'Earned Value', c: D.green }, { l: 'Actual Cost', c: D.red }].map(it => (
                <View key={it.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 3, backgroundColor: it.c, borderRadius: 2 }} />
                  <Text style={{ fontSize: 9, color: D.muted }}>{it.l}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* ── CPI & SPI Trend ── */}
        {evm.length >= 2 && (
          <Card>
            <SectionHeader label="CPI & SPI Trend" color={D.green} />
            <Text style={{ fontSize: 10, color: D.muted, marginBottom: 4 }}>CPI</Text>
            <MiniLine values={cpiS} color={D.green} />
            <Text style={{ fontSize: 10, color: D.muted, marginTop: 8, marginBottom: 4 }}>SPI</Text>
            <MiniLine values={spiS} color={D.yellow} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              {[{ l: 'CPI', c: D.green }, { l: 'SPI', c: D.yellow }].map(it => (
                <View key={it.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 3, backgroundColor: it.c, borderRadius: 2 }} />
                  <Text style={{ fontSize: 9, color: D.muted }}>{it.l}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

      </ScrollView>
    </View>
  );
}
