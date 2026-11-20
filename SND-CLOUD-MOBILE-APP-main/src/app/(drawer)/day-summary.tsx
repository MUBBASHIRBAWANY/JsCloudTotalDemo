import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';

import { getDataFundtion as getCloudData } from '@/api/CurdFunctions';
import { getDataFundtion as getSndData } from '@/api/SNDCurdFunctions';
import { useAppPopup } from '@/components/ui/AppPopup';
import { theme, ui } from '@/constants/app-theme';
import { useLoginUser, type Row } from '@/hooks/useLoginUser';
import { isPendingCustomer } from '@/lib/customerForm';
import {
  blankDashboard,
  dayLabel,
  formatCompact,
  formatCount,
  formatDecimal,
  measureSummary,
  readDaySummary,
  readDayTrend,
  recentDates,
  shortDateLabel,
  todayKey,
  trendPointFromSummary,
  trendRange,
  type DaySummary,
  type DayTrendPoint,
  type PackProduct,
} from '@/lib/daySummary';
import { money } from '@/lib/distributorSaleOrder';
import type { RootState } from '@/redux/Store/types';

const paramText = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
};

const dateList = (value: string) =>
  value.split(',').map((date) => date.trim()).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));

const SkuBars = ({
  rows,
  activeDate,
}: {
  rows: { date: string; label: string; value: number }[];
  activeDate: string;
}) => {
  const max = Math.max(...rows.map((row) => row.value), 0);
  return (
    <View style={styles.barList}>
      {rows.map((row) => {
        const share = max > 0 ? row.value / max : 0;
        const active = row.date === activeDate;
        return (
          <View key={row.date} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={2}>{row.label}</Text>
            <View style={styles.barTrack}>
              {share > 0 ? (
                <LinearGradient
                  colors={active ? ['#5EEAD4', '#0F766E'] : ['#A7F3D0', '#5EEAD4']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.barFill, { width: `${Math.max(share * 100, 8)}%` }]}
                />
              ) : null}
            </View>
            <View style={styles.barChipSlot}>
              {active ? (
                <View style={styles.barChip}>
                  <Text style={styles.barChipText}>{row.value.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const TrendChart = ({ points }: { points: { label: string; value: number }[] }) => {
  const [width, setWidth] = useState(0);
  const plotHeight = 132;
  const plotLeft = 36;
  const baseline = 10;
  const topPad = 22;
  const max = Math.max(...points.map((point) => point.value), 0);
  const plotWidth = Math.max(width - plotLeft, 0);
  const innerHeight = plotHeight - topPad - baseline;
  const step = points.length > 0 ? plotWidth / points.length : 0;
  const coords = points.map((point, index) => {
    const x = plotLeft + step * index + step / 2;
    const y = max <= 0 ? plotHeight - baseline : topPad + (1 - point.value / max) * innerHeight;
    return { x, y };
  });
  const yAt = (x: number) => {
    if (coords.length === 0) return plotHeight - baseline;
    if (coords.length === 1 || x <= coords[0].x) return coords[0].y;
    for (let index = 1; index < coords.length; index += 1) {
      const previous = coords[index - 1];
      const next = coords[index];
      if (x <= next.x) {
        const span = next.x - previous.x || 1;
        return previous.y + ((x - previous.x) / span) * (next.y - previous.y);
      }
    }
    return coords[coords.length - 1].y;
  };
  const strips = [];
  for (let x = plotLeft; x < plotLeft + plotWidth; x += 3) {
    const y = yAt(x);
    strips.push({ x, y, height: Math.max(plotHeight - baseline - y, 0) });
  }

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={{ height: plotHeight }}>
        {max > 0 ? (
          <Text style={[styles.axisLabel, { top: 0 }]} numberOfLines={1}>{formatCompact(max)}</Text>
        ) : null}
        <Text style={[styles.axisLabel, { top: plotHeight - baseline - 14 }]} numberOfLines={1}>0</Text>
        <View style={[styles.baseline, { top: plotHeight - baseline, left: plotLeft, right: 0 }]} />
        {coords.map((point, index) => (
          <View key={`grid-${points[index]?.label || index}`} style={[styles.gridLine, { left: point.x, height: plotHeight - baseline }]} />
        ))}
        {strips.map((strip) => (
          <View
            key={`fill-${strip.x}`}
            style={{
              position: 'absolute',
              left: strip.x,
              top: strip.y,
              width: 3,
              height: strip.height,
              backgroundColor: 'rgba(47, 111, 224, 0.16)',
            }}
          />
        ))}
        {coords.slice(1).map((point, index) => {
          const previous = coords[index];
          const dx = point.x - previous.x;
          const dy = point.y - previous.y;
          const length = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={`line-${points[index + 1]?.label || index}`}
              style={{
                position: 'absolute',
                left: (previous.x + point.x) / 2 - length / 2,
                top: (previous.y + point.y) / 2 - 1.5,
                width: length,
                height: 3,
                borderRadius: 2,
                backgroundColor: '#3B82F6',
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}
        {coords.map((point, index) => (
          <View key={`dot-${points[index]?.label || index}`} style={[styles.dot, { left: point.x - 5, top: point.y - 5 }]} />
        ))}
        {width > 0 ? coords.map((point, index) => (
          <Text
            key={`value-${points[index]?.label || index}`}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            style={[styles.pointValue, { left: point.x - step / 2, width: Math.max(step, 0), top: Math.max(point.y - 16, 0) }]}
          >
            {formatCompact(points[index]?.value || 0)}
          </Text>
        )) : null}
      </View>
      <View style={[styles.trendLabels, { marginLeft: plotLeft }]}>
        {points.map((point) => (
          <Text key={point.label} style={styles.trendLabel}>{point.label}</Text>
        ))}
      </View>
    </View>
  );
};

const DaySummaryScreen = () => {
  const popup = useAppPopup();
  const { loginServer, loginVendor, orderBookerId } = useLoginUser();
  const params = useLocalSearchParams<{ dates?: string | string[] }>();
  const datesParam = paramText(params.dates);
  const requested = useMemo(() => dateList(datesParam), [datesParam]);
  const products = useSelector((state: RootState) => state.Product.Product) as PackProduct[];
  const parties = useSelector((state: RootState) => state.distributors.Distributor) as Row[];
  const [activeDate, setActiveDate] = useState(() => requested[requested.length - 1] || todayKey());
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [trend, setTrend] = useState<DayTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const assigned = useMemo(
    () => parties.filter((row) => row._id && !isPendingCustomer(row)).length,
    [parties],
  );
  const menuDates = useMemo(() => {
    const dates = new Set([...requested, ...recentDates(todayKey(), 7)]);
    return [...dates].sort((left, right) => right.localeCompare(left));
  }, [requested]);

  const loadReport = useCallback(async (path: string) => {
    if (loginServer === 'snd') return getSndData(path);
    const token = await AsyncStorage.getItem('OrderBookerToken');
    return getCloudData(path, token ? { Authorization: `Bearer ${token}` } : undefined);
  }, [loginServer]);

  const load = useCallback(async (options?: { refresh?: boolean }) => {
    if (!orderBookerId) {
      if (!options?.refresh) popup.info('Day summary', 'Sign in again so this summary can load.');
      return;
    }
    if (options?.refresh) setRefreshing(true);
    else setLoading(true);
    const range = trendRange(todayKey());
    const root = loginServer === 'snd' ? '/saleOrder' : '/DistributorSaleOrder';
    const summaryPath = (date: string) =>
      `${root}/daySummary?date=${encodeURIComponent(date)}&OrderBooker=${encodeURIComponent(orderBookerId)}`;
    try {
      const [summaryPayload, trendPayload] = await Promise.all([
        loadReport(summaryPath(activeDate)),
        loadReport(
          `${root}/dayTrend?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&OrderBooker=${encodeURIComponent(orderBookerId)}`,
        ).catch(() => null),
      ]);
      const nextSummary = readDaySummary(summaryPayload);
      let nextTrend = trendPayload ? readDayTrend(trendPayload) : [];
      if (nextTrend.length === 0) {
        const fallback = await Promise.all(recentDates(todayKey(), 7).map(async (date) => {
          try {
            const payload = await loadReport(summaryPath(date));
            const day = readDaySummary(payload);
            return day ? trendPointFromSummary(day) : null;
          } catch {
            return null;
          }
        }));
        nextTrend = fallback.filter((point): point is DayTrendPoint => point !== null);
      }
      setSummary(nextSummary);
      setTrend(nextTrend);
    } catch {
      popup.error('Day summary', 'Could not load the day summary. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeDate, loadReport, loginServer, orderBookerId, popup]);

  useEffect(() => {
    if (!orderBookerId) return;
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load, loginServer, orderBookerId]);

  const visible = summary?.date === activeDate ? summary : null;
  const bookerName = visible?.orderBookerName?.trim()
    || loginVendor?.OrderBookerName?.trim()
    || loginVendor?.firstname?.trim()
    || '';
  const metrics = visible ? measureSummary(visible, products) : blankDashboard();
  const productive = visible?.totals.customers || 0;
  const outletTotal = Math.max(assigned, productive);
  const trendByDate = useMemo(() => new Map(trend.map((point) => [point.date, point])), [trend]);
  const bars = recentDates(todayKey(), 7).map((date) => {
    const point = trendByDate.get(date);
    const value = visible?.date === date ? metrics.avgSkuPerBill : point?.avgSkuPerBill || 0;
    return { date, label: dayLabel(date), value };
  });
  const weeks = trendRange(todayKey()).weeks.map((week) => ({
    label: week.label,
    value: trend.reduce((sum, point) => (
      point.date >= week.start && point.date <= week.end ? sum + point.sales : sum
    ), 0),
  }));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} tintColor="#2F6FBE" />}
    >
      <View style={styles.heroWrap}>
        <View style={styles.hero}>
          {bookerName ? <Text style={styles.heroName} numberOfLines={1}>{bookerName}</Text> : null}
          <View style={styles.heroTop}>
            <Text style={styles.heroAmount}>{formatDecimal(metrics.net)} /-</Text>
            <View style={styles.productive}>
              <Feather name="file-text" size={12} color="#15803D" />
              <Text style={styles.productiveText}>{productive}/{outletTotal} productive</Text>
            </View>
          </View>
          <Text style={styles.heroLine}>{formatDecimal(metrics.avgSkuPerOutlet)} average SKU per outlet</Text>
          <Text style={styles.heroLine}>{formatDecimal(metrics.cartons)} Cartons | {formatCount(metrics.units)} Units</Text>
          <View style={styles.heroBottom}>
            <View style={styles.heroMeasures}>
              <Feather name="droplet" size={14} color="#FFFFFF" />
              <Text style={styles.heroMeasure}>{formatDecimal(metrics.liters)} ltrs</Text>
              <MaterialCommunityIcons name="weight-kilogram" size={15} color="#FFFFFF" />
              <Text style={styles.heroMeasure}>{formatDecimal(metrics.kg)} kgs</Text>
            </View>
            <Pressable onPress={() => setShowMore((open) => !open)} hitSlop={8}>
              <Text style={styles.showMore}>{showMore ? 'Show less' : 'Show More →'}</Text>
            </Pressable>
          </View>
          {loading && !visible ? <ActivityIndicator color="#FFFFFF" style={styles.heroSpinner} /> : null}
        </View>
        <View style={styles.chartButton} pointerEvents="none">
          <Feather name="bar-chart-2" size={22} color="#2F6FE0" />
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View>
            <Text style={styles.todayTitle}>{dayLabel(activeDate).toUpperCase()}</Text>
            <Text style={styles.panelSub}>Average SKU/Bill</Text>
          </View>
          <View>
            <Pressable style={styles.dropdown} onPress={() => setMenuOpen((open) => !open)}>
              <Text style={styles.dropdownText}>{activeDate === todayKey() ? 'Today' : shortDateLabel(activeDate)}</Text>
              <Feather name="chevron-down" size={16} color="#475569" />
            </Pressable>
            {menuOpen ? (
              <View style={styles.menu}>
                {menuDates.map((date) => (
                  <Pressable
                    key={date}
                    style={styles.menuItem}
                    onPress={() => {
                      setActiveDate(date);
                      setMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.menuText, date === activeDate && styles.menuTextActive]}>
                      {dayLabel(date)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.todayBody}>
          <View style={styles.todayBars}>
            <SkuBars rows={bars} activeDate={activeDate} />
          </View>

        </View>
      </View>

      {loginServer === 'snd' ? (
        <View style={styles.panel}>
          <Text style={styles.trendTitle}>Sales Trend (Value)</Text>
          <Text style={styles.panelSub}>Purchase invoices already created. Each week starts Monday.</Text>
          <TrendChart points={weeks} />
        </View>
      ) : null}

      {showMore ? (
        <View>
          <Text style={styles.detailDate}>
            {activeDate}{bookerName ? `  ·  ${bookerName}` : ''}
          </Text>
          {visible && visible.customers.length > 0 ? visible.customers.map((customer) => (
            <View key={customer.saleOrderId || customer.saleOrderNumber} style={styles.card}>
              <Text style={styles.customer}>{customer.customerName}</Text>
              <Text style={styles.meta}>
                {customer.saleOrderNumber ? `Order ${customer.saleOrderNumber}` : 'Order'}
                {customer.customerCode ? `  ·  ${customer.customerCode}` : ''}
              </Text>
              {customer.remarks ? <Text style={styles.meta}>{customer.remarks}</Text> : null}
              {customer.lines.map((line, index) => (
                <View key={`${line.productId}-${index}`} style={styles.line}>
                  <Text style={styles.product}>{line.productName}</Text>
                  <Text style={styles.meta}>
                    {line.carton} ctn · {line.box} box · Rate {money(line.rate)}
                  </Text>
                  <Text style={styles.meta}>Gross {money(line.gross)} · GST {money(line.gst)} · Net {money(line.net)}</Text>
                </View>
              ))}
              <Text style={styles.cardTotal}>
                {customer.carton} ctn · {customer.box} box · Net {money(customer.net)}
              </Text>
            </View>
          )) : (
            <Text style={ui.empty}>No sent orders for {activeDate}.</Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heroWrap: {
    marginBottom: 8,
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  hero: {
    backgroundColor: '#3B7FC4',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroAmount: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  productive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  productiveText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  heroLine: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  heroBottom: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroMeasures: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  heroMeasure: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  showMore: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroSpinner: {
    marginTop: 10,
  },
  chartButton: {
    alignSelf: 'center',
    marginTop: -22,
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    zIndex: 2,
  },
  todayTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  panelSub: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 13,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  menu: {
    position: 'absolute',
    top: 42,
    right: 0,
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuText: {
    color: '#334155',
    fontSize: 14,
  },
  menuTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  todayBody: {
    flexDirection: 'row',
    gap: 8,
  },
  todayBars: {
    flex: 1.25,
  },
  barList: {
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
  },
  barLabel: {
    width: 64,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 14,
  },
  barTrack: {
    flex: 1,
    height: 12,
    justifyContent: 'center',
  },
  barFill: {
    height: 12,
    borderRadius: 6,
  },
  barChipSlot: {
    width: 42,
    alignItems: 'flex-end',
  },
  barChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  barChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  trendTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  axisLabel: {
    position: 'absolute',
    left: 0,
    width: 34,
    color: '#94A3B8',
    fontSize: 10,
  },
  pointValue: {
    position: 'absolute',
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '700',
  },
  baseline: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: '#E8EEF5',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  trendLabels: {
    flexDirection: 'row',
    marginTop: 6,
  },
  trendLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 11,
    lineHeight: 14,
  },
  detailDate: {
    marginBottom: 8,
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  card: ui.card,
  customer: ui.cardTitle,
  meta: ui.cardMeta,
  line: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  product: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cardTotal: {
    marginTop: 10,
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
});

export default DaySummaryScreen;
