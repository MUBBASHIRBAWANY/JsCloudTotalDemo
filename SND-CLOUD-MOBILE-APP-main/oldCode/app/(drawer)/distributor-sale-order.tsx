import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { AddSaleOrder, removeSaleOrder, updateSaleOrder } from '../../Redux/Reducer/SaleOrderReducer';
import type { RootState } from '../../Redux/Store/types';
import {
  isSndProduct,
  lineFromProduct,
  money,
  recalcLine,
  type OrderLine,
  type ProductRef,
} from '../../src/distributorSaleOrder';
import { theme, ui } from '../../src/theme';
import { textOf, useLoginUser, type Row } from '../../src/useLoginUser';

const today = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

type Geo = { latitude: number; longitude: number };

const balanceOf = (row: Row) => {
  const parsed = typeof row.sumAging === 'number'
    ? row.sumAging
    : Number(String(row.sumAging ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const savedImages = (order: Row | undefined): (string | null)[] => {
  const slots: (string | null)[] = [null, null, null];
  if (!order || !Array.isArray(order.Images)) return slots;
  order.Images.slice(0, 3).forEach((image, index) => {
    if (typeof image === 'string' && image) slots[index] = image;
  });
  return slots;
};

const DistributorSaleOrder = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { orderBookerId } = useLoginUser();
  const params = useLocalSearchParams<{ id?: string | string[]; orderId?: string | string[] }>();
  const orderIdParam = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId || '';
  const routeDistributorId = Array.isArray(params.id) ? params.id[0] : params.id || '';
  const pendingOrders = useSelector((state: RootState) => state.SalesOrder.SalesOrder) as Row[];
  const localOrder = useMemo(() => {
    const saved = pendingOrders.filter((order) => order.kind === 'distributor');
    const ownerOf = (order: Row) => String(order.Distrbutor || order.Distributor || order.Customer || '');
    if (orderIdParam) {
      const byId = saved.find((order) => String(order.id) === orderIdParam);
      if (byId && (!routeDistributorId || ownerOf(byId) === routeDistributorId)) return byId;
    }
    if (!routeDistributorId) return undefined;
    const forClient = saved.filter((order) => ownerOf(order) === routeDistributorId);
    return forClient[forClient.length - 1];
  }, [orderIdParam, pendingOrders, routeDistributorId]);
  const orderId = localOrder?.id ? String(localOrder.id) : '';
  const distributorId = routeDistributorId || String(localOrder?.Distrbutor || localOrder?.Distributor || '');
  const distributors = useSelector((state: RootState) => state.distributors.Distributor) as Row[];
  const products = useSelector((state: RootState) => state.Product.Product) as ProductRef[];
  const distributor = distributors.find((row) => String(row._id) === distributorId);
  const [orderDate, setOrderDate] = useState(
    typeof localOrder?.OrderDate === 'string' && localOrder.OrderDate ? localOrder.OrderDate : today,
  );
  const [remarks, setRemarks] = useState(typeof localOrder?.Remarks === 'string' ? localOrder.Remarks : '');
  const [lines, setLines] = useState<OrderLine[]>(Array.isArray(localOrder?.OrderData) ? localOrder.OrderData as OrderLine[] : []);
  const [images, setImages] = useState<(string | null)[]>(() => savedImages(localOrder));
  const [location, setLocation] = useState<Geo | null>(() => {
    const latitude = Number(localOrder?.latitude);
    const longitude = Number(localOrder?.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  });
  const [locating, setLocating] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const formKey = `${routeDistributorId}|${orderId || 'new'}`;
  const [appliedKey, setAppliedKey] = useState(formKey);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: orderId ? 'Update Sale Order' : 'New Sale Order',
      headerLeft: () => (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          hitSlop={8}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
      ),
    });
  }, [navigation, orderId]);

  useEffect(() => {
    if (appliedKey === formKey) return;
    if (localOrder) {
      setRemarks(typeof localOrder.Remarks === 'string' ? localOrder.Remarks : '');
      setLines(Array.isArray(localOrder.OrderData) ? localOrder.OrderData as OrderLine[] : []);
      setImages(savedImages(localOrder));
      const latitude = Number(localOrder.latitude);
      const longitude = Number(localOrder.longitude);
      setLocation(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null);
      setOrderDate(typeof localOrder.OrderDate === 'string' && localOrder.OrderDate ? localOrder.OrderDate : today());
    } else {
      setRemarks('');
      setLines([]);
      setImages([null, null, null]);
      setLocation(null);
      setOrderDate(today());
    }
    setAppliedKey(formKey);
  }, [appliedKey, formKey, localOrder]);

  const productsById = useMemo(() => {
    const map = new Map<string, ProductRef>();
    for (const product of products) {
      if (product._id) map.set(String(product._id), product);
    }
    return map;
  }, [products]);

  const sndProducts = useMemo(
    () => products.filter((product) => product._id && isSndProduct(product)),
    [products],
  );

  const visibleProducts = useMemo(() => {
    const needle = productQuery.trim().toLowerCase();
    const source = needle
      ? sndProducts.filter((product) =>
        `${product.ProductName || ''} ${product.code || ''} ${product.mastercode || ''}`.toLowerCase().includes(needle),
      )
      : sndProducts;
    return source.slice(0, 80);
  }, [productQuery, sndProducts]);

  const totals = useMemo(() => lines.reduce((sum, line) => ({
    carton: sum.carton + Math.trunc(Number(line.carton) || 0),
    box: sum.box + Math.trunc(Number(line.box) || 0),
    gross: sum.gross + line.GrossAmount,
    net: sum.net + line.netAmunt,
  }), { carton: 0, box: 0, gross: 0, net: 0 }), [lines]);

  const balance = distributor ? balanceOf(distributor) : 0;
  const photoCount = images.filter(Boolean).length;
  const ready = remarks.trim().length > 0
    && photoCount === 3
    && location !== null
    && lines.some((line) => line.product && (Number(line.carton) > 0 || Number(line.box) > 0));

  const captureLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Allow location so this order records where it was taken.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Location', 'Could not read the current location. Try again outdoors.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (localOrder) return;
    void captureLocation();
  }, [localOrder]);

  const capturePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera needed', 'Allow the camera to take the 3 order photos.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.6 });
    if (result.canceled || !result.assets[0]) return null;
    return result.assets[0].uri;
  };

  const takePhoto = async (index: number) => {
    const store = async () => {
      const uri = await capturePhoto();
      if (!uri) return;
      setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? uri : item)));
    };
    if (!images[index]) {
      await store();
      return;
    }
    Alert.alert('Photo', 'Replace this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? null : item))),
      },
      { text: 'Retake', onPress: () => { void store(); } },
    ]);
  };

  const openPicker = (lineId: string) => {
    setProductQuery('');
    setPickerFor(lineId);
  };

  const chooseProduct = (product: ProductRef) => {
    const targetId = pickerFor;
    if (!targetId || !product._id) return;
    const duplicate = lines.some((line) => line.product === product._id && line.id !== targetId);
    if (duplicate) {
      Alert.alert('Already added', 'That product is already on this order.');
      return;
    }
    setLines((current) => {
      if (targetId === 'new') return [...current, recalcLine(lineFromProduct(product), product)];
      return current.map((line) => (
        line.id === targetId ? recalcLine(lineFromProduct(product, line.id), product) : line
      ));
    });
    setPickerFor(null);
  };

  const changeQty = (lineId: string, field: 'carton' | 'box', value: string) => {
    const digits = value.replace(/[^0-9]/g, '');
    setLines((current) => current.map((line) => {
      if (line.id !== lineId) return line;
      return recalcLine({ ...line, [field]: digits }, productsById.get(line.product));
    }));
  };

  const saveLocally = () => {
    if (!distributor?._id) {
      Alert.alert('Distributor missing', 'Go back and choose a distributor again.');
      return;
    }
    if (photoCount < 3) {
      Alert.alert('3 photos required', 'Take all 3 photos before saving this order.');
      return;
    }
    if (!location) {
      Alert.alert('Location required', 'Capture the current location before saving.');
      return;
    }
    if (!remarks.trim()) {
      Alert.alert('Remarks required', 'Add a short remark before saving.');
      return;
    }
    const complete = lines.filter((line) => line.product && (Number(line.carton) > 0 || Number(line.box) > 0));
    if (complete.length === 0) {
      Alert.alert('Add a product', 'Enter carton or box quantity for at least one product.');
      return;
    }
    setSaving(true);
    const name = textOf(distributor, ['DistrbutorName', 'OwnerName', 'code']);
    const payload = {
      id: orderId || `dso-${Date.now()}`,
      kind: 'distributor',
      OrderDate: orderDate,
      SaleOrderDate: orderDate,
      Remarks: remarks.trim(),
      purchase: '',
      Distrbutor: distributor._id,
      Distributor: distributor._id,
      Customer: distributor._id,
      DistrbutorName: name,
      Balance: balance,
      TotalAmount: totals.net,
      OrderData: complete,
      Images: images.filter((image): image is string => Boolean(image)),
      latitude: location.latitude,
      longitude: location.longitude,
      PostStatus: 'Accept',
      UserId: orderBookerId,
      OrderBookerId: orderBookerId,
    };
    if (orderId) dispatch(updateSaleOrder(payload));
    else dispatch(AddSaleOrder(payload));
    for (const order of pendingOrders) {
      if (order.kind !== 'distributor' || !order.id || String(order.id) === payload.id) continue;
      const owner = String(order.Distrbutor || order.Distributor || order.Customer || '');
      if (owner === String(distributor._id)) dispatch(removeSaleOrder(order.id));
    }
    setSaving(false);
    Alert.alert(
      orderId ? 'Order updated' : 'Saved on this phone',
      `${name} is waiting in Sales Order. Photos upload when you send pending.`,
      [{ text: 'View pending', onPress: () => router.replace('/sales-order') }],
    );
  };

  if (!distributor) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingTitle}>Distributor not on this phone</Text>
        <Text style={styles.missingText}>Sign in again so the distributor list is saved, then open the order from Home.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.party}>
          <Text style={styles.kicker}>Distributor</Text>
          <Text style={styles.partyName}>{textOf(distributor, ['DistrbutorName', 'OwnerName'])}</Text>
          <Text style={styles.partyMeta}>
            Code {textOf(distributor, ['DistrbutorSystemCode', 'code'], '—')}
            {textOf(distributor, ['OwnerName'], '') ? `  ·  ${textOf(distributor, ['OwnerName'], '')}` : ''}
          </Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceValue}>{money(balance)}</Text>
          </View>
          <Text style={styles.modeNote}>
            {orderId
              ? 'This client already has an order on this phone. The products below are from that order. Save will update it.'
              : 'New client. This will be added as a new order.'}
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.countLabel}>{photoCount}/3</Text>
        </View>
        <View style={styles.photoRow}>
          {images.map((uri, index) => (
            <TouchableOpacity key={index} style={styles.photoSlot} onPress={() => takePhoto(index)} activeOpacity={0.8}>
              {uri ? (
                <Image source={{ uri }} style={styles.photo} />
              ) : (
                <View style={styles.photoEmpty}>
                  <Feather name="camera" size={20} color={theme.colors.primary} />
                  <Text style={styles.photoIndex}>{index + 1}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationCopy}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.partyMeta}>
              {location
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : 'Not captured yet'}
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={captureLocation} disabled={locating}>
            {locating ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <>
                <Feather name="map-pin" size={16} color={theme.colors.primary} />
                <Text style={styles.addButtonText}>{location ? 'Update' : 'Capture'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Order date</Text>
        <TextInput style={[styles.input, styles.readonly]} value={orderDate} editable={false} />

        <Text style={styles.label}>Remarks</Text>
        <TextInput
          style={[styles.input, styles.remarks]}
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Delivery note or instruction"
          placeholderTextColor="#94A3B8"
          multiline
        />

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Products</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => openPicker('new')}>
            <Feather name="plus" size={16} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Add product</Text>
          </TouchableOpacity>
        </View>

        {lines.length === 0 ? (
          <Text style={styles.empty}>No products yet. Add the first line to start this order.</Text>
        ) : lines.map((line) => (
          <View key={line.id} style={styles.line}>
            <TouchableOpacity onPress={() => openPicker(line.id)}>
              <Text style={styles.lineName}>{line.productName || 'Choose product'}</Text>
              <Text style={styles.lineMeta}>Rate per box {money(line.Rate)}</Text>
            </TouchableOpacity>
            <View style={styles.qtyRow}>
              <View style={styles.qtyField}>
                <Text style={styles.qtyLabel}>Carton</Text>
                <TextInput
                  style={styles.qtyInput}
                  value={line.carton}
                  onChangeText={(value) => changeQty(line.id, 'carton', value)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.qtyField}>
                <Text style={styles.qtyLabel}>Box</Text>
                <TextInput
                  style={styles.qtyInput}
                  value={line.box}
                  onChangeText={(value) => changeQty(line.id, 'box', value)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountText}>Gross {money(line.GrossAmount)}</Text>
              <Text style={styles.amountStrong}>Net {money(line.netAmunt)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setLines((current) => current.filter((item) => item.id !== line.id))}
              style={styles.remove}
            >
              <Feather name="trash-2" size={14} color={theme.colors.danger} />
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalMeta}>{totals.carton} ctn · {totals.box} box</Text>
          <Text style={styles.totalValue}>{money(totals.net)}</Text>
        </View>
        {!ready ? (
          <Text style={styles.hint}>Take 3 photos, capture location, add remarks, and at least one product.</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.save, (!ready || saving) && styles.saveOff]}
          onPress={saveLocally}
          disabled={!ready || saving}
        >
          <Text style={styles.saveText}>{orderId ? 'Save changes' : 'Save on this phone'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={pickerFor !== null} animationType="slide" transparent onRequestClose={() => setPickerFor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Select product</Text>
              <Pressable onPress={() => setPickerFor(null)} hitSlop={8}>
                <Feather name="x" size={22} color={theme.colors.ink} />
              </Pressable>
            </View>
            <TextInput
              style={styles.search}
              value={productQuery}
              onChangeText={setProductQuery}
              placeholder="Search name or code"
              placeholderTextColor="#94A3B8"
              autoFocus
            />
            <FlatList
              data={visibleProducts}
              keyExtractor={(item) => String(item._id)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>No SND products saved on this phone.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.productRow} onPress={() => chooseProduct(item)}>
                  <Text style={styles.productName}>{item.ProductName}</Text>
                  <Text style={styles.productMeta}>
                    {item.mastercode || item.code || '—'} · TP {money(Number(item.TPSale) || 0)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: ui.screen,
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  backButton: {
    marginLeft: 8,
    padding: 6,
  },
  party: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 16,
    marginBottom: 16,
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  partyName: {
    marginTop: 4,
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  partyMeta: {
    marginTop: 4,
    color: theme.colors.muted,
    fontSize: 13,
  },
  balanceRow: {
    marginTop: 14,
    backgroundColor: theme.colors.warningSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: theme.colors.warning,
    fontWeight: '700',
  },
  balanceValue: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  modeNote: {
    marginTop: 12,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  label: ui.sectionTitle,
  input: {
    ...ui.search,
    marginBottom: 4,
  },
  readonly: {
    color: theme.colors.muted,
    backgroundColor: '#EEF2F7',
  },
  remarks: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  sectionHead: {
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  countLabel: {
    color: theme.colors.muted,
    fontWeight: '700',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  photoSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
    gap: 4,
  },
  photoIndex: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  locationCard: {
    ...ui.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationCopy: {
    flex: 1,
  },
  empty: ui.empty,
  line: {
    ...ui.card,
  },
  lineName: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  lineMeta: {
    marginTop: 2,
    color: theme.colors.muted,
    fontSize: 12,
  },
  qtyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  qtyField: {
    flex: 1,
  },
  qtyLabel: {
    marginBottom: 6,
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  qtyInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  amountRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountText: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  amountStrong: {
    color: theme.colors.ink,
    fontWeight: '800',
  },
  remove: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  removeText: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalMeta: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  totalValue: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  hint: {
    marginBottom: 8,
    color: theme.colors.muted,
    fontSize: 12,
  },
  save: ui.primaryButton,
  saveOff: ui.disabled,
  saveText: ui.primaryButtonText,
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  search: ui.search,
  productRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  productName: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  productMeta: {
    marginTop: 2,
    color: theme.colors.muted,
    fontSize: 12,
  },
  missing: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  missingTitle: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  missingText: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});

export default DistributorSaleOrder;
