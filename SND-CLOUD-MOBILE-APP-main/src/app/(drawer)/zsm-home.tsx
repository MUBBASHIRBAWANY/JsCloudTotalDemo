import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDispatch } from 'react-redux';

import { useAppPopup } from '@/components/ui/AppPopup';
import { theme, ui } from '@/constants/app-theme';
import { isZsmRole, useLoginUser, type Row } from '@/hooks/useLoginUser';
import {
  emptyZsmHierarchy,
  fetchZsmHierarchy,
  type ZsmBooker,
  type ZsmDistributorNode,
  type ZsmHierarchy,
  type ZsmShop,
  type ZsmTsmNode,
} from '@/lib/zsmHierarchy';
import { fetchDistributor } from '@/redux/Reducer/shopsReducer';

type ExpandKey = string;

const ShopLine = ({
  name,
  meta,
  onVisit,
}: {
  name: string;
  meta: string;
  onVisit: () => void;
}) => (
  <Pressable onPress={onVisit} style={styles.shopLine}>
    <Feather name="map-pin" size={13} color={theme.colors.muted} />
    <View style={styles.flex}>
      <Text style={styles.shopName} numberOfLines={1}>{name}</Text>
      {meta ? <Text style={styles.shopMeta} numberOfLines={1}>{meta}</Text> : null}
    </View>
    <View style={styles.visitChip}>
      <Feather name="navigation" size={12} color={theme.colors.primary} />
      <Text style={styles.visitChipText}>Visit</Text>
    </View>
  </Pressable>
);

const BookerBlock = ({
  booker,
  expanded,
  onToggle,
  onVisitShop,
}: {
  booker: ZsmBooker;
  expanded: boolean;
  onToggle: () => void;
  onVisitShop: (shop: ZsmShop) => void;
}) => (
  <View style={styles.bookerBlock}>
    <Pressable onPress={onToggle} style={styles.rowHeader}>
      <Feather name="user" size={14} color={theme.colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.bookerName} numberOfLines={1}>{booker.orderBookerName}</Text>
        <Text style={styles.rowMeta}>{booker.shopCount} shops · tap a shop to visit</Text>
      </View>
      <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.muted} />
    </Pressable>
    {expanded ? (
      booker.shops.length ? (
        booker.shops.map((shop) => (
          <ShopLine
            key={shop.shopId}
            name={shop.shopName}
            meta={[shop.ownerName, shop.city].filter(Boolean).join(' · ')}
            onVisit={() => onVisitShop(shop)}
          />
        ))
      ) : (
        <Text style={styles.emptyNested}>No shops under this order booker.</Text>
      )
    ) : null}
  </View>
);

const TsmBlock = ({
  tsm,
  expanded,
  bookerExpanded,
  onToggle,
  onToggleBooker,
  onVisitShop,
}: {
  tsm: ZsmTsmNode;
  expanded: boolean;
  bookerExpanded: ExpandKey;
  onToggle: () => void;
  onToggleBooker: (id: string) => void;
  onVisitShop: (bookerId: string, shop: ZsmShop) => void;
}) => (
  <View style={styles.tsmBlock}>
    <Pressable onPress={onToggle} style={styles.rowHeader}>
      <Feather name="shield" size={14} color={theme.colors.info} />
      <View style={styles.flex}>
        <Text style={styles.tsmName} numberOfLines={1}>{tsm.tsmName}</Text>
        <Text style={styles.rowMeta}>{tsm.orderBookerCount} order bookers</Text>
      </View>
      <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.muted} />
    </Pressable>
    {expanded ? (
      tsm.orderBookers.length ? (
        tsm.orderBookers.map((booker) => (
          <BookerBlock
            key={booker.orderBookerId}
            booker={booker}
            expanded={bookerExpanded === booker.orderBookerId}
            onToggle={() => onToggleBooker(booker.orderBookerId)}
            onVisitShop={(shop) => onVisitShop(booker.orderBookerId, shop)}
          />
        ))
      ) : (
        <Text style={styles.emptyNested}>No order bookers under this TSM distributor.</Text>
      )
    ) : null}
  </View>
);

const DistributorCard = ({
  distributor,
  expanded,
  tsmExpanded,
  bookerExpanded,
  onToggle,
  onToggleTsm,
  onToggleBooker,
  onVisitDistributor,
  onVisitShop,
}: {
  distributor: ZsmDistributorNode;
  expanded: boolean;
  tsmExpanded: ExpandKey;
  bookerExpanded: ExpandKey;
  onToggle: () => void;
  onToggleTsm: (id: string) => void;
  onToggleBooker: (id: string) => void;
  onVisitDistributor: () => void;
  onVisitShop: (bookerId: string, shop: ZsmShop) => void;
}) => (
  <View style={styles.distCard}>
    <View style={styles.distHeader}>
      <Pressable onPress={onToggle} style={styles.distHeaderMain}>
        <View style={styles.distIcon}>
          <Feather name="briefcase" size={16} color={theme.colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.distName} numberOfLines={1}>{distributor.distributorName}</Text>
          <Text style={styles.rowMeta}>
            {distributor.missing
              ? 'Vendor id not found in distributors — check Vendor on ZSM user'
              : `${distributor.tsmCount} TSM · ${distributor.orderBookerCount} bookers · ${distributor.shopCount} shops`}
          </Text>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
      </Pressable>
      {!distributor.missing ? (
        <Pressable onPress={onVisitDistributor} style={styles.distVisitBtn} hitSlop={6}>
          <Feather name="navigation" size={14} color="#fff" />
          <Text style={styles.distVisitText}>Visit</Text>
        </Pressable>
      ) : null}
    </View>
    {expanded ? (
      distributor.tsms.length ? (
        distributor.tsms.map((tsm) => (
          <TsmBlock
            key={tsm.tsmId}
            tsm={tsm}
            expanded={tsmExpanded === tsm.tsmId}
            bookerExpanded={bookerExpanded}
            onToggle={() => onToggleTsm(tsm.tsmId)}
            onToggleBooker={onToggleBooker}
            onVisitShop={onVisitShop}
          />
        ))
      ) : (
        <Text style={styles.emptyNested}>No TSM assigned to this distributor (needs exactly 1 vendor).</Text>
      )
    ) : null}
  </View>
);

const ZsmHome = () => {
  const popup = useAppPopup();
  const dispatch = useDispatch();
  const { loginVendor, loginRole, loginServer, orderBookerId } = useLoginUser();
  const role = loginRole || loginVendor?.loginRole;
  const isZsm = isZsmRole(role);
  const userId = orderBookerId || loginVendor?._id || '';

  const [tree, setTree] = useState<ZsmHierarchy>(() => emptyZsmHierarchy());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [distExpanded, setDistExpanded] = useState('');
  const [tsmExpanded, setTsmExpanded] = useState('');
  const [bookerExpanded, setBookerExpanded] = useState('');

  const openDistributorVisit = useCallback((distributor: ZsmDistributorNode) => {
    const id = String(distributor.distributorId || '').trim();
    if (!id || distributor.missing) {
      popup.info('Visit', 'This distributor id is missing. Fix Vendor on the ZSM user first.');
      return;
    }
    const party: Row = {
      _id: id,
      DistrbutorName: distributor.distributorName,
      DistrbutorSystemCode: distributor.systemCode,
      City: distributor.city,
    };
    dispatch(fetchDistributor([party]));
    router.push({
      pathname: '/distributor-sale-order',
      params: {
        id,
        orderId: '',
        bookerId: '',
        parentDistId: id,
        visitKind: 'distributor',
        returnTo: 'zsm-home',
      },
    });
  }, [dispatch, popup]);

  const openShopVisit = useCallback((
    distributorId: string,
    bookerId: string,
    shop: ZsmShop,
  ) => {
    const shopId = String(shop.shopId || '').trim();
    if (!shopId) {
      popup.info('Visit', 'Shop id is missing.');
      return;
    }
    const party: Row = {
      _id: shopId,
      DistrbutorName: shop.shopName,
      CustomerName: shop.shopName,
      CustomorName: shop.shopName,
      OwnerName: shop.ownerName,
      City: shop.city,
      code: shop.code,
    };
    dispatch(fetchDistributor([party]));
    router.push({
      pathname: '/distributor-sale-order',
      params: {
        id: shopId,
        orderId: '',
        bookerId,
        parentDistId: distributorId,
        visitKind: 'shop',
        returnTo: 'zsm-home',
      },
    });
  }, [dispatch, popup]);

  const loadTree = useCallback(async (soft = false) => {
    if (!isZsm) return;
    if (loginServer && loginServer !== 'snd') {
      popup.info('ZSM Home', 'ZSM dashboard uses SND users. Log in again as SND ZSM.');
      return;
    }
    if (!userId) return;
    if (!soft) setLoading(true);
    try {
      const next = await fetchZsmHierarchy(userId);
      setTree(next);
      setDistExpanded((current) => current || next.distributors[0]?.distributorId || '');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load ZSM hierarchy.';
      popup.error('ZSM Home', message);
      setTree(emptyZsmHierarchy(userId));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isZsm, loginServer, popup, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadTree();
    }, [loadTree]),
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tree.distributors;
    return tree.distributors
      .map((dist) => {
        const distHit = dist.distributorName.toLowerCase().includes(needle);
        const tsms = dist.tsms
          .map((tsm) => {
            const tsmHit = tsm.tsmName.toLowerCase().includes(needle);
            const bookers = tsm.orderBookers
              .map((booker) => {
                const bookerHit = booker.orderBookerName.toLowerCase().includes(needle);
                const shops = booker.shops.filter((shop) =>
                  shop.shopName.toLowerCase().includes(needle)
                  || shop.ownerName.toLowerCase().includes(needle),
                );
                if (distHit || tsmHit || bookerHit || shops.length) {
                  return {
                    ...booker,
                    shops: bookerHit || tsmHit || distHit ? booker.shops : shops,
                  };
                }
                return null;
              })
              .filter(Boolean) as ZsmBooker[];
            if (distHit || tsmHit || bookers.length) {
              return {
                ...tsm,
                orderBookers: tsmHit || distHit ? tsm.orderBookers : bookers,
              };
            }
            return null;
          })
          .filter(Boolean) as ZsmTsmNode[];
        if (distHit || tsms.length) {
          return { ...dist, tsms: distHit ? dist.tsms : tsms };
        }
        return null;
      })
      .filter(Boolean) as ZsmDistributorNode[];
  }, [query, tree.distributors]);

  if (!isZsm) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>ZSM dashboard is only for ZSM accounts.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ZSM DASHBOARD</Text>
        <View style={styles.pillRow}>
          <View style={styles.pill}><Text style={styles.pillValue}>{tree.summary.distributors}</Text><Text style={styles.pillLabel}>Dist</Text></View>
          <View style={styles.pill}><Text style={styles.pillValue}>{tree.summary.tsms}</Text><Text style={styles.pillLabel}>TSM</Text></View>
          <View style={styles.pill}><Text style={styles.pillValue}>{tree.summary.orderBookers}</Text><Text style={styles.pillLabel}>Bookers</Text></View>
          <View style={styles.pill}><Text style={styles.pillValue}>{tree.summary.shops}</Text><Text style={styles.pillLabel}>Shops</Text></View>
        </View>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={theme.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search distributor, TSM, booker, shop"
            placeholderTextColor={theme.colors.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading hierarchy…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.distributorId}
          contentContainerStyle={styles.list}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadTree(true);
              }}
              tintColor={theme.colors.primary}
            />
          )}
          ListEmptyComponent={(
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No distributors found. ZSM Vendor list must have more than 1 distributor.
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <DistributorCard
              distributor={item}
              expanded={distExpanded === item.distributorId}
              tsmExpanded={tsmExpanded}
              bookerExpanded={bookerExpanded}
              onToggle={() => {
                setDistExpanded((current) => (current === item.distributorId ? '' : item.distributorId));
                setTsmExpanded('');
                setBookerExpanded('');
              }}
              onToggleTsm={(id) => {
                setTsmExpanded((current) => (current === id ? '' : id));
                setBookerExpanded('');
              }}
              onToggleBooker={(id) => {
                setBookerExpanded((current) => (current === id ? '' : id));
              }}
              onVisitDistributor={() => openDistributorVisit(item)}
              onVisitShop={(bookerId, shop) => openShopVisit(item.distributorId, bookerId, shop)}
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
  hero: {
    ...ui.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
  },
  eyebrow: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  pillRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 64,
  },
  pillValue: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  pillLabel: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  searchBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: theme.colors.ink,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  distCard: {
    ...ui.card,
    padding: 0,
    overflow: 'hidden',
    marginBottom: 10,
  },
  distHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  distHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distVisitBtn: {
    alignSelf: 'flex-start',
    marginLeft: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  distVisitText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  distIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distName: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  visitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  visitChipText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  tsmBlock: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingLeft: 8,
  },
  bookerBlock: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    marginLeft: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tsmName: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  bookerName: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  rowMeta: {
    marginTop: 2,
    color: theme.colors.muted,
    fontSize: 11,
  },
  shopLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  shopName: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  shopMeta: {
    marginTop: 2,
    color: theme.colors.muted,
    fontSize: 11,
  },
  emptyNested: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.muted,
    fontSize: 12,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  loadingText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  emptyCard: {
    ...ui.card,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
});

export default ZsmHome;
