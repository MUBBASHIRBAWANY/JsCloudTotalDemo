import { getDataFundtion as getSndData } from '@/api/SNDCurdFunctions';
import { useAppPopup } from '@/components/ui/AppPopup';
import { theme, ui } from '@/constants/app-theme';
import { asList, resolveDistributorId, textOf, useLoginUser, type Row } from '@/hooks/useLoginUser';
import { isOnline } from '@/lib/connectivity';
import { fetchDistributor } from '@/redux/Reducer/shopsReducer';
import type { RootState } from '@/redux/Store/types';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

type BookerRow = Row & { _id?: string };

const bookerName = (row: Row) =>
  textOf(row, ['OrderBookerName', 'firstname', 'LoginId', 'OrderBookerID'], 'Order booker');

const customerName = (row: Row) =>
  textOf(row, ['CustomorName', 'CustomerName', 'customerName', 'DistrbutorName'], 'Customer');

const TsmHome = () => {
  const popup = useAppPopup();
  const dispatch = useDispatch();
  const { loginVendor, loginServer, distributorId } = useLoginUser();
  const pendingOrders = useSelector((state: RootState) => state.SalesOrder.SalesOrder) as Row[];
  const partyRows = useSelector((state: RootState) => state.distributors.Distributor) as Row[];
  const [bookers, setBookers] = useState<BookerRow[]>([]);
  const [customersByBooker, setCustomersByBooker] = useState<Record<string, Row[]>>({});
  const [expandedId, setExpandedId] = useState('');
  const [loadingBookers, setLoadingBookers] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState('');
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState('');

  // Prefer session distributor; fall back to first login party that looks like a distributor company.
  const partyDistributorId = useMemo(() => {
    const company = partyRows.find((row) =>
      Boolean(textOf(row, ['DistrbutorName', 'DistrbutorSystemCode'], '')),
    );
    return String(company?._id || '');
  }, [partyRows]);

  const distId = String(
    distributorId
      || resolveDistributorId(loginVendor)
      || partyDistributorId
      || '',
  );

  const distributorName = useMemo(() => {
    const rows = Array.isArray(partyRows) ? partyRows : [];
    const match =
      rows.find((row) => row && String(row._id || '') === distId)
      || rows.find((row) =>
        Boolean(row && textOf(row, ['DistrbutorName', 'DistrbutorSystemCode'], '')),
      );
    if (!match) return '';
    const name = textOf(match, ['DistrbutorName', 'DistributorName', 'OwnerName'], '');
    const code = textOf(match, ['DistrbutorSystemCode', 'code'], '');
    if (name && code) return `${name} (${code})`;
    return name || code || '';
  }, [distId, partyRows]);

  const savedClientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const order of pendingOrders) {
      if (order.kind !== 'distributor') continue;
      const id = String(order.Distrbutor || order.Distributor || order.Customer || '');
      if (id) ids.add(id);
    }
    return ids;
  }, [pendingOrders]);

  const loadBookers = useCallback(async () => {
    setLoadError('');
    if (loginServer && loginServer !== 'snd') {
      setLoadError('TSM order-booker list is for SND accounts.');
      return;
    }
    if (!distId) {
      setLoadError('No distributor id on this TSM account. Log out and log in again as SND TSM.');
      return;
    }
    // Don't block on probe alone (web CORS can fake "offline"). Try API; handle real failures below.
    const online = await isOnline();
    setLoadingBookers(true);
    try {
      const payload = await getSndData(`/OrderBooker/OrderByvendor/${distId}`, undefined, true);
      const rows = asList(payload);
      setBookers(rows);
      if (!rows.length) {
        setLoadError(
          `No order bookers found for ${distributorName || 'this distributor'}.`,
        );
      }
    } catch (error) {
      const responseData = (error as { response?: { data?: unknown } })?.response?.data;
      const message =
        typeof responseData === 'string' && responseData.trim()
          ? responseData.trim()
          : (responseData as { message?: string })?.message
            || (error instanceof Error ? error.message : 'Could not load order bookers.');
      setLoadError(message);
      if (!online) {
        popup.info('Offline', 'Connect to the internet to load order bookers.');
      } else {
        popup.error('TSM Home', message);
      }
    } finally {
      setLoadingBookers(false);
    }
  }, [distId, distributorName, loginServer, popup]);

  useFocusEffect(
    useCallback(() => {
      void loadBookers();
    }, [loadBookers]),
  );

  const loadCustomers = async (bookerId: string) => {
    if (!bookerId) return;
    if (customersByBooker[bookerId]?.length) {
      setExpandedId((prev) => (prev === bookerId ? '' : bookerId));
      return;
    }
    setExpandedId(bookerId);
    setLoadingCustomers(bookerId);
    try {
      const rows = asList(
        await getSndData(`/Customor/getAllCutomerByBooker/${bookerId}`, undefined, true),
      );
      setCustomersByBooker((prev) => ({ ...prev, [bookerId]: rows }));
      // Keep sale-order screen able to resolve the selected customer from Redux.
      dispatch(fetchDistributor(rows));
    } catch {
      const online = await isOnline();
      popup.error(
        'Customers',
        online
          ? 'Could not load customers for this order booker.'
          : 'Connect to the internet to load customers.',
      );
      setExpandedId('');
    } finally {
      setLoadingCustomers('');
    }
  };

  const filteredBookers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return bookers;
    return bookers.filter((row) => {
      if (bookerName(row).toLowerCase().includes(needle)) return true;
      const kids = customersByBooker[String(row._id || '')] || [];
      return kids.some((c) => customerName(c).toLowerCase().includes(needle));
    });
  }, [bookers, customersByBooker, query]);

  const openVisit = (bookerId: string, customer: Row) => {
    const customerId = String(customer._id || '');
    if (!customerId) return;
    const current = customersByBooker[bookerId] || [];
    // Ensure this customer (and siblings) are in Redux before opening the visit screen.
    dispatch(fetchDistributor(current.length ? current : [customer]));
    router.push({
      pathname: '/distributor-sale-order',
      params: {
        id: customerId,
        orderId: '',
        bookerId,
        visitKind: 'shop',
        returnTo: 'tsm-home',
      },
    });
  };

  if (loginServer === 'cloud') {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>
          TSM is locked to the SND backend. Log out and sign in again as SND TSM.
        </Text>
      </View>
    );
  }

  if (!loginServer) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.loadingText}>Preparing TSM dashboard…</Text>
      </View>
    );
  }

  if (!distId) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>
          No distributor assigned to this TSM account. Log out and sign in again as SND TSM.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => void loadBookers()}>
          <Text style={styles.refreshText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredBookers}
        keyExtractor={(item, index) => String(item._id || index)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.lead}>
              Your distributor’s order bookers. Open one, then tap a shop to start a visit.
            </Text>
            <View style={styles.distCard}>
              <View style={styles.distIcon}>
                <Feather name="briefcase" size={16} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.distLabel}>Distributor</Text>
                <Text style={styles.distName} numberOfLines={2}>
                  {distributorName || 'Name not saved — refresh after login'}
                </Text>
              </View>
            </View>
            <View style={styles.searchRow}>
              <Feather name="search" size={16} color={theme.colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search order booker or customer"
                placeholderTextColor={theme.colors.muted}
                value={query}
                onChangeText={setQuery}
              />
            </View>
            {loadingBookers ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading order bookers…</Text>
              </View>
            ) : (
              <View style={styles.countRow}>
                <Text style={styles.countText}>
                  {filteredBookers.length} order booker{filteredBookers.length === 1 ? '' : 's'}
                </Text>
                <TouchableOpacity onPress={() => void loadBookers()} style={styles.refreshBtn}>
                  <Feather name="refresh-cw" size={14} color={theme.colors.primary} />
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
            {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loadingBookers
            ? undefined
            : (
              <Text style={styles.emptyText}>
                {loadError || 'No order bookers found for this distributor.'}
              </Text>
            )
        }
        renderItem={({ item }) => {
          const id = String(item._id || '');
          const open = expandedId === id;
          const customers = customersByBooker[id] || [];
          return (
            <View style={styles.bookerCard}>
              <TouchableOpacity
                style={styles.bookerHeader}
                activeOpacity={0.75}
                onPress={() => void loadCustomers(id)}
              >
                <View style={styles.bookerIcon}>
                  <Feather name="user" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.bookerCopy}>
                  <Text style={styles.bookerTitle}>{bookerName(item)}</Text>
                  <Text style={styles.bookerMeta}>
                    {textOf(item, ['LoginId', 'code', 'masterCode'], 'Tap to load customers')}
                  </Text>
                </View>
                {loadingCustomers === id ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <Feather
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.colors.muted}
                  />
                )}
              </TouchableOpacity>

              {open ? (
                <View style={styles.customerBlock}>
                  {loadingCustomers === id ? (
                    <Text style={styles.loadingText}>Loading customers…</Text>
                  ) : customers.length === 0 ? (
                    <Text style={styles.emptyNested}>No customers under this order booker.</Text>
                  ) : (
                    customers.map((customer) => {
                      const cid = String(customer._id || '');
                      return (
                        <View key={cid || customerName(customer)} style={styles.customerRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.customerTitle}>{customerName(customer)}</Text>
                            <Text style={styles.customerMeta}>
                              {[
                                textOf(customer, ['code', 'CustomorCode'], ''),
                                `Balance ${Number(customer.sumAging || 0).toLocaleString()}`,
                              ]
                                .filter(Boolean)
                                .join('  ·  ')}
                            </Text>
                            {cid && savedClientIds.has(cid) ? (
                              <Text style={styles.savedBadge}>Saved visit</Text>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            style={styles.visitChip}
                            activeOpacity={0.75}
                            onPress={() => openVisit(id, customer)}
                            accessibilityRole="button"
                            accessibilityLabel="Visit shop"
                          >
                            <Feather name="navigation" size={12} color={theme.colors.primary} />
                            <Text style={styles.visitChipText}>Visit</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: ui.screen,
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  listContent: ui.listContent,
  lead: ui.lead,
  retryBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    marginLeft: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: theme.colors.ink,
    fontSize: 15,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  loadingText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  countText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  distCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.card,
  },
  distIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  distName: {
    marginTop: 2,
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: ui.empty,
  emptyNested: {
    color: theme.colors.muted,
    fontSize: 13,
    paddingVertical: 8,
  },
  bookerCard: {
    ...ui.card,
    padding: 0,
    overflow: 'hidden',
  },
  bookerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  bookerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookerCopy: {
    flex: 1,
  },
  bookerTitle: ui.cardTitle,
  bookerMeta: ui.cardMeta,
  customerBlock: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: theme.colors.background,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.line,
  },
  customerTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  customerMeta: {
    marginTop: 2,
    color: theme.colors.muted,
    fontSize: 12,
  },
  savedBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    color: theme.colors.success,
    backgroundColor: theme.colors.successSoft,
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  visitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  visitChipText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});

export default TsmHome;
