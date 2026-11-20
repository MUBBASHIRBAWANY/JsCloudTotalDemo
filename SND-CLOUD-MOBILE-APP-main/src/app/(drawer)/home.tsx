import { getDataFundtion as getSndData } from '@/api/SNDCurdFunctions';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useAppPopup } from '@/components/ui/AppPopup';
import { theme, ui } from '@/constants/app-theme';
import { asList, partyNameKeys, textOf, useLoginUser, type Row } from '@/hooks/useLoginUser';
import { isPendingCustomer } from '@/lib/customerForm';
import { isOnline } from '@/lib/connectivity';
import { fetchDistributor } from '@/redux/Reducer/shopsReducer';
import { store } from '@/redux/Store/store';
import type { RootState } from '@/redux/Store/types';

type ListTab = 'distributors' | 'products';

const balanceValue = (row: Row) => {
  const value = row.sumAging;
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatBalance = (row: Row) => {
  const value = balanceValue(row);
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const distributorMeta = (row: Row) => {
  const code = textOf(row, ['DistrbutorSystemCode', 'code'], '');
  const balance = formatBalance(row);
  const phone = textOf(row, ['ContactPerson1', 'MobileNo', 'phone'], '');
  return [code, `Balance ${balance}`, phone].filter(Boolean).join('  ·  ');
};

const Home = () => {
  const popup = useAppPopup();
  const { dispatch, loginVendor, loginServer, orderBookerId } = useLoginUser();
  const snd = loginServer === 'snd' || loginVendor?.loginServer === 'snd';
  const partyLabel = 'Customers';
  const partyName = (row: Row) => textOf(row, partyNameKeys(loginVendor?.loginServer));
  const distributors = useSelector((state: RootState) => state.distributors.Distributor) as Row[];
  const products = useSelector((state: RootState) => state.Product.Product) as Row[];
  const pendingOrders = useSelector((state: RootState) => state.SalesOrder.SalesOrder) as Row[];
  const savedClientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const order of pendingOrders) {
      if (order.kind !== 'distributor') continue;
      const id = String(order.Distrbutor || order.Distributor || order.Customer || '');
      if (id) ids.add(id);
    }
    return ids;
  }, [pendingOrders]);
  const [listTab, setListTab] = useState<ListTab>('distributors');
  const [query, setQuery] = useState('');
  const [hideZeroBalance, setHideZeroBalance] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!snd || !orderBookerId) return undefined;
      let active = true;
      const loadCustomers = async () => {
        if (!(await isOnline())) return;
        setLoadingCustomers(true);
        try {
          const rows = asList(
            await getSndData(`/Customor/getAllCutomerByBooker/${orderBookerId}`, undefined, true),
          );
          if (!active) return;
          const current = (store.getState().distributors.Distributor as Row[]) || [];
          const pending = current.filter((row) => isPendingCustomer(row));
          const serverIds = new Set(rows.map((row) => String(row._id || '')));
          dispatch(fetchDistributor([
            ...pending.filter((row) => !serverIds.has(String(row._id || ''))),
            ...rows,
          ]));
        } catch {
          // Keep phone-stored customers if refresh fails.
        } finally {
          if (active) setLoadingCustomers(false);
        }
      };
      void loadCustomers();
      return () => {
        active = false;
      };
    }, [dispatch, orderBookerId, snd]),
  );

  const filteredDistributors = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return distributors.filter((row) => {
      if (hideZeroBalance && balanceValue(row) === 0 && !isPendingCustomer(row)) return false;
      if (!needle) return true;
      return textOf(row, ['CustomerName', 'CustomorName', 'customerName', 'DistrbutorName', 'OwnerName', 'DistrbutorSystemCode', 'ContactPerson1', 'Address1', 'code'], '').toLowerCase().includes(needle);
    });
  }, [distributors, hideZeroBalance, query]);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      textOf(product, ['ProductName', 'code', 'mastercode'], '').toLowerCase().includes(needle),
    );
  }, [products, query]);

  const totalCredits = useMemo(
    () => filteredDistributors.reduce((sum, row) => sum + balanceValue(row), 0),
    [filteredDistributors],
  );

  const creditsLabel = totalCredits.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  return (
    <FlatList
      style={styles.container}
      data={listTab === 'distributors' ? filteredDistributors : filteredProducts}
      keyExtractor={(item, index) => String(item._id || item.id || index)}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View>
          <Text style={ui.lead}>
            {snd
              ? 'Tap a customer to add an order. If that client already has one on this phone, it opens for update. A customer waiting to send cannot take an order until you send them.'
              : 'Tap a distributor to add an order. If that client already has one on this phone, it opens for update. One waiting to send cannot take an order until you send them.'}
          </Text>
          {loadingCustomers ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading customers…</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.addCustomer} onPress={() => router.push('/add-customer')}>
            <Feather name="user-plus" size={16} color="#fff" />
            <Text style={styles.addCustomerText}>Add customer</Text>
          </TouchableOpacity>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{filteredDistributors.length}</Text>
              <Text style={styles.statLabel}>{partyLabel}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardWide]}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                {creditsLabel}
              </Text>
              <Text style={styles.statLabel}>Total Credits</Text>
            </View>
          </View>
          <TextInput
            style={styles.search}
            placeholder={listTab === 'distributors' ? `Search ${partyLabel.toLowerCase()}` : 'Search products'}
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
          />
          {listTab === 'distributors' ? (
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setHideZeroBalance((checked) => !checked)}
            >
              <View style={[styles.checkbox, hideZeroBalance && styles.checkboxChecked]}>
                {hideZeroBalance ? <Feather name="check" size={14} color="#fff" /> : null}
              </View>
              <Text style={styles.checkLabel}>Not equal zero</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.subTabContainer}>
            <TouchableOpacity
              style={[styles.subTab, listTab === 'distributors' && styles.subTabActive]}
              onPress={() => setListTab('distributors')}
            >
              <Text style={[styles.subTabText, listTab === 'distributors' && styles.subTabTextActive]}>{partyLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTab, listTab === 'products' && styles.subTabActive]}
              onPress={() => setListTab('products')}
            >
              <Text style={[styles.subTabText, listTab === 'products' && styles.subTabTextActive]}>Products</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          {listTab === 'distributors'
            ? distributors.length === 0
              ? `No ${partyLabel.toLowerCase()} saved. Sign in again.`
              : `No ${partyLabel.toLowerCase()} to show.`
            : 'No products saved. Sign in again.'}
        </Text>
      }
      renderItem={({ item }) => {
        const title = listTab === 'distributors' ? partyName(item) : textOf(item, ['ProductName']);
        const stockQty = Number(item.TotalQuantity);
        const productMetaParts = [
          `Code ${textOf(item, ['code'], '')}`,
          `TP ${textOf(item, ['TPSale'], '0')}`,
        ];
        if (snd && Number.isFinite(stockQty)) {
          productMetaParts.push(`Stock ${stockQty.toLocaleString()}`);
        }
        const meta = listTab === 'distributors'
          ? distributorMeta(item)
          : productMetaParts.join('  ·  ');
        if (listTab !== 'distributors') {
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardMeta}>{meta}</Text>
            </View>
          );
        }
        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => {
              if (!item._id) return;
              if (isPendingCustomer(item)) {
                popup.info(
                  'Send customer first',
                  'This customer is still on this phone. Send them from Sync Data. You can take their order after that send.',
                );
                return;
              }
              router.push({
                pathname: '/distributor-sale-order',
                params: { id: String(item._id), orderId: '' },
              });
            }}
          >
            <View style={styles.cardTop}>
              <Text style={[styles.cardTitle, styles.cardTitleFlex]}>{title}</Text>
              <Feather name="chevron-right" size={18} color={theme.colors.muted} />
            </View>
            <Text style={styles.cardMeta}>{meta}</Text>
            {isPendingCustomer(item) ? <Text style={styles.waitingBadge}>Waiting to send</Text> : null}
            {item._id && savedClientIds.has(String(item._id)) ? (
              <Text style={styles.savedBadge}>Saved order</Text>
            ) : null}
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: ui.screen,
  listContent: ui.listContent,
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  loadingText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: ui.empty,
  card: ui.card,
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: ui.cardTitle,
  cardTitleFlex: {
    flex: 1,
  },
  cardMeta: ui.cardMeta,
  waitingBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    color: theme.colors.warning,
    backgroundColor: theme.colors.warningSoft,
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  savedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  addCustomer: {
    ...ui.primaryButton,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  addCustomerText: ui.primaryButtonText,
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statCardWide: {
    flex: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  statLabel: {
    marginTop: 4,
    color: theme.colors.muted,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  search: ui.search,
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  subTabContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  subTabActive: {
    backgroundColor: theme.colors.primary,
  },
  subTabText: {
    color: theme.colors.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  subTabTextActive: {
    color: '#fff',
  },
});

export default Home;
