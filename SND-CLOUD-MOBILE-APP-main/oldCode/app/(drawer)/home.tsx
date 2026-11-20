import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../Redux/Store/types';
import { theme, ui } from '../../src/theme';
import { textOf, type Row } from '../../src/useLoginUser';

type ListTab = 'distributors' | 'products';

const balanceValue = (row: Row) => {
  const value = row.sumAging;
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const distributorTitle = (row: Row) => textOf(row, ['DistrbutorName', 'OwnerName', 'code']);
const distributorMeta = (row: Row) => {
  const code = textOf(row, ['DistrbutorSystemCode', 'code'], '');
  const balance = textOf(row, ['sumAging'], '0');
  const phone = textOf(row, ['ContactPerson1', 'MobileNo'], '');
  return [code, `Balance ${balance}`, phone].filter(Boolean).join('  ·  ');
};

const Home = () => {
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

  const filteredDistributors = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return distributors.filter((row) => {
      if (hideZeroBalance && balanceValue(row) === 0) return false;
      if (!needle) return true;
      return textOf(row, ['DistrbutorName', 'OwnerName', 'DistrbutorSystemCode', 'ContactPerson1', 'Address1', 'code'], '').toLowerCase().includes(needle);
    });
  }, [distributors, hideZeroBalance, query]);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      textOf(product, ['ProductName', 'code', 'mastercode'], '').toLowerCase().includes(needle),
    );
  }, [products, query]);

  return (
    <FlatList
      style={styles.container}
      data={listTab === 'distributors' ? filteredDistributors : filteredProducts}
      keyExtractor={(item, index) => String(item._id || item.id || index)}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View>
          <Text style={ui.lead}>Tap a distributor to add an order. If that client already has one on this phone, it opens for update.</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{filteredDistributors.length}</Text>
              <Text style={styles.statLabel}>Distributors</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{products.length}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
          </View>
          <TextInput
            style={styles.search}
            placeholder={listTab === 'distributors' ? 'Search distributors' : 'Search products'}
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
              <Text style={[styles.subTabText, listTab === 'distributors' && styles.subTabTextActive]}>Distributors</Text>
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
              ? 'No distributors saved. Sign in again.'
              : 'No distributors to show.'
            : 'No products saved. Sign in again.'}
        </Text>
      }
      renderItem={({ item }) => {
        const title = listTab === 'distributors' ? distributorTitle(item) : textOf(item, ['ProductName']);
        const meta = listTab === 'distributors'
          ? distributorMeta(item)
          : `Code ${textOf(item, ['code'], '')}  ·  TP ${textOf(item, ['TPSale'], '0')}`;
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
    alignItems: 'center',
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
