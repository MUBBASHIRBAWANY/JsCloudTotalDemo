import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { removeSaleOrder } from '../../Redux/Reducer/SaleOrderReducer';
import type { RootState } from '../../Redux/Store/types';
import { getDataFundtion } from '../../src/Api/CurdFunctions';
import { isDistributorSaleOrder, money, postPendingOrder } from '../../src/distributorSaleOrder';
import { theme, ui } from '../../src/theme';
import { asList, textOf, useLoginUser, type Row } from '../../src/useLoginUser';

const SalesOrderScreen = () => {
  const { dispatch, loginVendor, distributorId, orderBookerId } = useLoginUser();
  const pendingOrders = useSelector((state: RootState) => state.SalesOrder.SalesOrder) as Row[];
  const distributors = useSelector((state: RootState) => state.distributors.Distributor) as Row[];
  const [serverOrders, setServerOrders] = useState<Row[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [sending, setSending] = useState(false);

  const distributorNameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const distributor of distributors) {
      if (!distributor._id) continue;
      names.set(String(distributor._id), textOf(distributor, ['DistrbutorName', 'OwnerName', 'code']));
    }
    return names;
  }, [distributors]);

  const loadServerOrders = useCallback(async (options?: { silent?: boolean }) => {
    if (!orderBookerId && !distributorId) return;
    setLoadingOrders(true);
    try {
      let orders: Row[] = [];
      if (orderBookerId) {
        orders = asList(await getDataFundtion(`/saleOrder/getDataByOrderBooker/${orderBookerId}`));
      }
      if (orders.length === 0 && distributorId) {
        orders = asList(await getDataFundtion(`/saleOrder/saleOrderByDis/${distributorId}`));
      }
      setServerOrders(orders);
    } catch (error) {
      console.error('Sale order fetch failed:', error);
      if (!options?.silent) {
        Alert.alert('Sales Order', 'Could not load sales orders. Check your connection and try again.');
      }
    } finally {
      setLoadingOrders(false);
    }
  }, [distributorId, orderBookerId]);

  useEffect(() => {
    if (orderBookerId || distributorId) {
      loadServerOrders({ silent: true });
    }
  }, [distributorId, loadServerOrders, orderBookerId]);

  const uploadPendingOrders = async () => {
    if (!loginVendor) {
      throw new Error('Not signed in');
    }
    for (const order of pendingOrders) {
      console.log(pendingOrders)
      await postPendingOrder(order, { distributorId, orderBookerId });
      if (order.id) dispatch(removeSaleOrder(order.id));
    }
  };

  const sendPendingOrders = () => {
    if (!loginVendor) {
      Alert.alert('Not signed in', 'Please log in again.');
      return;
    }
    if (pendingOrders.length === 0) {
      Alert.alert('Sales Order', 'No pending orders on this phone.');
      return;
    }
    Alert.alert(
      'Send pending orders',
      `Send ${pendingOrders.length} order${pendingOrders.length === 1 ? '' : 's'} to the server?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            setSending(true);
            uploadPendingOrders()
              .then(async () => {
                Alert.alert('Sales Order', 'Pending orders sent.');
                await loadServerOrders();
              })
              .catch((error) => {
                console.error('Send orders failed:', error);
                Alert.alert('Sales Order', 'Could not send every order. The ones still listed were not sent.');
              })
              .finally(() => setSending(false));
          },
        },
      ],
    );
  };

  const orderTitle = (order: Row) => {
    if (isDistributorSaleOrder(order)) return textOf(order, ['DistrbutorName'], 'Distributor order');
    return textOf(order, ['SaleOrderNumber', 'id', '_id'], 'Sales order');
  };

  const orderCustomer = (order: Row) => {
    const named = textOf(order, ['DistrbutorName'], '');
    if (named) return named;
    const customerId = textOf(order, ['Customer', 'Distrbutor', 'Distributor'], '');
    if (customerId && distributorNameById.has(customerId)) return distributorNameById.get(customerId) as string;
    return customerId || 'Customer not set';
  };

  const orderSummary = (order: Row) => {
    const lines = Array.isArray(order.OrderData) ? order.OrderData.length : Array.isArray(order.SaleOrderData) ? order.SaleOrderData.length : 0;
    const parts = [textOf(order, ['SaleOrderDate', 'OrderDate'], 'Date not set')];
    if (isDistributorSaleOrder(order)) parts.push(`Balance ${money(Number(order.Balance) || 0)}`);
    if (typeof order.TotalAmount === 'number') parts.push(`Total ${money(order.TotalAmount)}`);
    if (lines > 0) parts.push(`${lines} line${lines === 1 ? '' : 's'}`);
    if (isDistributorSaleOrder(order)) {
      const photos = Array.isArray(order.Images) ? order.Images.filter(Boolean).length : 0;
      if (photos > 0) parts.push(`${photos} photo${photos === 1 ? '' : 's'}`);
      if (order.latitude != null && order.longitude != null) parts.push('Location saved');
    }
    return parts.join('  ·  ');
  };

  const openOrder = (order: Row) => {
    if (!isDistributorSaleOrder(order) || !order.id) return;
    router.push({
      pathname: '/distributor-sale-order',
      params: {
        orderId: String(order.id),
        id: String(order.Distrbutor || order.Distributor || ''),
      },
    });
  };

  return (
    <FlatList
      style={styles.container}
      data={serverOrders}
      keyExtractor={(item, index) => String(item._id || item.id || index)}
      refreshControl={
        <RefreshControl refreshing={loadingOrders} onRefresh={() => loadServerOrders()} tintColor="#4338CA" />
      }
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View>
          <Text style={ui.lead}>Orders saved on this phone stay here until you send them.</Text>
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[styles.button, sending && styles.buttonDisabled]}
              onPress={sendPendingOrders}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send pending ({pendingOrders.length})</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => loadServerOrders()}>
              <Text style={styles.secondaryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>On this phone</Text>
          {pendingOrders.length === 0 ? (
            <Text style={styles.emptyText}>No pending sales orders.</Text>
          ) : (
            pendingOrders.map((order, index) => (
              <TouchableOpacity
                key={String(order.id || order._id || index)}
                style={styles.card}
                activeOpacity={isDistributorSaleOrder(order) ? 0.75 : 1}
                onPress={() => openOrder(order)}
              >
                <Text style={styles.cardTitle}>{orderTitle(order)}</Text>
                {isDistributorSaleOrder(order) ? (
                  textOf(order, ['Remarks'], '') ? <Text style={styles.cardMeta}>{textOf(order, ['Remarks'], '')}</Text> : null
                ) : (
                  <Text style={styles.cardMeta}>{orderCustomer(order)}</Text>
                )}
                <Text style={styles.cardMeta}>{orderSummary(order)}</Text>
                {isDistributorSaleOrder(order) ? <Text style={styles.waiting}>Tap to edit · Waiting to send</Text> : null}
              </TouchableOpacity>
            ))
          )}

          <Text style={styles.sectionTitle}>From server</Text>
          {loadingOrders && serverOrders.length === 0 ? (
            <ActivityIndicator color="#4338CA" style={styles.loader} />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loadingOrders ? null : <Text style={styles.emptyText}>No sales orders on the server yet.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{orderTitle(item)}</Text>
          <Text style={styles.cardMeta}>{orderCustomer(item)}</Text>
          <Text style={styles.cardMeta}>{orderSummary(item)}</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: ui.screen,
  listContent: ui.listContent,
  rowActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  button: {
    ...ui.primaryButton,
    flex: 1,
  },
  buttonDisabled: ui.disabled,
  buttonText: ui.primaryButtonText,
  secondaryButton: ui.secondaryButton,
  secondaryButtonText: ui.secondaryButtonText,
  sectionTitle: ui.sectionTitle,
  emptyText: ui.empty,
  card: ui.card,
  cardTitle: ui.cardTitle,
  cardMeta: ui.cardMeta,
  waiting: {
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
  loader: {
    marginVertical: 12,
  },
});

export default SalesOrderScreen;
