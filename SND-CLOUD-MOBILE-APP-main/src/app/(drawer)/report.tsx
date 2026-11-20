import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppPopup } from '@/components/ui/AppPopup';
import { theme, ui } from '@/constants/app-theme';
import {
  isTsmRole,
  isZsmRole,
  resolveDistributorId,
  useLoginUser,
} from '@/hooks/useLoginUser';
import { deviceBusinessDate } from '@/lib/networkTime';
import {
  emptyTsmDailyReport,
  fetchTsmDailyReport,
  statusLabel,
  type TsmActivityStatus,
  type TsmDailyReport,
  type TsmReportBooker,
  type TsmReportRow,
} from '@/lib/tsmDailyReport';
import {
  emptyZsmDailyReport,
  fetchZsmDailyReport,
  type ZsmDailyReport,
  type ZsmReportDistributor,
  type ZsmReportTsm,
} from '@/lib/zsmDailyReport';

const parseYmd = (yyyyMmDd: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

const shiftDate = (yyyyMmDd: string, deltaDays: number) => {
  const parsed = parseYmd(yyyyMmDd);
  if (!parsed) return yyyyMmDd;
  const next = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + deltaDays));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
};

const friendlyDate = (yyyyMmDd: string) => {
  const parsed = parseYmd(yyyyMmDd);
  if (!parsed) return yyyyMmDd;
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)));
};

const monthLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const FILTERS: { key: 'all' | TsmActivityStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'order', label: 'Order' },
  { key: 'visit', label: 'Visit' },
  { key: 'nothing', label: 'Nothing' },
];

const includesText = (value: unknown, needle: string) =>
  String(value || '').toLowerCase().includes(needle);

const filterBookers = (
  bookers: TsmReportBooker[],
  needle: string,
  statusFilter: 'all' | TsmActivityStatus,
  keepAllShops: boolean,
) =>
  bookers
    .map((booker) => {
      const bookerHit =
        !needle
        || includesText(booker.orderBookerName, needle)
        || includesText(booker.loginId, needle)
        || includesText(booker.code, needle);
      const statusRows = statusFilter === 'all'
        ? booker.rows
        : booker.rows.filter((row) => row.status === statusFilter);
      const shops = statusRows.filter((row) =>
        !needle
        || keepAllShops
        || bookerHit
        || includesText(row.shopName, needle)
        || includesText(row.shopOwner, needle)
        || includesText(row.saleOrderNumber, needle),
      );
      if (!needle) {
        return shops.length || statusFilter === 'all' ? { ...booker, rows: shops } : null;
      }
      if (bookerHit || shops.length) {
        return {
          ...booker,
          rows: bookerHit && keepAllShops ? statusRows : shops,
        };
      }
      return null;
    })
    .filter(Boolean) as TsmReportBooker[];

const filterZsmDistributors = (
  distributors: ZsmReportDistributor[],
  query: string,
  statusFilter: 'all' | TsmActivityStatus,
) => {
  const needle = query.trim().toLowerCase();
  const showTsmVisits = statusFilter === 'all' || statusFilter === 'visit';

  return distributors
    .map((dist) => {
      const distHit =
        !needle
        || includesText(dist.distributorName, needle)
        || includesText(dist.systemCode, needle)
        || includesText(dist.distributorId, needle);

      const tsms = showTsmVisits
        ? (dist.tsms
          .map((tsm) => {
            const tsmHit = !needle || includesText(tsm.tsmName, needle);
            const visits = tsm.visits.filter((visit) =>
              !needle
              || distHit
              || tsmHit
              || includesText(visit.shopName, needle)
              || includesText(visit.shopOwner, needle)
              || includesText(visit.saleOrderNumber, needle)
              || includesText(visit.remarks, needle),
            );
            if (!needle) {
              if (statusFilter === 'visit' && !tsm.visits.length) return null;
              return tsm;
            }
            if (distHit || tsmHit || visits.length) {
              const nextVisits = distHit || tsmHit ? tsm.visits : visits;
              if (statusFilter === 'visit' && !nextVisits.length) return null;
              return {
                ...tsm,
                visits: nextVisits,
                visitCount: nextVisits.length,
              };
            }
            return null;
          })
          .filter(Boolean) as ZsmReportTsm[])
        : [];

      const bookers = filterBookers(
        dist.bookers,
        needle,
        statusFilter,
        Boolean(needle && distHit),
      );

      const hasContent = tsms.length > 0 || bookers.length > 0;
      if (statusFilter === 'all') {
        if (!needle) return { ...dist, tsms: dist.tsms, bookers };
        if (distHit || hasContent) {
          return {
            ...dist,
            tsms: distHit ? dist.tsms : tsms,
            bookers: distHit
              ? filterBookers(dist.bookers, '', statusFilter, true)
              : bookers,
          };
        }
        return null;
      }

      // Visit / Order / Nothing — only distributors that have matching data.
      if (!hasContent) return null;
      return {
        ...dist,
        tsms,
        bookers,
      };
    })
    .filter(Boolean) as ZsmReportDistributor[];
};

const SearchField = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) => (
  <View style={styles.searchBox}>
    <Feather name="search" size={16} color={theme.colors.muted} />
    <TextInput
      style={styles.searchInput}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.muted}
      autoCorrect={false}
      autoCapitalize="none"
      clearButtonMode="while-editing"
    />
    {value ? (
      <TouchableOpacity onPress={() => onChange('')} hitSlop={8} accessibilityLabel="Clear search">
        <Feather name="x" size={16} color={theme.colors.muted} />
      </TouchableOpacity>
    ) : null}
  </View>
);

const MonthCalendar = ({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) => {
  const selected = parseYmd(selectedDate) || parseYmd(deviceBusinessDate())!;
  const [year, setYear] = useState(selected.year);
  const [month, setMonth] = useState(selected.month);
  const today = deviceBusinessDate();

  useEffect(() => {
    const next = parseYmd(selectedDate);
    if (!next) return;
    setYear(next.year);
    setMonth(next.month);
  }, [selectedDate]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const blanks = Array.from({ length: firstWeekday }, () => null as number | null);
    const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
    return [...blanks, ...days];
  }, [month, year]);

  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth() + 1);
  };

  return (
    <View style={styles.calendarPanel}>
      <View style={styles.calendarNav}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => shiftMonth(-1)} accessibilityLabel="Previous month">
          <Feather name="chevron-left" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.calendarMonth}>{monthLabel(year, month)}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => shiftMonth(1)} accessibilityLabel="Next month">
          <Feather name="chevron-right" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekdayText}>{day}</Text>
        ))}
      </View>

      <View style={styles.dayGrid}>
        {cells.map((day, index) => {
          if (!day) return <View key={`blank-${index}`} style={styles.dayCell} />;
          const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = value === selectedDate;
          const isToday = value === today;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.dayCell, isToday && styles.dayToday, isSelected && styles.daySelected]}
              onPress={() => onSelectDate(value)}
            >
              <Text style={[styles.dayText, isToday && styles.dayTodayText, isSelected && styles.daySelectedText]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const statusTone = (status: TsmActivityStatus) => {
  if (status === 'order') {
    return { bg: theme.colors.successSoft, fg: theme.colors.success, icon: 'shopping-bag' as const };
  }
  if (status === 'visit') {
    return { bg: theme.colors.infoSoft, fg: theme.colors.info, icon: 'map-pin' as const };
  }
  return { bg: theme.colors.warningSoft, fg: theme.colors.warning, icon: 'minus-circle' as const };
};

const StatCell = ({
  label,
  value,
  tone,
  active = false,
  onPress,
}: {
  label: string;
  value: number;
  tone: 'order' | 'visit' | 'nothing' | 'neutral';
  active?: boolean;
  onPress?: () => void;
}) => {
  const colors =
    tone === 'order'
      ? { fg: theme.colors.success, bg: theme.colors.successSoft }
      : tone === 'visit'
        ? { fg: theme.colors.info, bg: theme.colors.infoSoft }
        : tone === 'nothing'
          ? { fg: theme.colors.warning, bg: theme.colors.warningSoft }
          : { fg: theme.colors.primary, bg: theme.colors.primarySoft };
  const body = (
    <>
      <Text style={[styles.statValue, { color: colors.fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.fg }]} numberOfLines={1}>{label}</Text>
    </>
  );
  if (!onPress) {
    return (
      <View style={[styles.statCell, { backgroundColor: colors.bg }, active && styles.statCellActive]}>
        {body}
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.statCell, { backgroundColor: colors.bg }, active && styles.statCellActive]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {body}
    </TouchableOpacity>
  );
};

const DateBar = ({
  date,
  calendarOpen,
  onChangeDate,
  onToggleCalendar,
}: {
  date: string;
  calendarOpen: boolean;
  onChangeDate: (next: string) => void;
  onToggleCalendar: () => void;
}) => {
  const today = deviceBusinessDate();
  const isToday = date === today;
  return (
    <View style={styles.dateBlock}>
      <View style={styles.dateBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => onChangeDate(shiftDate(date, -1))} accessibilityLabel="Previous day">
          <Feather name="chevron-left" size={18} color={theme.colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateCenter} onPress={onToggleCalendar} activeOpacity={0.85}>
          <Feather name="calendar" size={16} color={theme.colors.primary} />
          <View style={styles.dateCenterText}>
            <Text style={styles.dateMain}>{friendlyDate(date)}</Text>
            <Text style={styles.dateHint}>{calendarOpen ? 'Hide calendar' : 'Tap for calendar'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => onChangeDate(shiftDate(date, 1))} accessibilityLabel="Next day">
          <Feather name="chevron-right" size={18} color={theme.colors.ink} />
        </TouchableOpacity>
      </View>

      {!isToday ? (
        <TouchableOpacity style={styles.todayBtn} onPress={() => onChangeDate(today)}>
          <Text style={styles.todayBtnText}>Today</Text>
        </TouchableOpacity>
      ) : null}

      {calendarOpen ? (
        <MonthCalendar
          selectedDate={date}
          onSelectDate={(next) => {
            onChangeDate(next);
            onToggleCalendar();
          }}
        />
      ) : null}
    </View>
  );
};

const FilterRow = ({
  filter,
  onChange,
}: {
  filter: 'all' | TsmActivityStatus;
  onChange: (next: 'all' | TsmActivityStatus) => void;
}) => (
  <View style={styles.filterRow}>
    {FILTERS.map((item) => {
      const active = filter === item.key;
      return (
        <TouchableOpacity
          key={item.key}
          style={[styles.filterChip, active && styles.filterChipActive]}
          onPress={() => onChange(item.key)}
        >
          <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const ShopRow = ({ row }: { row: TsmReportRow }) => {
  const tone = statusTone(row.status);
  return (
    <View style={styles.shopRow}>
      <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
      <View style={styles.shopTextWrap}>
        <Text style={styles.shopName} numberOfLines={1}>{row.shopName}</Text>
        <Text style={styles.shopMeta} numberOfLines={1}>
          {row.saleOrderNumber ? `#${row.saleOrderNumber}` : friendlyDate(row.date)}
          {row.shopOwner ? ` · ${row.shopOwner}` : ''}
        </Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
        <Text style={[styles.statusText, { color: tone.fg }]}>{statusLabel(row.status)}</Text>
      </View>
    </View>
  );
};

const BookerCard = ({
  booker,
  expanded,
  onToggle,
  nested = false,
}: {
  booker: TsmReportBooker;
  expanded: boolean;
  onToggle: () => void;
  nested?: boolean;
}) => {
  const orderCount = booker.rows.filter((row) => row.status === 'order').length;
  const visitCount = booker.rows.filter((row) => row.status === 'visit').length;
  const nothingCount = booker.rows.filter((row) => row.status === 'nothing').length;
  return (
    <View style={nested ? styles.nestedCard : styles.listCard}>
      <Pressable onPress={onToggle} style={styles.rowHeader}>
        <View style={[styles.avatar, styles.avatarPrimary]}>
          <Feather name="user" size={14} color={theme.colors.primary} />
        </View>
        <View style={styles.rowTitleWrap}>
          <Text style={styles.rowTitle} numberOfLines={1}>{booker.orderBookerName}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {orderCount} order · {visitCount} visit · {nothingCount} nothing
          </Text>
        </View>
        <Text style={styles.countBadge}>{booker.rows.length}</Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
      </Pressable>
      {expanded ? (
        booker.rows.length ? (
          booker.rows.map((row) => (
            <ShopRow key={`${booker.orderBookerId}-${row.customerId}`} row={row} />
          ))
        ) : (
          <Text style={styles.inlineEmpty}>No data</Text>
        )
      ) : null}
    </View>
  );
};

const ZsmDistributorCard = ({
  distributor,
  expanded,
  bookerExpanded,
  tsmExpanded,
  statusFilter,
  onToggle,
  onToggleTsm,
  onToggleBooker,
}: {
  distributor: ZsmReportDistributor;
  expanded: boolean;
  bookerExpanded: string;
  tsmExpanded: string;
  statusFilter: 'all' | TsmActivityStatus;
  onToggle: () => void;
  onToggleTsm: (id: string) => void;
  onToggleBooker: (id: string) => void;
}) => {
  const showTsmVisits = statusFilter === 'all' || statusFilter === 'visit';
  const tsmVisitTotal = distributor.tsms.reduce((sum, row) => sum + row.visitCount, 0);
  const bookerOrder = distributor.bookers.reduce(
    (sum, booker) => sum + booker.rows.filter((row) => row.status === 'order').length,
    0,
  );
  const bookerNothing = distributor.bookers.reduce(
    (sum, booker) => sum + booker.rows.filter((row) => row.status === 'nothing').length,
    0,
  );
  return (
  <View style={styles.listCard}>
    <Pressable onPress={onToggle} style={styles.rowHeader}>
      <View style={[styles.avatar, styles.avatarInk]}>
        <Feather name="briefcase" size={14} color={theme.colors.ink} />
      </View>
      <View style={styles.rowTitleWrap}>
        <Text style={styles.rowTitle} numberOfLines={1}>{distributor.distributorName}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {distributor.missing
            ? 'Distributor record missing'
            : `${distributor.tsms.length} TSM · ${distributor.bookers.length} bookers`}
        </Text>
      </View>
      <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
    </Pressable>

    {expanded && !distributor.missing ? (
      <View style={styles.expandedBody}>
        <View style={styles.miniStats}>
          <StatCell label="TSM" value={distributor.tsms.length} tone="neutral" />
          <StatCell label="Visits" value={tsmVisitTotal} tone="visit" />
          <StatCell label="Order" value={bookerOrder} tone="order" />
          <StatCell label="Nothing" value={bookerNothing} tone="nothing" />
        </View>

        {showTsmVisits ? (
          <>
            <Text style={styles.groupLabel}>TSM visits</Text>
            {distributor.tsms.length ? (
              distributor.tsms.map((tsm) => {
                const open = tsmExpanded === tsm.tsmId;
                return (
                  <View key={tsm.tsmId} style={styles.nestedCard}>
                    <Pressable onPress={() => onToggleTsm(tsm.tsmId)} style={styles.rowHeaderCompact}>
                      <View style={[styles.avatar, styles.avatarInfo]}>
                        <Feather name="shield" size={13} color={theme.colors.info} />
                      </View>
                      <View style={styles.rowTitleWrap}>
                        <Text style={styles.nestedTitle} numberOfLines={1}>{tsm.tsmName}</Text>
                        <Text style={styles.rowMeta}>
                          {tsm.visitCount} visit{tsm.visitCount === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.muted} />
                    </Pressable>
                    {open ? (
                      tsm.visits.length ? (
                        tsm.visits.map((visit) => (
                          <ShopRow
                            key={visit.orderId || `${tsm.tsmId}-${visit.customerId}`}
                            row={{
                              customerId: visit.customerId,
                              shopName: visit.shopName,
                              shopOwner: visit.shopOwner,
                              date: visit.date,
                              status: 'visit',
                              visit: true,
                              saleOrderNumber: visit.saleOrderNumber,
                              orderId: visit.orderId,
                            }}
                          />
                        ))
                      ) : (
                        <Text style={styles.inlineEmpty}>No data</Text>
                      )
                    ) : null}
                  </View>
                );
              })
            ) : (
              <Text style={styles.inlineEmpty}>No data</Text>
            )}
          </>
        ) : null}

        {distributor.bookers.length || statusFilter !== 'visit' ? (
          <Text style={styles.groupLabel}>Order bookers</Text>
        ) : null}
        {distributor.bookers.length ? (
          distributor.bookers.map((booker) => (
            <BookerCard
              key={booker.orderBookerId}
              booker={booker}
              nested
              expanded={bookerExpanded === booker.orderBookerId}
              onToggle={() => onToggleBooker(booker.orderBookerId)}
            />
          ))
        ) : showTsmVisits && statusFilter === 'visit' ? null : (
          <Text style={styles.inlineEmpty}>No data</Text>
        )}
      </View>
    ) : null}
  </View>
  );
};

const EmptyState = ({ title, detail }: { title: string; detail: string }) => (
  <View style={styles.emptyCard}>
    <View style={styles.emptyIcon}>
      <Feather name="clipboard" size={22} color={theme.colors.muted} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{detail}</Text>
  </View>
);

const ReportScreen = () => {
  const popup = useAppPopup();
  const { loginRole, loginVendor, loginServer, distributorId, orderBookerId } = useLoginUser();
  const role = loginRole || loginVendor?.loginRole;
  const isTsm = isTsmRole(role);
  const isZsm = isZsmRole(role);
  const distId = distributorId || resolveDistributorId(loginVendor);
  const zsmUserId = orderBookerId || loginVendor?._id || '';

  const [date, setDate] = useState(deviceBusinessDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [report, setReport] = useState<TsmDailyReport>(() => emptyTsmDailyReport(deviceBusinessDate()));
  const [zsmReport, setZsmReport] = useState<ZsmDailyReport>(() => emptyZsmDailyReport(deviceBusinessDate()));
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState('');
  const [tsmExpanded, setTsmExpanded] = useState('');
  const [bookerExpanded, setBookerExpanded] = useState('');
  const [filter, setFilter] = useState<'all' | TsmActivityStatus>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searching = debouncedQuery.trim().length > 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const loadReport = useCallback(async (targetDate: string, soft = false) => {
    if (!isTsm && !isZsm) return;
    if (loginServer && loginServer !== 'snd') {
      if (isZsm) setZsmReport(emptyZsmDailyReport(targetDate, zsmUserId));
      else setReport(emptyTsmDailyReport(targetDate, distId));
      return;
    }
    if (!soft) setLoading(true);
    try {
      if (isZsm) {
        if (!zsmUserId) {
          setZsmReport(emptyZsmDailyReport(targetDate));
          return;
        }
        const next = await fetchZsmDailyReport(zsmUserId, targetDate);
        setZsmReport(next);
        setExpandedId((current) => current || next.distributors[0]?.distributorId || '');
      } else {
        if (!distId) {
          setReport(emptyTsmDailyReport(targetDate));
          return;
        }
        const next = await fetchTsmDailyReport(distId, targetDate);
        setReport(next);
        setExpandedId((current) => current || next.bookers[0]?.orderBookerId || '');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load report.';
      popup.error('Report', message);
      if (isZsm) setZsmReport(emptyZsmDailyReport(targetDate, zsmUserId));
      else setReport(emptyTsmDailyReport(targetDate, distId));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [distId, isTsm, isZsm, loginServer, popup, zsmUserId]);

  useFocusEffect(
    useCallback(() => {
      void loadReport(date);
    }, [date, loadReport]),
  );

  const onChangeDate = (next: string) => {
    setDate(next);
    setCalendarOpen(false);
  };

  const visibleBookers = useMemo(
    () => filterBookers(report.bookers, debouncedQuery.trim().toLowerCase(), filter, false),
    [debouncedQuery, filter, report.bookers],
  );

  const visibleDistributors = useMemo(
    () => filterZsmDistributors(zsmReport.distributors, debouncedQuery, filter),
    [debouncedQuery, filter, zsmReport.distributors],
  );

  if (!isTsm && !isZsm) {
    return (
      <View style={styles.container}>
        <EmptyState title="Report locked" detail="Sign in as TSM or ZSM to view daily coverage." />
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.kicker}>{isZsm ? 'ZSM REPORT' : 'TSM REPORT'}</Text>
      <Text style={styles.title}>{isZsm ? 'Distributor coverage' : 'Booker coverage'}</Text>
      <Text style={styles.subtitle}>
        {isZsm
          ? 'See TSM visits, your ZSM coverage, and every order-booker shop for the day.'
          : 'Track each shop — order, visit, or still pending.'}
      </Text>

      <DateBar
        date={date}
        calendarOpen={calendarOpen}
        onChangeDate={onChangeDate}
        onToggleCalendar={() => setCalendarOpen((open) => !open)}
      />

      <View style={styles.statsRow}>
        {isZsm ? (
          <>
            <StatCell
              label="All"
              value={zsmReport.summary.distributors}
              tone="neutral"
              active={filter === 'all'}
              onPress={() => setFilter('all')}
            />
            <StatCell
              label="Visit"
              value={zsmReport.summary.tsmVisits}
              tone="visit"
              active={filter === 'visit'}
              onPress={() => setFilter('visit')}
            />
            <StatCell
              label="Order"
              value={zsmReport.summary.order}
              tone="order"
              active={filter === 'order'}
              onPress={() => setFilter('order')}
            />
            <StatCell
              label="Nothing"
              value={zsmReport.summary.nothing}
              tone="nothing"
              active={filter === 'nothing'}
              onPress={() => setFilter('nothing')}
            />
          </>
        ) : (
          <>
            <StatCell
              label="All"
              value={report.summary.bookers}
              tone="neutral"
              active={filter === 'all'}
              onPress={() => setFilter('all')}
            />
            <StatCell
              label="Order"
              value={report.summary.order}
              tone="order"
              active={filter === 'order'}
              onPress={() => setFilter('order')}
            />
            <StatCell
              label="Visit"
              value={report.summary.visit}
              tone="visit"
              active={filter === 'visit'}
              onPress={() => setFilter('visit')}
            />
            <StatCell
              label="Nothing"
              value={report.summary.nothing}
              tone="nothing"
              active={filter === 'nothing'}
              onPress={() => setFilter('nothing')}
            />
          </>
        )}
      </View>

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={
          isZsm
            ? 'Search distributor, TSM, booker, or shop'
            : 'Search order booker or shop'
        }
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {header}
      <FilterRow filter={filter} onChange={setFilter} />

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading report…</Text>
        </View>
      ) : isZsm ? (
        <FlatList
          data={visibleDistributors}
          keyExtractor={(item) => item.distributorId}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadReport(date, true);
              }}
              tintColor={theme.colors.primary}
            />
          )}
          ListEmptyComponent={(
            <EmptyState
              title="No data"
              detail={
                searching
                  ? 'Try another name for distributor, TSM, booker, or shop.'
                  : !zsmUserId
                    ? 'Session expired. Log in again.'
                    : loginServer && loginServer !== 'snd'
                      ? 'ZSM report needs SND login.'
                      : filter === 'all'
                        ? 'No distributors found for this ZSM.'
                        : `No ${filter} data for this date.`
              }
            />
          )}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews
          renderItem={({ item }) => (
            <ZsmDistributorCard
              distributor={item}
              expanded={expandedId === item.distributorId}
              tsmExpanded={tsmExpanded}
              bookerExpanded={bookerExpanded}
              statusFilter={filter}
              onToggle={() =>
                setExpandedId((current) => (current === item.distributorId ? '' : item.distributorId))
              }
              onToggleTsm={(id) => setTsmExpanded((current) => (current === id ? '' : id))}
              onToggleBooker={(id) => setBookerExpanded((current) => (current === id ? '' : id))}
            />
          )}
        />
      ) : (
        <FlatList
          data={visibleBookers}
          keyExtractor={(item) => item.orderBookerId}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadReport(date, true);
              }}
              tintColor={theme.colors.primary}
            />
          )}
          ListEmptyComponent={(
            <EmptyState
              title="No data"
              detail={
                searching
                  ? 'Try another order booker or shop name.'
                  : !distId
                    ? 'No distributor on this TSM account.'
                    : loginServer && loginServer !== 'snd'
                      ? 'TSM report needs SND login.'
                      : filter === 'all'
                        ? 'No order bookers for this distributor.'
                        : `No ${filter} data for this date.`
              }
            />
          )}
          renderItem={({ item }) => (
            <BookerCard
              booker={item}
              expanded={expandedId === item.orderBookerId}
              onToggle={() =>
                setExpandedId((current) => (current === item.orderBookerId ? '' : item.orderBookerId))
              }
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    padding: 16,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  title: {
    marginTop: 4,
    color: theme.colors.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  dateBlock: {
    marginTop: 14,
    gap: 8,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    padding: 6,
  },
  dateCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  dateCenterText: {
    flex: 1,
  },
  dateMain: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  dateHint: {
    marginTop: 1,
    color: theme.colors.muted,
    fontSize: 11,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  todayBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primarySoft,
  },
  todayBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.ink,
    fontSize: 14,
    paddingVertical: 10,
  },
  statCell: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statCellActive: {
    borderColor: theme.colors.ink,
  },
  miniStats: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingVertical: 8,
    backgroundColor: theme.colors.card,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  filterText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: theme.colors.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 10,
  },
  listCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
    marginBottom: 2,
  },
  nestedCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
    marginBottom: 8,
  },
  rowHeader: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowHeaderCompact: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPrimary: {
    backgroundColor: theme.colors.primarySoft,
  },
  avatarInfo: {
    backgroundColor: theme.colors.infoSoft,
  },
  avatarInk: {
    backgroundColor: '#EEF2F7',
  },
  rowTitleWrap: {
    flex: 1,
  },
  rowTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  nestedTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  rowMeta: {
    marginTop: 2,
    color: theme.colors.muted,
    fontSize: 12,
  },
  countBadge: {
    minWidth: 28,
    textAlign: 'center',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.primarySoft,
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  expandedBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingTop: 12,
  },
  groupLabel: {
    marginBottom: 8,
    marginTop: 4,
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  shopRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.line,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  shopTextWrap: {
    flex: 1,
  },
  shopName: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  shopMeta: {
    marginTop: 2,
    color: theme.colors.muted,
    fontSize: 11,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  inlineEmpty: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: theme.colors.muted,
    fontSize: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  emptyCard: {
    ...ui.card,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  calendarPanel: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: theme.colors.background,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  calendarMonth: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    width: '14.2857%',
    textAlign: 'center',
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dayText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  dayToday: {
    backgroundColor: theme.colors.primarySoft,
  },
  dayTodayText: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  daySelected: {
    backgroundColor: theme.colors.primary,
  },
  daySelectedText: {
    color: '#fff',
    fontWeight: '800',
  },
});

export default ReportScreen;
