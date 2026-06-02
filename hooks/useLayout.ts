import { useWindowDimensions, Platform } from 'react-native';

export type LayoutMode = 'mobile' | 'tv';

export function useLayout(): {
  mode: LayoutMode;
  isTV: boolean;
  W: number;
  cols: number;
  chartH: number;
  kpiCols: number;
  padding: number;
  gaugeSize: number;
  listCols: number;
  cardW: number;
} {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTV = isWeb && width >= 1024;

  if (isTV) {
    const padding = 32;
    const W = width - padding * 2;
    return {
      mode: 'tv',
      isTV: true,
      W,
      cols: 4,
      chartH: 220,
      kpiCols: 4,
      padding,
      gaugeSize: 180,
      listCols: 3,
      cardW: Math.floor((W - 48) / 4),
    };
  }

  const W = width - 32;
  return {
    mode: 'mobile',
    isTV: false,
    W,
    cols: 2,
    chartH: 110,
    kpiCols: 2,
    padding: 16,
    gaugeSize: 120,
    listCols: 1,
    cardW: W,
  };
}
