import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Modal,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, G, Text as SvgText, Line, Rect, Polyline } from 'react-native-svg';
import { COLORS, FONT, STATUS_COLOR, PRIORITY_COLOR } from '../constants';

// ─── Badge ───────────────────────────────────────────────────────
export function Badge({ label, type = 'status' }: { label: string; type?: 'status' | 'priority' }) {
  const map = type === 'priority' ? PRIORITY_COLOR : STATUS_COLOR;
  const colors = map[label] ?? { bg: COLORS.muted, text: COLORS.midGray };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

// ─── Section title ────────────────────────────────────────────────
export function SectionTitle({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.sectionTitle, style]}>{children.toUpperCase()}</Text>;
}

// ─── Card ─────────────────────────────────────────────────────────
export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.75}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── Chart Card ──────────────────────────────────────────────────
// On mobile: tap to open full-screen modal with larger chart.
// On TV/web: renders inline, no modal.
// children can be ReactNode or (width: number) => ReactNode render prop.
export function ChartCard({
  children,
  expandedContent,
  style,
  title,
}: {
  children: React.ReactNode | ((width: number) => React.ReactNode);
  expandedContent?: React.ReactNode | ((width: number) => React.ReactNode);
  style?: ViewStyle;
  title?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [innerW, setInnerW] = React.useState(0);
  const [modalW, setModalW] = React.useState(0);
  const { width } = useWindowDimensions();
  const isTV = Platform.OS === 'web' && width >= 1024;

  const onLayout = React.useCallback((e: any) => {
    const w = e.nativeEvent.layout.width - 20;
    if (w > 0) setInnerW(w);
  }, []);

  const onModalLayout = React.useCallback((e: any) => {
    const w = e.nativeEvent.layout.width - 36;
    if (w > 0) setModalW(w);
  }, []);

  const resolve = (c: React.ReactNode | ((w: number) => React.ReactNode), w: number) =>
    typeof c === 'function' ? (w > 0 ? c(w) : null) : c;

  const cardChildren = resolve(children, innerW);
  // In modal: prefer expandedContent if provided, otherwise use children with bigger width
  const modalChildren = expandedContent
    ? resolve(expandedContent, modalW)
    : resolve(children, modalW);

  // TV: always inline, never modal
  if (isTV) {
    return (
      <View style={[styles.chartCard, styles.chartCardTV, style]} onLayout={onLayout}>
        {title ? <Text style={styles.chartCardTitleTV}>{title}</Text> : null}
        {resolve(expandedContent ?? children, innerW)}
      </View>
    );
  }

  // Mobile: card tappable, opens modal
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
        style={[styles.chartCard, style]}
        onLayout={onLayout}
      >
        {title ? (
          <View style={styles.chartCardHeader}>
            <Text style={styles.chartCardTitle}>{title}</Text>
            <Ionicons name="expand-outline" size={12} color={COLORS.midGray} />
          </View>
        ) : null}
        {cardChildren}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} onLayout={onModalLayout}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title ?? ''}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={{ paddingTop: 4 }}>
                {modalChildren}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── useContainerWidth — measure real rendered width ─────────────
// Use this to pass accurate width to SVG charts instead of guessing from window.width
export function useContainerWidth(fallback = 300): [number, (e: any) => void] {
  const [w, setW] = React.useState(fallback);
  const onLayout = React.useCallback((e: any) => {
    const measured = e.nativeEvent.layout.width;
    if (measured > 0) setW(measured);
  }, []);
  return [w, onLayout];
}

// ─── Chart Grid (responsive: 2-col mobile, 4-col TV) ─────────────
export function ChartGrid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isTV = Platform.OS === 'web' && width >= 1024;
  const colCount = isTV ? 4 : 2;

  const items = React.Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += colCount) {
    rows.push(items.slice(i, i + colCount));
  }

  // Calculate card width: (50% - margin) on mobile, (25% - margin) on TV
  const cardWidthStyle = { width: `${Math.floor(100 / colCount) - 1}%` as any };

  return (
    <>
      {rows.map((row, i) => (
        <View key={i} style={styles.chartGridRow}>
          {React.Children.map(row as React.ReactElement[], (child, j) =>
            child ? React.cloneElement(child as React.ReactElement<any>, {
              style: [cardWidthStyle, (child as React.ReactElement<any>).props?.style],
            }) : null
          )}
          {Array.from({ length: colCount - row.length }).map((_, j) => (
            <View key={`empty-${j}`} style={[{ margin: 4 }, cardWidthStyle]} />
          ))}
        </View>
      ))}
    </>
  );
}

// ─── Stat row ─────────────────────────────────────────────────────
export function StatRow({ label, value, last }: { label: string; value: string | number; last?: boolean }) {
  return (
    <View style={[styles.statRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.statKey}>{label}</Text>
      <Text style={styles.statVal}>{String(value)}</Text>
    </View>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────
export function ProgressBar({ pct, color = COLORS.accent }: { pct: number; color?: string }) {
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── KPI box ──────────────────────────────────────────────────────
export function KpiBox({ label, value, note }: { label: string; value: string; note?: string }) {
  const { width } = useWindowDimensions();
  const isTV = Platform.OS === 'web' && width >= 1024;
  return (
    <View style={[styles.kpiBox, isTV && styles.kpiBoxTV]}>
      <Text style={[styles.kpiLabel, isTV && styles.kpiLabelTV]}>{label}</Text>
      <Text style={[styles.kpiValue, isTV && styles.kpiValueTV]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {note ? <Text style={[styles.kpiNote, isTV && styles.kpiNoteTV]}>{note}</Text> : null}
    </View>
  );
}

// ─── Loading / Error ──────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.white} />
      <Text style={styles.loadingText}>Loading data…</Text>
    </View>
  );
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Failed to load</Text>
      <Text style={styles.errorSub}>{message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Gauge / Speedometer chart ────────────────────────────────────
export function GaugeChart({
  value, max = 100, label, sublabel, size = 180,
}: {
  value: number; max?: number; label?: string; sublabel?: string; size?: number;
}) {
  const pct = Math.min(1, Math.max(0, value / max));
  const cx = size / 2;
  const cy = size * 0.58;
  const r = size * 0.38;
  const strokeW = size * 0.085;

  const startAngle = 210;
  const totalArc = 240;
  const endAngle = startAngle + totalArc * pct;

  function polarToXY(deg: number, radius: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(startDeg: number, endDeg: number, radius: number) {
    const s = polarToXY(startDeg, radius);
    const e = polarToXY(endDeg, radius);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const needleDeg = startAngle + totalArc * pct;
  const needleLen = r * 0.82;
  const needleEnd = polarToXY(needleDeg, needleLen);
  const needleBase1 = polarToXY(needleDeg + 90, strokeW * 0.18);
  const needleBase2 = polarToXY(needleDeg - 90, strokeW * 0.18);

  const segments = [
    { from: 210, to: 258, color: '#e53935' },
    { from: 258, to: 306, color: '#fb8c00' },
    { from: 306, to: 354, color: '#fdd835' },
    { from: 354, to: 402, color: '#7cb342' },
    { from: 402, to: 450, color: '#2e7d32' },
  ];

  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size * 0.72}>
        <Path d={arcPath(210, 450, r)} fill="none" stroke="#e8e8e8" strokeWidth={strokeW} strokeLinecap="butt" />
        {segments.map((seg, i) => (
          <Path key={i} d={arcPath(seg.from, seg.to, r)} fill="none" stroke={seg.color} strokeWidth={strokeW} strokeLinecap="butt" opacity={0.25} />
        ))}
        {pct > 0 && (
          <Path
            d={arcPath(210, endAngle, r)}
            fill="none"
            stroke={pct < 0.2 ? '#e53935' : pct < 0.4 ? '#fb8c00' : pct < 0.6 ? '#fdd835' : pct < 0.8 ? '#7cb342' : '#2e7d32'}
            strokeWidth={strokeW}
            strokeLinecap="butt"
          />
        )}
        {ticks.map((t) => {
          const deg = 210 + (t / 100) * 240;
          const pos = polarToXY(deg, r + strokeW * 0.9);
          return (
            <SvgText key={t} x={pos.x} y={pos.y + 3} textAnchor="middle" fontSize={size * 0.07} fill={COLORS.midGray}>{t}</SvgText>
          );
        })}
        <Path d={`M ${needleBase1.x} ${needleBase1.y} L ${needleEnd.x} ${needleEnd.y} L ${needleBase2.x} ${needleBase2.y} Z`} fill={COLORS.white} />
        <Circle cx={cx} cy={cy} r={strokeW * 0.28} fill={COLORS.white} />
      </Svg>
      {label !== undefined && (
        <Text style={[styles.gaugeLabel, { fontSize: size * 0.13, marginTop: -size * 0.06 }]}>{label}</Text>
      )}
      {sublabel !== undefined && (
        <Text style={styles.gaugeSub}>{sublabel}</Text>
      )}
    </View>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────
export function DonutChart({
  segments, size = 120, label, sublabel,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number; label?: string; sublabel?: string;
}) {
  const cx = size / 2, cy = size / 2, r = size * 0.36, strokeW = size * 0.14;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let currentAngle = -90;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={strokeW} />
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const angle = pct * 360;
          const start = polarToXYDonut(currentAngle, r, cx, cy);
          currentAngle += angle;
          const end = polarToXYDonut(currentAngle, r, cx, cy);
          const large = angle > 180 ? 1 : 0;
          const path = `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
          return (
            <Path key={i} d={path} fill="none" stroke={seg.color} strokeWidth={strokeW} strokeLinecap="butt" />
          );
        })}
        {label !== undefined && (
          <>
            <SvgText x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.16} fontWeight="600" fill={COLORS.white}>{label}</SvgText>
            {sublabel && (
              <SvgText x={cx} y={cy + size * 0.14} textAnchor="middle" fontSize={size * 0.1} fill={COLORS.midGray}>{sublabel}</SvgText>
            )}
          </>
        )}
      </Svg>
    </View>
  );
}

function polarToXYDonut(deg: number, r: number, cx: number, cy: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── Donut with legend ───────────────────────────────────────────
// Mobile: donut centered, legend below in compact rows
// TV/web: donut left, legend right
export function DonutWithLegend({
  segments, size = 100,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const { width } = useWindowDimensions();
  const isTV = Platform.OS === 'web' && width >= 1024;
  const total = segments.reduce((s, x) => s + x.value, 0);

  const LegendItems = () => (
    <>
      {segments.map((s, i) => {
        const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{ width: 8, height: 8, backgroundColor: s.color, flexShrink: 0 }} />
            <Text style={{ fontSize: 11, color: COLORS.white, flex: 1 }} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.white }}>
              {s.value} · {pct}%
            </Text>
          </View>
        );
      })}
    </>
  );

  if (isTV) {
    // TV: side by side
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <DonutChart segments={segments} size={size} label={String(total)} sublabel="total" />
        <View style={{ flex: 1 }}><LegendItems /></View>
      </View>
    );
  }

  // Mobile: donut on top, legend below
  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <DonutChart segments={segments} size={size} label={String(total)} sublabel="total" />
      <View style={{ width: '100%' }}><LegendItems /></View>
    </View>
  );
}

// ─── Mini line sparkline ──────────────────────────────────────────
export function Sparkline({
  data, color = COLORS.white, width = 120, height = 40,
}: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const points = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * w,
    y: pad + (1 - (v - min) / range) * h,
  }));
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${d} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Path d={area} fill={color} opacity={0.15} />
      <Path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
    </Svg>
  );
}

// ─── Horizontal bar chart ─────────────────────────────────────────
export function HBarChart({
  data, color = COLORS.white,
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ gap: 10 }}>
      {data.map((d, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.barLabel}>{d.label}</Text>
            <Text style={styles.barNum}>{d.value}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(d.value / max) * 100}%`, backgroundColor: color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Column (vertical bar) chart ─────────────────────────────────
export function ColumnChart({
  data, color = COLORS.white, width = 160, height = 110, showValues = false,
}: {
  data: { label: string; value: number }[];
  color?: string; width?: number; height?: number; showValues?: boolean;
}) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const maxLabelLen = Math.max(...data.map((d) => d.label.length));
  // Enough bottom padding for rotated labels — minimum 60px
  const labelPad = Math.min(90, Math.max(60, maxLabelLen * 5.5));
  const padL = 8, padR = 4, padT = showValues ? 18 : 10, padB = labelPad;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const barW = Math.max(8, (chartW / data.length) * 0.55);
  const gap = chartW / data.length;
  // Total SVG height includes overflow from rotated labels
  const svgH = height + 10;

  return (
    <Svg width={width} height={svgH} viewBox={`0 0 ${width} ${svgH}`}>
      <Line x1={padL} y1={padT + chartH} x2={width - padR} y2={padT + chartH} stroke={COLORS.border} strokeWidth={1} />
      {data.map((d, i) => {
        const barH = Math.max(2, (d.value / max) * chartH);
        const barCenterX = padL + gap * i + gap / 2;
        const x = barCenterX - barW / 2;
        const y = padT + chartH - barH;
        const labelY = padT + chartH + 10;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} fill={color} rx={2} />
            {showValues && (
              <SvgText x={barCenterX} y={y - 5} textAnchor="middle" fontSize={9} fill={COLORS.white} fontWeight="500">
                {d.value}
              </SvgText>
            )}
            <SvgText
              x={barCenterX}
              y={labelY}
              fontSize={9}
              fill={COLORS.midGray}
              textAnchor="end"
              transform={`rotate(-50, ${barCenterX}, ${labelY})`}
            >
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Line chart ──────────────────────────────────────────────────
export function LineChart({
  data, color = COLORS.white, width = 160, height = 110, showDots = true, showLabels = true,
}: {
  data: { label: string; value: number }[];
  color?: string; width?: number; height?: number; showDots?: boolean; showLabels?: boolean;
}) {
  if (data.length < 2) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padL = 6, padR = 6, padT = 8, padB = showLabels ? 20 : 8;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const pts = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + (1 - (d.value - min) / range) * chartH,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${padT + chartH} L ${pts[0].x} ${padT + chartH} Z`;

  return (
    <Svg width={width} height={height}>
      <Path d={areaPath} fill={color} opacity={0.07} />
      <Path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {showDots && pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}
      {showLabels && data.map((d, i) => (
        <SvgText key={i} x={pts[i].x} y={padT + chartH + 12} textAnchor="middle" fontSize={8} fill={COLORS.midGray}>
          {d.label.length > 4 ? d.label.slice(0, 4) : d.label}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── Area chart (numeric array, no labels) ────────────────────────
export function AreaChart({
  data, color = COLORS.white, width = 160, height = 110,
}: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 6;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2 - 4;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * chartW,
    y: pad + (1 - (v - min) / range) * chartH,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${d} L ${pts[pts.length - 1].x} ${pad + chartH} L ${pts[0].x} ${pad + chartH} Z`;
  return (
    <Svg width={width} height={height}>
      <Path d={area} fill={color} opacity={0.1} />
      <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3.5} fill={color} />
    </Svg>
  );
}

// ─── Stacked bar chart ───────────────────────────────────────────
export function StackedBarChart({
  data, colors, labels, width = 160, height = 110,
}: {
  data: number[][];        // data[barIndex][segmentIndex]
  colors: string[];
  labels: string[];
  width?: number;
  height?: number;
}) {
  const padL = 4, padR = 4, padT = 8, padB = 20;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const maxTotal = Math.max(...data.map((bar) => bar.reduce((s, v) => s + v, 0)), 1);
  const barW = Math.max(6, (chartW / data.length) * 0.55);
  const gap = chartW / data.length;

  return (
    <Svg width={width} height={height}>
      <Line x1={padL} y1={padT + chartH} x2={width - padR} y2={padT + chartH} stroke={COLORS.border} strokeWidth={1} />
      {data.map((bar, i) => {
        const total = bar.reduce((s, v) => s + v, 0);
        const x = padL + gap * i + gap / 2 - barW / 2;
        let currentY = padT + chartH;
        return (
          <G key={i}>
            {bar.map((val, j) => {
              const segH = (val / maxTotal) * chartH;
              currentY -= segH;
              return <Rect key={j} x={x} y={currentY} width={barW} height={segH} fill={colors[j % colors.length]} rx={j === bar.length - 1 ? 1 : 0} />;
            })}
            <SvgText x={x + barW / 2} y={padT + chartH + 12} textAnchor="middle" fontSize={8} fill={COLORS.midGray}>
              {labels[i].length > 5 ? labels[i].slice(0, 5) + '…' : labels[i]}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── TV Table — compact multi-col list for TV/web ────────────────
// Renders a list of items as a responsive table.
// On TV (isTV=true): shows all rows in a multi-column grid without scroll.
// On mobile: renders as plain stacked rows.
// TVTable: on TV shows a compact table; on mobile shows avatar rows
export function TVTable({
  columns,
  rows,
  isTV = false,
  mobileRender,
}: {
  columns: { key: string; label: string; flex?: number }[];
  rows: Record<string, React.ReactNode>[];
  isTV?: boolean;
  // Optional custom mobile renderer — receives raw row data
  mobileRender?: (row: Record<string, React.ReactNode>, i: number) => React.ReactNode;
}) {
  // ── Mobile: use custom renderer if provided, else simple rows ──
  if (!isTV) {
    return (
      <View style={tvTableStyles.mobileWrapper}>
        {rows.map((row, i) =>
          mobileRender
            ? <React.Fragment key={i}>{mobileRender(row, i)}</React.Fragment>
            : (
              <View key={i} style={[tvTableStyles.mobileRow, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
                {columns.slice(0, 2).map((col) => (
                  <View key={col.key} style={{ flex: col.flex ?? 1 }}>
                    <Text style={tvTableStyles.cell} numberOfLines={1}>{row[col.key] as string}</Text>
                  </View>
                ))}
              </View>
            )
        )}
      </View>
    );
  }

  // ── TV: full table ──
  return (
    <View style={tvTableStyles.wrapper}>
      <View style={[tvTableStyles.row, tvTableStyles.headerRow]}>
        {columns.map((col) => (
          <Text key={col.key} style={[tvTableStyles.headerCell, { flex: col.flex ?? 1 }]} numberOfLines={1}>
            {col.label.toUpperCase()}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={[tvTableStyles.row, i % 2 === 0 && tvTableStyles.rowEven]}>
          {columns.map((col) => (
            <View key={col.key} style={{ flex: col.flex ?? 1 }}>
              {typeof row[col.key] === 'string' || typeof row[col.key] === 'number' ? (
                <Text style={tvTableStyles.tvCell} numberOfLines={1}>{row[col.key] as string}</Text>
              ) : row[col.key]}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const tvTableStyles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  mobileWrapper: {
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    backgroundColor: COLORS.black,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  headerCell: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: '#0c0d1c',
  },
  cell: {
    fontSize: 11,
    color: COLORS.white,
  },
  tvBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tvRow: {
    width: '50%',
  },
  tvCell: {
    fontSize: 12,
    color: COLORS.white,
  },
});

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: FONT.size.xs, fontWeight: '600', letterSpacing: 0.3 },
  sectionTitle: {
    fontSize: FONT.size.xs, fontWeight: '600', color: COLORS.sub,
    letterSpacing: 0.8, marginBottom: 10, marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.lightGray, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 8,
  },
  chartCard: {
    // flex:1 causes overflow in ChartGrid — use percentage instead
    backgroundColor: COLORS.lightGray, borderWidth: 1, borderColor: COLORS.border,
    padding: 10, margin: 4,
    overflow: 'hidden',
  },
  chartCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  chartCardTitle: {
    fontSize: 9, fontWeight: '600', color: COLORS.sub,
    letterSpacing: 0.5, textTransform: 'uppercase', flex: 1,
  },
  chartGridRow: {
    flexDirection: 'row', marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  statKey: { fontSize: FONT.size.sm, color: COLORS.sub, flex: 1 },
  statVal: { fontSize: FONT.size.sm, fontWeight: '600', color: COLORS.white, textAlign: 'right' },
  progressBg: { height: 5, backgroundColor: COLORS.muted, overflow: 'hidden' },
  progressFill: { height: 5 },
  kpiBox: {
    flex: 1, backgroundColor: '#0c0d1c', borderWidth: 1, borderColor: COLORS.border,
    padding: 12, margin: 4,
  },
  kpiLabel: { fontSize: FONT.size.xs, color: COLORS.midGray, marginBottom: 4, letterSpacing: 0.3 },
  kpiValue: { fontSize: 18, fontWeight: '600', color: COLORS.white },
  kpiNote: { fontSize: FONT.size.xs, color: '#aaa', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORS.darkGray },
  loadingText: { marginTop: 12, fontSize: FONT.size.md, color: COLORS.midGray },
  errorText: { fontSize: FONT.size.lg, fontWeight: '600', color: COLORS.white, marginBottom: 6 },
  errorSub: { fontSize: FONT.size.sm, color: COLORS.midGray, textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: COLORS.black, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: COLORS.white, fontWeight: '600', fontSize: FONT.size.md },
  gaugeLabel: { fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  gaugeSub: { fontSize: FONT.size.xs, color: COLORS.midGray, marginTop: 2, textAlign: 'center' },
  barLabel: { fontSize: FONT.size.xs, color: COLORS.sub, flex: 1 },
  barNum: { fontSize: FONT.size.xs, color: COLORS.white, fontWeight: '600' },
  barTrack: { height: 6, backgroundColor: COLORS.border },
  barFill: { height: 6 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: COLORS.lightGray,
    padding: 18,
    paddingBottom: 32,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '88%',
    minHeight: 320,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  modalTitle: {
    fontSize: FONT.size.md,
    fontWeight: '600',
    color: COLORS.white,
  },

  // ── TV overrides ──────────────────────────────────────────────
  chartCardTV: {
    padding: 14,
  },
  chartCardTitleTV: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.sub,
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
  },
  kpiBoxTV: {
    padding: 18,
  },
  kpiLabelTV: {
    fontSize: 13,
    marginBottom: 6,
  },
  kpiValueTV: {
    fontSize: 28,
  },
  kpiNoteTV: {
    fontSize: 12,
    marginTop: 4,
  },
});
