import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSheetData } from '../../../hooks/useSheetData';
import {
  Card, ChartCard, ChartGrid, StatRow, SectionTitle, KpiBox, Badge,
  LoadingScreen, ErrorScreen, ProgressBar,
  GaugeChart, DonutChart, DonutWithLegend, Sparkline, HBarChart,
  ColumnChart, LineChart, AreaChart, StackedBarChart,
  TVTable,
} from '../../../components/ui';
import { COLORS, FONT } from '../../../constants';
import { useLayout } from '../../../hooks/useLayout';

// ─── Helpers ─────────────────────────────────────────────────────

// Collapsible section — on TV shows as sidebar drawer toggle,
// on mobile shows inline always expanded
function CollapsibleSection({
  title, children, defaultOpen = true,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const { isTV } = useLayout();
  const [open, setOpen] = React.useState(defaultOpen || !isTV);

  return (
    <View style={cStyles.wrapper}>
      <TouchableOpacity
        style={cStyles.header}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={cStyles.title}>{title.toUpperCase()}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.midGray} />
      </TouchableOpacity>
      {open && <View style={cStyles.body}>{children}</View>}
    </View>
  );
}

const cStyles = StyleSheet.create({
  wrapper: {
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.lightGray, marginBottom: 8,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 10, fontWeight: '700', color: COLORS.sub,
    letterSpacing: 0.6,
  },
  body: { padding: 0 },
});
// ─── Helpers ─────────────────────────────────────────────────────
function KpiGrid({ items }: { items: { label: string; value: string; note?: string }[] }) {
  const { kpiCols } = useLayout();
  const rows: typeof items[] = [];
  for (let i = 0; i < items.length; i += kpiCols) rows.push(items.slice(i, i + kpiCols));
  return (
    <>
      {rows.map((row, i) => (
        <View key={i} style={styles.kpiRow}>
          {row.map((k) => <KpiBox key={k.label} label={k.label} value={k.value} note={k.note} />)}
          {row.length < kpiCols && Array.from({ length: kpiCols - row.length }).map((_, j) => (
            <View key={j} style={{ flex: 1, margin: 4 }} />
          ))}
        </View>
      ))}
    </>
  );
}

function AvatarRow({ name, role, company, extra }: {
  name: string; role: string; company?: string; extra?: React.ReactNode;
}) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={styles.aRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.aName}>{name}</Text>
        <Text style={styles.aRole}>{role}{company ? ` · ${company}` : ''}</Text>
      </View>
      {extra}
    </View>
  );
}

function RingStatRow({ rings }: {
  rings: { label: string; value: string; pct: number; color?: string }[];
}) {
  const { isTV } = useLayout();
  const ringSize = isTV ? 80 : 68;

  const inner = (
    <View style={[styles.ringRow, isTV && { justifyContent: 'space-around' }]}>
      {rings.map((r, i) => (
        <View key={i} style={styles.ringItem}>
          <DonutChart
            segments={[
              { value: Math.max(r.pct, 1), color: r.color ?? COLORS.accent, label: '' },
              { value: Math.max(100 - r.pct, 0), color: '#e8e8e8', label: '' },
            ]}
            size={ringSize}
            label={r.value}
          />
          <Text style={styles.ringLbl}>{r.label}</Text>
        </View>
      ))}
    </View>
  );

  if (!isTV && rings.length > 2) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 2, minWidth: '100%' }}
      >
        {inner}
      </ScrollView>
    );
  }
  return inner;
}

// Legend pill row
function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, backgroundColor: it.color, borderRadius: 1 }} />
          <Text style={{ fontSize: 9, color: COLORS.sub }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── WORKERS ─────────────────────────────────────────────────────
function WorkersDetail({ projectId, data }: { projectId: string; data: any }) {
  const { chartH, W, isTV, gaugeSize } = useLayout();
  const cardW = isTV ? Math.floor((W - 48) / 4) : Math.floor((W - 24) / 2);

  const workers = data.workers.filter((w: any) => w.project_id === projectId);
  const byDept: Record<string, number> = {};
  workers.forEach((w: any) => { byDept[w.department] = (byDept[w.department] ?? 0) + 1; });
  const deptData = Object.entries(byDept).map(([label, value]) => ({ label, value: value as number }));

  const active   = workers.filter((w: any) => w.status === 'Active').length;
  const inactive = workers.filter((w: any) => w.status === 'Inactive').length;
  const onLeave  = workers.filter((w: any) => w.status === 'On Leave').length;
  const avgRate  = Math.round(workers.reduce((s: number, w: any) => s + Number(w.daily_rate_usd), 0) / (workers.length || 1));

  // Rate buckets
  const rateBuckets = [
    { label: '<$100',    value: workers.filter((w: any) => Number(w.daily_rate_usd) < 100).length },
    { label: '$100-200', value: workers.filter((w: any) => Number(w.daily_rate_usd) >= 100 && Number(w.daily_rate_usd) < 200).length },
    { label: '$200-300', value: workers.filter((w: any) => Number(w.daily_rate_usd) >= 200 && Number(w.daily_rate_usd) < 300).length },
    { label: '>$300',    value: workers.filter((w: any) => Number(w.daily_rate_usd) >= 300).length },
  ].filter((d) => d.value > 0);

  // Status donut
  const statusSegs = [
    { value: active,   color: COLORS.green,  label: 'Active' },
    { value: onLeave,  color: '#fb8c00',     label: 'On Leave' },
    { value: inactive, color: COLORS.red,    label: 'Inactive' },
  ].filter((s) => s.value > 0);

  // Dept cost (daily)
  const deptCost: Record<string, number> = {};
  workers.forEach((w: any) => { deptCost[w.department] = (deptCost[w.department] ?? 0) + Number(w.daily_rate_usd); });
  const deptCostData = Object.entries(deptCost).sort(([, a], [, b]) => b - a).slice(0, 6)
    .map(([label, value]) => ({ label, value: Math.round(value) }));

  return (
    <>
      <SectionTitle>Key Figures</SectionTitle>
      <KpiGrid items={[
        { label: 'Total Workers', value: String(workers.length), note: 'on project' },
        { label: 'Active',        value: String(active),         note: `${Math.round((active / workers.length) * 100)}% of total` },
        { label: 'Departments',   value: String(Object.keys(byDept).length), note: 'teams on site' },
        { label: 'Avg. Daily Rate', value: `$${avgRate}`,        note: 'per worker / day' },
      ]} />

      <SectionTitle style={{ marginTop: 14 }}>Charts</SectionTitle>

      {/* Wide top card: dept breakdown bar chart */}
      <ChartCard
        title="Headcount by Department"
        style={{ marginBottom: 8 }}
        expandedContent={(w: number) => <ColumnChart data={deptData} color={COLORS.green} width={w} height={280} showValues />}
      >
        {(w: number) => <ColumnChart data={deptData} color={COLORS.green} width={w} height={isTV ? 200 : 130} showValues />}
      </ChartCard>

      {/* 2-col grid: donut + rate dist */}
      <ChartGrid>
        <ChartCard title="Status Split">
          <DonutWithLegend segments={statusSegs} size={isTV ? 130 : 110} />
        </ChartCard>

        <ChartCard
          title="Rate Distribution"
          expandedContent={(w: number) => <ColumnChart data={rateBuckets} color={COLORS.darkGray} width={w} height={260} showValues />}
        >
          {(w: number) => <ColumnChart data={rateBuckets} color={COLORS.darkGray} width={w} height={chartH} showValues />}
        </ChartCard>

        <ChartCard title="Dept. Daily Cost ($)">
          <HBarChart data={deptCostData} color={COLORS.yellow} />
        </ChartCard>

        <ChartCard title="Performance">
          <RingStatRow rings={[
            { label: 'Attendance',   value: '94%',  pct: 94, color: COLORS.green },
            { label: 'Overtime',     value: '65%',  pct: 65, color: COLORS.white },
            { label: 'Safety',       value: '98%',  pct: 98, color: '#2e7d32' },
          ]} />
        </ChartCard>
      </ChartGrid>

      <CollapsibleSection title="Team" defaultOpen={false}>
        <TVTable
        isTV={isTV}
        columns={[
          { key: 'name',    label: 'Name',    flex: 2 },
          { key: 'role',    label: 'Role',    flex: 2 },
          { key: 'dept',    label: 'Dept.',   flex: 1 },
          { key: 'company', label: 'Company', flex: 2 },
          { key: 'rate',    label: 'Rate/day',flex: 1 },
          { key: 'status',  label: 'Status',  flex: 1 },
        ]}
        rows={workers.map((w: any) => ({
          name:    w.full_name,
          role:    w.role,
          dept:    w.department,
          company: w.company,
          rate:    `$${w.daily_rate_usd}`,
          status:  w.status,
        }))}
        mobileRender={(row, i) => (
          <View style={[styles.aRow, i === workers.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>
                {(row.name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aName}>{row.name as string}</Text>
              <Text style={styles.aRole}>{row.role as string} · {row.dept as string}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text style={styles.rateTag}>{row.rate as string}/d</Text>
              <Text style={[styles.aRole, { fontSize: 10 }]}>{row.company as string}</Text>
            </View>
          </View>
        )}
        />
      </CollapsibleSection>
    </>
  );
}

// ─── EQUIPMENT ───────────────────────────────────────────────────
function EquipmentDetail({ projectId, data }: { projectId: string; data: any }) {
  const { isTV, chartH, W, cardW, gaugeSize } = useLayout();
  const equip = data.equipment.filter((e: any) => e.project_id === projectId);
  const byType: Record<string, number> = {};
  equip.forEach((e: any) => { byType[e.type] = (byType[e.type] ?? 0) + 1; });
  const typeData = Object.entries(byType).map(([label, value]) => ({ label, value: value as number }));

  const active      = equip.filter((e: any) => e.status === 'Active').length;
  const maintenance = equip.filter((e: any) => e.status === 'Maintenance').length;
  const idle        = equip.filter((e: any) => e.status === 'Idle').length;
  const utilPct     = Math.round((active / equip.length) * 100);
  const totalCost   = equip.reduce((s: number, e: any) => s + Number(e.daily_cost_usd), 0);

  // Cost by type
  const typeCost: Record<string, number> = {};
  equip.forEach((e: any) => { typeCost[e.type] = (typeCost[e.type] ?? 0) + Number(e.daily_cost_usd); });
  const typeCostData = Object.entries(typeCost).sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value: Math.round(value) }));

  // Status segs
  const statusSegs = [
    { value: active,      color: COLORS.green,  label: 'Active' },
    { value: maintenance, color: COLORS.red,    label: 'Maint.' },
    { value: idle,        color: '#fb8c00',     label: 'Idle' },
  ].filter((s) => s.value > 0);

  // Owner breakdown
  const byOwner: Record<string, number> = {};
  equip.forEach((e: any) => { byOwner[e.owner] = (byOwner[e.owner] ?? 0) + 1; });
  const ownerData = Object.entries(byOwner).map(([label, value]) => ({ label, value: value as number }));

  return (
    <>
      <SectionTitle>Key Figures</SectionTitle>
      <KpiGrid items={[
        { label: 'Total Units',    value: String(equip.length), note: 'on project' },
        { label: 'Active',         value: String(active),       note: 'in operation' },
        { label: 'Maintenance',    value: String(maintenance),  note: 'out of service' },
        { label: 'Daily Cost',     value: `$${totalCost.toLocaleString()}`, note: 'total / day' },
      ]} />

      <SectionTitle style={{ marginTop: 14 }}>Charts</SectionTitle>

      {/* Wide: type breakdown */}
      <ChartCard
        title="Equipment by Type"
        style={{ marginBottom: 8 }}
        expandedContent={(w: number) => <ColumnChart data={typeData} color={COLORS.darkGray} width={w} height={280} showValues />}
      >
        {(w: number) => <ColumnChart data={typeData} color={COLORS.darkGray} width={w} height={isTV ? 200 : 130} showValues />}
      </ChartCard>

      <ChartGrid>
        {/* Status donut with legend */}
        <ChartCard title="Fleet Status">
          <DonutWithLegend segments={statusSegs} size={isTV ? 130 : 110} />
        </ChartCard>

        {/* Cost by type */}
        <ChartCard title="Cost by Type ($/day)">
          <HBarChart data={typeCostData.slice(0, 5)} color={COLORS.yellow} />
        </ChartCard>

        {/* Gauge */}
        <ChartCard title="Fleet Utilization">
          <View style={{ alignItems: 'center' }}>
            <GaugeChart value={utilPct} max={100} label={`${utilPct}%`} sublabel="active" size={isTV ? 160 : 120} />
          </View>
        </ChartCard>

        {/* By owner */}
        <ChartCard title="By Owner">
          {(w: number) => <ColumnChart data={ownerData} color={COLORS.blue} width={w} height={chartH} showValues />}
        </ChartCard>
      </ChartGrid>

      <CollapsibleSection title="Equipment List" defaultOpen={false}>
        <TVTable
        isTV={isTV}
        columns={[
          { key: 'name',    label: 'Name',        flex: 3 },
          { key: 'type',    label: 'Type',         flex: 2 },
          { key: 'owner',   label: 'Owner',        flex: 2 },
          { key: 'cost',    label: 'Cost/day',     flex: 1 },
          { key: 'service', label: 'Last Service', flex: 2 },
          { key: 'status',  label: 'Status',       flex: 1 },
        ]}
        rows={equip.map((e: any) => ({
          name:    e.name,
          type:    e.type,
          owner:   e.owner,
          cost:    `$${e.daily_cost_usd}`,
          service: e.last_service || '—',
          status:  e.status,
        }))}
        mobileRender={(row, i) => (
          <View style={[styles.aRow, i === equip.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.avatar, { backgroundColor: COLORS.lightGray }]}>
              <Ionicons name="construct-outline" size={13} color={COLORS.darkGray} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aName} numberOfLines={1}>{row.name as string}</Text>
              <Text style={styles.aRole}>{row.type as string} · {row.owner as string}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Badge label={row.status as string} />
              <Text style={styles.aRole}>{row.cost as string}/d</Text>
            </View>
          </View>
        )}
        />
      </CollapsibleSection>
    </>
  );
}

// ─── BUDGET ──────────────────────────────────────────────────────
function BudgetDetail({ projectId, data }: { projectId: string; data: any }) {
  const { isTV, chartH, cardW, W, gaugeSize } = useLayout();
  const rows = data.budget.filter((b: any) => b.project_id === projectId);
  const project = data.projects.find((p: any) => p.project_id === projectId);
  const spent    = Number(project.spent_to_date_usd);
  const total    = Number(project.total_budget_usd);
  const remaining = total - spent;
  const spentPct  = Math.round((spent / total) * 100);

  const byCategory: Record<string, number> = {};
  rows.forEach((r: any) => { byCategory[r.category] = (byCategory[r.category] ?? 0) + Number(r.actual_usd); });
  const catData = Object.entries(byCategory).map(([label, value]) => ({ label, value: value as number }));

  // Monthly spend
  const monthTotals: Record<string, number> = {};
  rows.forEach((r: any) => { monthTotals[r.month] = (monthTotals[r.month] ?? 0) + Number(r.actual_usd); });
  const months = Object.keys(monthTotals).sort().slice(-8);
  const monthlyValues = months.map((m) => monthTotals[m]);
  const monthlyLineData = months.map((m) => ({ label: m.slice(5), value: monthTotals[m] }));

  // Cumulative
  const cumulative = monthlyValues.reduce((acc: number[], v, i) => {
    acc.push((acc[i - 1] ?? 0) + v); return acc;
  }, []);

  // Budget segs
  const budgetSegs = [
    { value: spent,     color: COLORS.white, label: 'Spent' },
    { value: remaining, color: '#e8e8e8',    label: 'Remaining' },
  ];

  // Category column data
  const catColData = catData.sort((a, b) => b.value - a.value).slice(0, 6)
    .map((d) => ({ label: d.label, value: Math.round(d.value / 1000) }));

  return (
    <>
      <SectionTitle>Key Figures</SectionTitle>
      <KpiGrid items={[
        { label: 'Total Budget', value: `$${(total / 1e6).toFixed(1)}M`,     note: 'approved' },
        { label: 'Spent',        value: `$${(spent / 1e6).toFixed(1)}M`,     note: `${spentPct}% of budget` },
        { label: 'Remaining',    value: `$${(remaining / 1e6).toFixed(1)}M`, note: `${100 - spentPct}% left` },
        { label: 'CPI',          value: String(project.cpi),                 note: project.cpi >= 1 ? 'Under budget' : 'Over budget' },
      ]} />

      <SectionTitle style={{ marginTop: 14 }}>Charts</SectionTitle>

      {/* Wide: cumulative S-curve */}
      <ChartCard
        title="Cumulative Spend (S-curve)"
        style={{ marginBottom: 8 }}
        expandedContent={(w: number) => <AreaChart data={cumulative} color={COLORS.accent} width={w} height={280} />}
      >
        {(w: number) => <AreaChart data={cumulative} color={COLORS.accent} width={w} height={isTV ? 200 : 130} />}
      </ChartCard>

      <ChartGrid>
        {/* Budget donut with legend */}
        <ChartCard title="Budget Used">
          <DonutWithLegend
            segments={[
              { value: spent,     color: COLORS.white, label: `Spent $${(spent/1e6).toFixed(1)}M` },
              { value: remaining, color: '#e8e8e8',    label: `Left $${(remaining/1e6).toFixed(1)}M` },
            ]}
            size={isTV ? 130 : 110}
          />
        </ChartCard>

        {/* Monthly spend */}
        <ChartCard title="Monthly Spend ($K)">
          {(w: number) => <ColumnChart data={monthlyLineData.map((d) => ({ label: d.label, value: Math.round(d.value / 1000) }))} color={COLORS.blue} width={w} height={chartH} showValues />}
        </ChartCard>

        {/* By category */}
        <ChartCard title="By Category ($K)">
          {(w: number) => <ColumnChart data={catColData} color={COLORS.darkGray} width={w} height={chartH} />}
        </ChartCard>
      </ChartGrid>

      <SectionTitle style={{ marginTop: 14 }}>Performance</SectionTitle>
      <Card>
        <RingStatRow rings={[
          { label: '% Spent',       value: `${spentPct}%`, pct: spentPct,  color: COLORS.white },
          { label: 'Contingency',   value: '18%',           pct: 18,        color: '#fb8c00' },
          { label: 'Change orders', value: '3.1%',          pct: 31,        color: COLORS.blue },
        ]} />
      </Card>

      <SectionTitle style={{ marginTop: 14 }}>Monthly Records</SectionTitle>
      <Card>
        {rows.slice(0, 12).map((r: any, i: number) => (
          <StatRow
            key={r.record_id}
            label={`${r.month} — ${r.category}`}
            value={`$${Number(r.actual_usd).toLocaleString()}`}
            last={i === Math.min(rows.length, 12) - 1}
          />
        ))}
      </Card>
    </>
  );
}

// ─── CPI / SPI (EVM) ─────────────────────────────────────────────
function EvmDetail({ projectId, data }: { projectId: string; data: any }) {
  const { isTV, chartH, cardW, W, gaugeSize } = useLayout();
  const rows   = data.evm.filter((e: any) => e.project_id === projectId);
  const latest = rows[rows.length - 1];
  const cpi    = latest ? Number(latest.cpi) : 0;
  const spi    = latest ? Number(latest.spi) : 0;

  const cpiTrend = rows.map((r: any) => Number(r.cpi)).filter(Boolean);
  const spiTrend = rows.map((r: any) => Number(r.spi)).filter(Boolean);
  const cvTrend  = rows.map((r: any) => Number(r.cv_usd) / 1000).filter((v: number) => !isNaN(v));
  const svTrend  = rows.map((r: any) => Number(r.sv_usd) / 1000).filter((v: number) => !isNaN(v));

  const monthLabels = rows.map((r: any) => String(r.month).slice(5));

  const cpiLineData = rows.map((r: any, i: number) => ({ label: monthLabels[i], value: Number(r.cpi) })).filter((d: any) => !isNaN(d.value));
  const spiLineData = rows.map((r: any, i: number) => ({ label: monthLabels[i], value: Number(r.spi) })).filter((d: any) => !isNaN(d.value));

  return (
    <>
      <SectionTitle>Key Figures</SectionTitle>
      <KpiGrid items={[
        { label: 'CPI',           value: cpi.toFixed(2),  note: cpi >= 1 ? 'Under budget' : 'Over budget' },
        { label: 'SPI',           value: spi.toFixed(2),  note: spi >= 1 ? 'On schedule' : 'Behind schedule' },
        { label: 'EAC Forecast',  value: latest ? `$${(Number(latest.eac_usd) / 1e6).toFixed(2)}M` : '—', note: 'est. at completion' },
        { label: 'Cost Variance', value: latest ? `$${(Number(latest.cv_usd) / 1000).toFixed(0)}K` : '—', note: Number(latest?.cv_usd) >= 0 ? 'Favorable' : 'Unfavorable' },
      ]} />

      <SectionTitle style={{ marginTop: 14 }}>Charts</SectionTitle>
      <ChartGrid>
        {/* CPI line */}
        <ChartCard title="CPI Trend">
          <LineChart data={cpiLineData} color={cpi >= 1 ? COLORS.green : COLORS.red} width={cardW} height={chartH} />
        </ChartCard>

        {/* SPI line */}
        <ChartCard title="SPI Trend">
          <LineChart data={spiLineData} color={spi >= 1 ? COLORS.green : '#fb8c00'} width={cardW} height={chartH} />
        </ChartCard>

        {/* Cost Variance area */}
        <ChartCard title="Cost Variance ($K)">
          <AreaChart data={cvTrend} color={COLORS.orange} width={cardW} height={chartH} />
        </ChartCard>

        {/* CPI vs SPI stacked column */}
        <ChartCard title="CPI vs SPI (monthly)">
          <StackedBarChart
            data={rows.slice(-6).map((r: any) => [Number(r.cpi) * 50, Number(r.spi) * 50])}
            colors={[COLORS.green, '#1a4b8a']}
            labels={rows.slice(-6).map((r: any) => String(r.month).slice(5))}
            width={150}
            height={110}
          />
          <Legend items={[{ color: COLORS.green, label: 'CPI' }, { color: '#1a4b8a', label: 'SPI' }]} />
        </ChartCard>
      </ChartGrid>

      <SectionTitle style={{ marginTop: 14 }}>CPI Gauge</SectionTitle>
      <Card style={{ alignItems: 'center' }}>
        <GaugeChart value={Math.min(cpi * 50, 100)} max={100} label={`CPI ${cpi.toFixed(2)}`} sublabel={cpi >= 1 ? 'Under budget ✓' : 'Over budget !'} size={180} />
      </Card>

      <SectionTitle style={{ marginTop: 14 }}>Health Rings</SectionTitle>
      <Card>
        <RingStatRow rings={[
          { label: 'Budget health',  value: cpi >= 1 ? 'Good' : 'Risk', pct: Math.min(100, cpi * 70),  color: cpi >= 1 ? COLORS.green : COLORS.red },
          { label: 'Sched. health',  value: spi >= 1 ? 'Good' : 'Fair', pct: Math.min(100, spi * 70),  color: spi >= 1 ? COLORS.green : '#fb8c00' },
          { label: 'Risk level',     value: 'Low',                       pct: 20,                        color: COLORS.blue },
        ]} />
      </Card>

      <SectionTitle style={{ marginTop: 14 }}>EVM Records</SectionTitle>
      <Card>
        {rows.map((r: any, i: number) => (
          <View key={r.record_id}>
            <StatRow label={`${r.month} — CPI`} value={Number(r.cpi).toFixed(2)} />
            <StatRow label={`${r.month} — SPI`} value={Number(r.spi).toFixed(2)} last={i === rows.length - 1} />
          </View>
        ))}
      </Card>
    </>
  );
}

// ─── SCHEDULE ────────────────────────────────────────────────────
function ScheduleDetail({ projectId, data }: { projectId: string; data: any }) {
  const { isTV, chartH, cardW, W, gaugeSize } = useLayout();
  const milestones   = data.schedule.filter((m: any) => m.project_id === projectId);
  const done         = milestones.filter((m: any) => m.status === 'Done').length;
  const inProgress   = milestones.filter((m: any) => m.status === 'In Progress').length;
  const notStarted   = milestones.filter((m: any) => m.status === 'Not Started').length;
  const phases       = [...new Set(milestones.map((m: any) => m.phase))] as string[];
  const completedPct = Math.round((done / milestones.length) * 100);

  const phaseData = phases.map((phase) => {
    const ms = milestones.filter((m: any) => m.phase === phase);
    return { label: phase, value: Math.round((ms.filter((m: any) => m.status === 'Done').length / ms.length) * 100) };
  });

  const statusSegs = [
    { value: done,       color: COLORS.green,  label: 'Done' },
    { value: inProgress, color: '#1a4b8a',     label: 'In Progress' },
    { value: notStarted, color: COLORS.sub, label: 'Not Started' },
  ].filter((s) => s.value > 0);

  // Progress per phase as column data
  const phaseColData = phaseData.map((d) => ({ label: d.label, value: d.value }));

  // Milestone count per phase
  const phaseCountData = phases.map((phase) => ({
    label: phase,
    value: milestones.filter((m: any) => m.phase === phase).length,
  }));

  return (
    <>
      <SectionTitle>Key Figures</SectionTitle>
      <KpiGrid items={[
        { label: 'Milestones',  value: `${done}/${milestones.length}`, note: 'completed' },
        { label: 'Completion',  value: `${completedPct}%`,             note: 'of all milestones' },
        { label: 'Phases',      value: String(phases.length),          note: 'total phases' },
        { label: 'In Progress', value: String(inProgress),             note: 'active now' },
      ]} />

      <SectionTitle style={{ marginTop: 14 }}>Charts</SectionTitle>
      <ChartGrid>
        {/* Status donut */}
        <ChartCard title="Milestone Status">
          <DonutWithLegend segments={statusSegs} size={isTV ? 130 : 110} />
          <Legend items={statusSegs.map((s) => ({ color: s.color, label: `${s.label} ${s.value}` }))} />
        </ChartCard>

        {/* Phase completion % – column */}
        <ChartCard title="Phase Completion (%)">
          <ColumnChart data={phaseColData} color={COLORS.blue} width={cardW} height={chartH} showValues />
        </ChartCard>

        {/* Milestones per phase */}
        <ChartCard title="Milestones per Phase">
          <ColumnChart data={phaseCountData} color={COLORS.darkGray} width={cardW} height={chartH} showValues />
        </ChartCard>

        {/* Progress bars – hbar */}
        <ChartCard title="Phase Progress">
          <HBarChart data={phaseData} color={COLORS.accent} />
        </ChartCard>
      </ChartGrid>

      <SectionTitle style={{ marginTop: 14 }}>Overall Completion</SectionTitle>
      <Card style={{ alignItems: 'center' }}>
        <GaugeChart value={completedPct} max={100} label={`${completedPct}%`} sublabel="Milestones complete" size={170} />
      </Card>

      <SectionTitle style={{ marginTop: 14 }}>All Milestones</SectionTitle>
      {milestones.map((m: any) => (
        <Card key={m.milestone_id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[styles.aName, { flex: 1, marginRight: 8 }]}>{m.milestone_name}</Text>
            <Badge label={m.status} />
          </View>
          <Text style={styles.aRole}>{m.phase} · {m.responsible}</Text>
          <Text style={styles.aRole}>{m.planned_start} → {m.planned_end}{m.actual_end ? ` (actual: ${m.actual_end})` : ''}</Text>
          {Number(m.progress_pct) > 0 && (
            <View style={{ marginTop: 8 }}>
              <ProgressBar pct={Number(m.progress_pct)} color={m.status === 'Done' ? COLORS.green : COLORS.accent} />
            </View>
          )}
        </Card>
      ))}
    </>
  );
}

// ─── ISSUES ──────────────────────────────────────────────────────
function IssuesDetail({ projectId, data }: { projectId: string; data: any }) {
  const { isTV, chartH, cardW, W, gaugeSize } = useLayout();
  const issues   = data.issues.filter((i: any) => i.project_id === projectId);
  const open     = issues.filter((i: any) => i.status === 'Open').length;
  const inProg   = issues.filter((i: any) => i.status === 'In Progress').length;
  const resolved = issues.filter((i: any) => i.status === 'Resolved').length;
  const high     = issues.filter((i: any) => i.priority === 'High').length;
  const medium   = issues.filter((i: any) => i.priority === 'Medium').length;
  const low      = issues.filter((i: any) => i.priority === 'Low').length;

  const statusSegs = [
    { value: open,     color: COLORS.red,    label: 'Open' },
    { value: inProg,   color: '#1a4b8a',     label: 'In Progress' },
    { value: resolved, color: COLORS.green,  label: 'Resolved' },
  ].filter((s) => s.value > 0);

  const prioritySegs = [
    { value: high,   color: COLORS.red,    label: 'High' },
    { value: medium, color: '#fb8c00',     label: 'Medium' },
    { value: low,    color: COLORS.green,  label: 'Low' },
  ].filter((s) => s.value > 0);

  // By category
  const byCat: Record<string, number> = {};
  issues.forEach((i: any) => { byCat[i.category] = (byCat[i.category] ?? 0) + 1; });
  const catData = Object.entries(byCat).map(([label, value]) => ({ label, value: value as number }));

  // Stacked by priority & status
  const stackedData = [
    [high, medium, low],
  ];

  // Priority column
  const priorityColData = [
    { label: 'High',   value: high },
    { label: 'Medium', value: medium },
    { label: 'Low',    value: low },
  ];

  return (
    <>
      <SectionTitle>Summary</SectionTitle>
      <KpiGrid items={[
        { label: 'Total Issues',   value: String(issues.length), note: 'on project' },
        { label: 'Open',           value: String(open),          note: 'need attention' },
        { label: 'High Priority',  value: String(high),          note: 'urgent' },
        { label: 'Resolved',       value: String(resolved),      note: 'closed' },
      ]} />

      <SectionTitle style={{ marginTop: 14 }}>Charts</SectionTitle>
      <ChartGrid>
        {/* Status donut */}
        <ChartCard title="By Status">
          <DonutWithLegend segments={statusSegs} size={isTV ? 130 : 110} />
          <Legend items={statusSegs.map((s) => ({ color: s.color, label: `${s.label} ${s.value}` }))} />
        </ChartCard>

        {/* Priority donut */}
        <ChartCard title="By Priority">
          <DonutWithLegend segments={prioritySegs} size={isTV ? 130 : 110} />
          <Legend items={prioritySegs.map((s) => ({ color: s.color, label: `${s.label} ${s.value}` }))} />
        </ChartCard>

        {/* By category – hbar */}
        <ChartCard title="By Category">
          <HBarChart data={catData} color={COLORS.darkGray} />
        </ChartCard>

        {/* Priority column */}
        <ChartCard title="Priority Breakdown">
          <ColumnChart data={priorityColData} color={COLORS.red} width={cardW} height={chartH} showValues />
        </ChartCard>
      </ChartGrid>

      <CollapsibleSection title="Issue Log" defaultOpen={true}>
        <TVTable
        isTV={isTV}
        columns={[
          { key: 'title',    label: 'Title',       flex: 3 },
          { key: 'category', label: 'Category',    flex: 2 },
          { key: 'priority', label: 'Priority',    flex: 1 },
          { key: 'status',   label: 'Status',      flex: 1 },
          { key: 'assigned', label: 'Assigned to', flex: 2 },
          { key: 'due',      label: 'Due date',    flex: 2 },
        ]}
        rows={issues.map((issue: any) => ({
          title:    issue.title,
          category: issue.category,
          priority: issue.priority,
          status:   issue.status,
          assigned: issue.assigned_to,
          due:      issue.due_date,
        }))}
        mobileRender={(row, i) => (
          <View key={i} style={styles.issueCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={[styles.aName, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                {row.title as string}
              </Text>
              <Badge label={row.priority as string} type="priority" />
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
              <Badge label={row.status as string} />
              <Text style={styles.aRole}>{row.category as string}</Text>
            </View>
            <Text style={styles.aRole}>{row.assigned as string} · Due {row.due as string}</Text>
          </View>
        )}
        />
      </CollapsibleSection>
    </>
  );
}

// ─── DAILY REPORTS ───────────────────────────────────────────────
function ReportsDetail({ projectId, data }: { projectId: string; data: any }) {
  const { isTV, chartH, cardW, W, gaugeSize } = useLayout();
  const reports = [...data.dailyReports.filter((r: any) => r.project_id === projectId)].reverse();
  const totalIncidents = reports.reduce((s: number, r: any) => s + Number(r.incidents), 0);
  const avgWorkers     = Math.round(reports.reduce((s: number, r: any) => s + Number(r.workers_present), 0) / (reports.length || 1));
  const avgEquipment   = Math.round(reports.reduce((s: number, r: any) => s + Number(r.equipment_active), 0) / (reports.length || 1));

  const workersTrend  = reports.map((r: any) => Number(r.workers_present)).reverse();
  const equipTrend    = reports.map((r: any) => Number(r.equipment_active)).reverse();

  // Last 10 reports for column chart
  const recent = reports.slice(0, 10).reverse();
  const recentWorkers = recent.map((r: any) => ({ label: String(r.date).slice(5), value: Number(r.workers_present) }));
  const recentEquip   = recent.map((r: any) => ({ label: String(r.date).slice(5), value: Number(r.equipment_active) }));

  // Weather distribution
  const byWeather: Record<string, number> = {};
  reports.forEach((r: any) => { byWeather[r.weather] = (byWeather[r.weather] ?? 0) + 1; });
  const weatherData = Object.entries(byWeather).map(([label, value]) => ({ label, value: value as number }));

  // Workers + equipment stacked (last 8)
  const last8 = reports.slice(0, 8).reverse();
  const stackedData = last8.map((r: any) => [Number(r.workers_present), Number(r.equipment_active)]);
  const stackedLabels = last8.map((r: any) => String(r.date).slice(5));

  return (
    <>
      <SectionTitle>Summary</SectionTitle>
      <KpiGrid items={[
        { label: 'Reports filed',    value: String(reports.length), note: 'total' },
        { label: 'Avg. workers/day', value: String(avgWorkers),     note: 'on site' },
        { label: 'Avg. equipment',   value: String(avgEquipment),   note: 'active per day' },
        { label: 'Total incidents',  value: String(totalIncidents), note: totalIncidents === 0 ? 'Clean record ✓' : 'review needed' },
      ]} />

      <SectionTitle style={{ marginTop: 14 }}>Charts</SectionTitle>
      <ChartGrid>
        {/* Workers trend – area */}
        <ChartCard title="Workers Trend">
          <AreaChart data={workersTrend.slice(0, 20)} color={COLORS.green} width={cardW} height={chartH} />
        </ChartCard>

        {/* Equipment trend – area */}
        <ChartCard title="Equipment Trend">
          <AreaChart data={equipTrend.slice(0, 20)} color={COLORS.darkGray} width={cardW} height={chartH} />
        </ChartCard>

        {/* Recent workers – column */}
        <ChartCard title="Workers (last 10 days)">
          <ColumnChart data={recentWorkers} color={COLORS.blue} width={cardW} height={chartH} />
        </ChartCard>

        {/* Weather distribution */}
        <ChartCard title="Weather Distribution">
          <HBarChart data={weatherData} color={COLORS.darkGray} />
        </ChartCard>
      </ChartGrid>

      <SectionTitle style={{ marginTop: 14 }}>Workers vs Equipment</SectionTitle>
      <Card>
        <Text style={[styles.aRole, { marginBottom: 8 }]}>Last 8 reports — stacked</Text>
        <StackedBarChart
          data={stackedData}
          colors={[COLORS.accent, COLORS.midGray]}
          labels={stackedLabels}
          width={320}
          height={120}
        />
        <Legend items={[{ color: COLORS.white, label: 'Workers' }, { color: COLORS.sub, label: 'Equipment' }]} />
      </Card>

      <SectionTitle style={{ marginTop: 14 }}>Daily Logs</SectionTitle>
      {reports.map((r: any) => (
        <Card key={r.report_id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={styles.aName}>{r.date}</Text>
            {Number(r.incidents) > 0 && <Badge label="Incident" type="priority" />}
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="people-outline" size={12} color={COLORS.midGray} />
              <Text style={styles.aRole}>{r.workers_present} workers</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="construct-outline" size={12} color={COLORS.midGray} />
              <Text style={styles.aRole}>{r.equipment_active} equipment</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="partly-sunny-outline" size={12} color={COLORS.midGray} />
              <Text style={styles.aRole}>{r.weather}</Text>
            </View>
          </View>
          <Text style={[styles.aRole, { color: COLORS.white }]}>{r.work_summary}</Text>
          {r.notes ? <Text style={[styles.aRole, { fontStyle: 'italic', marginTop: 4 }]}>{r.notes}</Text> : null}
          <Text style={[styles.aRole, { marginTop: 6 }]}>Submitted by {r.submitted_by}</Text>
        </Card>
      ))}
    </>
  );
}

// ─── Router ──────────────────────────────────────────────────────
const TITLES: Record<string, string> = {
  workers: 'Workers', equipment: 'Equipment', budget: 'Budget',
  cpi: 'Cost & Schedule Performance', spi: 'Cost & Schedule Performance',
  schedule: 'Schedule', issues: 'Issues', reports: 'Daily Reports',
};

export default function DetailScreen() {
  const { projectId, section } = useLocalSearchParams<{ projectId: string; section: string }>();
  const { data, loading, error, refresh } = useSheetData();
  const { isTV, padding } = useLayout();

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorScreen message={error ?? 'No data'} onRetry={refresh} />;

  const renderSection = () => {
    switch (section) {
      case 'workers':   return <WorkersDetail   projectId={projectId} data={data} />;
      case 'equipment': return <EquipmentDetail projectId={projectId} data={data} />;
      case 'budget':    return <BudgetDetail    projectId={projectId} data={data} />;
      case 'cpi':
      case 'spi':       return <EvmDetail       projectId={projectId} data={data} />;
      case 'schedule':  return <ScheduleDetail  projectId={projectId} data={data} />;
      case 'issues':    return <IssuesDetail    projectId={projectId} data={data} />;
      case 'reports':   return <ReportsDetail   projectId={projectId} data={data} />;
      default:          return <Text style={{ padding: 16 }}>Section not found</Text>;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: TITLES[section] ?? section }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { padding, paddingBottom: isTV ? padding : 40 },
        ]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        // On TV disable bounce/scroll feel
        scrollEnabled={!isTV}
        showsVerticalScrollIndicator={!isTV}
      >
        {renderSection()}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content:   { padding: 16, paddingBottom: 40 },
  kpiRow:    { flexDirection: 'row' },
  aRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 34, height: 34, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: FONT.size.xs, fontWeight: '600', color: COLORS.white },
  aName:     { fontSize: FONT.size.sm, fontWeight: '600', color: COLORS.white },
  aRole:     { fontSize: FONT.size.xs, color: COLORS.sub, marginTop: 1 },
  rateTag:   { fontSize: FONT.size.xs, fontWeight: '600', color: COLORS.white },
  ringRow:   { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  ringItem:  { alignItems: 'center', gap: 6 },
  ringLabel: { fontSize: 10, color: COLORS.sub, textAlign: 'center', maxWidth: 70 },
  budgetDonutRow: { flexDirection: 'row', alignItems: 'center' },
});
