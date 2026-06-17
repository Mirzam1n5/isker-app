import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSheetData } from '../../hooks/useSheetData';
import { Badge, GaugeChart, DonutChart, Sparkline, LoadingScreen, ErrorScreen, SectionTitle } from '../../components/ui';
import { COLORS, FONT } from '../../constants';

const METRICS = [
  { key: 'workers',   label: 'Workers',   icon: 'people-outline' as const },
  { key: 'equipment', label: 'Equipment', icon: 'construct-outline' as const },
  { key: 'budget',    label: 'Budget',    icon: 'cash-outline' as const },
  { key: 'cpi',       label: 'CPI / SPI', icon: 'trending-up-outline' as const },
  { key: 'schedule',  label: 'Schedule',  icon: 'calendar-outline' as const },
  { key: 'issues',    label: 'Issues',    icon: 'warning-outline' as const },
  { key: 'reports',   label: 'Reports',   icon: 'document-text-outline' as const },
];

function MetricCard({ icon, label, value, sub, accent, onPress }: {
  icon: any; label: string; value: string; sub: string; accent?: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.metricCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.metricTop}>
        <View style={[styles.iconBox, { backgroundColor: accent ? accent + '22' : COLORS.muted + '33' }]}>
          <Ionicons name={icon} size={18} color={accent ?? COLORS.white} />
        </View>
        <Ionicons name="chevron-forward" size={12} color={COLORS.midGray} />
      </View>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricSub} numberOfLines={1}>{sub}</Text>
    </TouchableOpacity>
  );
}

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, refresh } = useSheetData();

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorScreen message={error ?? 'No data'} onRetry={refresh} />;

  const project = data.projects.find((p) => p.project_id === id);
  if (!project) return <ErrorScreen message="Project not found" onRetry={refresh} />;

  const openIssues = data.issues.filter((i) => i.project_id === id && i.status === 'Open').length;
  const recentReports = data.dailyReports.filter((r) => r.project_id === id).length;
  const spent = Number(project.spent_to_date_usd);
  const total = Number(project.total_budget_usd);
  const progress = Number(project.progress_pct);
  const cpi = Number(project.cpi);
  const spi = Number(project.spi);

  const evmRows = data.evm.filter((e) => e.project_id === id);
  const cpiTrend = evmRows.map((e) => Number(e.cpi)).filter(Boolean);

  const budgetSegments = [
    { value: spent, color: COLORS.white, label: 'Spent' },
    { value: Math.max(0, total - spent), color: '#e8e8e8', label: 'Remaining' },
  ];

  const goDetail = (section: string) =>
    router.push({ pathname: '/detail/[projectId]/[section]', params: { projectId: id, section } });

  const getVal = (key: string) => {
    if (key === 'workers')   return String(project.workers_count);
    if (key === 'equipment') return String(project.equipment_count);
    if (key === 'budget')    return `$${(spent / 1e6).toFixed(1)}M`;
    if (key === 'cpi')       return `${cpi} / ${spi}`;
    if (key === 'schedule')  return project.end_date;
    if (key === 'issues')    return String(openIssues);
    if (key === 'reports')   return String(recentReports);
    return '—';
  };

  const getSub = (key: string) => {
    if (key === 'workers')   return 'on site today';
    if (key === 'equipment') return 'units active';
    if (key === 'budget')    return `of $${(total / 1e6).toFixed(1)}M total`;
    if (key === 'cpi')       return 'cost · schedule index';
    if (key === 'schedule')  return 'deadline';
    if (key === 'issues')    return 'open issues';
    if (key === 'reports')   return 'daily logs filed';
    return '';
  };

  const getAccent = (key: string) => {
    if (key === 'issues' && openIssues > 0) return COLORS.red;
    if (key === 'cpi') return cpi >= 1 ? COLORS.green : COLORS.red;
    return undefined;
  };

  return (
    <>
      <Stack.Screen options={{ title: project.project_name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroSub}>Overall Progress</Text>
              <Badge label={project.status} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="location-outline" size={11} color={COLORS.midGray} />
                <Text style={styles.heroMeta}>{project.location}</Text>
              </View>
              <Text style={styles.heroMeta}>{project.client}</Text>
            </View>
          </View>

          <View style={{ alignItems: 'center' }}>
            <GaugeChart value={progress} max={100} label={`${progress}%`} sublabel="Against Plan" size={200} />
          </View>

          {/* Index row */}
          <View style={styles.indexRow}>
            <View style={styles.indexChip}>
              <Text style={styles.indexLabel}>CPI</Text>
              <Text style={[styles.indexVal, { color: cpi >= 1 ? COLORS.green : COLORS.red }]}>{cpi}</Text>
              {cpiTrend.length > 1 && (
                <Sparkline data={cpiTrend} color={cpi >= 1 ? COLORS.green : COLORS.red} width={64} height={28} />
              )}
            </View>
            <View style={styles.sep} />
            <View style={styles.indexChip}>
              <Text style={styles.indexLabel}>SPI</Text>
              <Text style={[styles.indexVal, { color: spi >= 1 ? COLORS.green : COLORS.red }]}>{spi}</Text>
            </View>
            <View style={styles.sep} />
            <View style={styles.indexChip}>
              <Text style={styles.indexLabel}>Budget</Text>
              <DonutChart
                segments={budgetSegments}
                size={52}
                label={`${Math.round((spent / total) * 100)}%`}
              />
            </View>
          </View>
        </View>

        <SectionTitle style={{ marginTop: 8 }}>Metrics</SectionTitle>

        <View style={styles.grid}>
          {METRICS.map((m) => (
            <MetricCard
              key={m.key}
              icon={m.icon}
              label={m.label}
              value={getVal(m.key)}
              sub={getSub(m.key)}
              accent={getAccent(m.key)}
              onPress={() => goDetail(m.key)}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: COLORS.lightGray, borderWidth: 1, borderRadius: 14,
    borderColor: COLORS.border, padding: 16, marginBottom: 8,
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 4,
  },
  heroSub: { fontSize: FONT.size.xs, color: COLORS.sub, marginBottom: 4 },
  heroMeta: { fontSize: FONT.size.xs, color: COLORS.sub, marginTop: 2 },
  indexRow: {
    flexDirection: 'row', borderTopWidth: 1,
    borderTopColor: COLORS.border, marginTop: 8, paddingTop: 12,
    alignItems: 'center',
  },
  indexChip: { flex: 1, alignItems: 'center', gap: 4 },
  sep: { width: 1, height: 52, backgroundColor: COLORS.border },
  indexLabel: { fontSize: FONT.size.xs, color: COLORS.sub },
  indexVal: { fontSize: 20, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: {
    width: '47.5%',
    backgroundColor: COLORS.lightGray, borderWidth: 1, borderRadius: 14,
    borderColor: COLORS.border, padding: 14,
  },
  metricTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 20, fontWeight: '600', color: COLORS.white, marginBottom: 2 },
  metricLabel: { fontSize: FONT.size.xs, fontWeight: '600', color: COLORS.white },
  metricSub: { fontSize: FONT.size.xs, color: COLORS.sub, marginTop: 2 },
});
