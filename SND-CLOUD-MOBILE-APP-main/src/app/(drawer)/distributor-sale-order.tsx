import { theme, ui } from '@/constants/app-theme';
import {
  isTsmRole,
  isZsmRole,
  partyNameKeys,
  roleHomePath,
  textOf,
  useLoginUser,
  type Row,
} from '@/hooks/useLoginUser';
import { isPendingCustomer } from '@/lib/customerForm';
import {
  isSndProduct,
  lineFromProduct,
  money,
  orderImageFromAsset,
  partyIdOf,
  readOrderImage,
  recalcLine,
  type OrderImage,
  type OrderLine,
  type ProductRef,
} from '@/lib/distributorSaleOrder';
import { getCurrentCoords } from '@/lib/getCurrentCoords';
import { deviceBusinessDate, resolveBusinessDate } from '@/lib/networkTime';
import { enqueueOfflineOrder } from '@/lib/offlineOrderQueue';
import { getTrustedGpsLocation } from '@/lib/trustedLocation';
import NetInfo from '@react-native-community/netinfo';
import { AddSaleOrder, removeSaleOrder, updateSaleOrder } from '@/redux/Reducer/SaleOrderReducer';
import type { RootState } from '@/redux/Store/types';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useInAppCamera } from '@/components/InAppCamera';
import { KeyboardSafeScrollView } from '@/components/KeyboardSafeScrollView';
import { useAppPopup } from '@/components/ui/AppPopup';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

const newOrderId = () => `dso-${Date.now()}`;

type Geo = { latitude: number; longitude: number };

const balanceOf = (row: Row) => {
  const parsed = typeof row.sumAging === 'number'
    ? row.sumAging
    : Number(String(row.sumAging ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const savedImages = (order: Row | undefined): (OrderImage | null)[] => {
  const slots: (OrderImage | null)[] = [null, null, null];
  if (!order || !Array.isArray(order.Images)) return slots;
  order.Images.slice(0, 3).forEach((image, index) => {
    slots[index] = readOrderImage(image, index);
  });
  return slots;
};

const DistributorSaleOrder = () => {
  const popup = useAppPopup();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { capturePhoto: openCamera, cameraModal } = useInAppCamera();
  const {
    orderBookerId: sessionBookerId,
    loginVendor,
    loginServer,
    loginRole,
    distributorId: bookerDistributorId,
  } = useLoginUser();
  const snd = loginServer === 'snd';
  const params = useLocalSearchParams<{
    id?: string | string[];
    orderId?: string | string[];
    bookerId?: string | string[];
    returnTo?: string | string[];
    parentDistId?: string | string[];
    visitKind?: string | string[];
  }>();
  const orderIdParam = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId || '';
  const routeDistributorId = Array.isArray(params.id) ? params.id[0] : params.id || '';
  const routeBookerId = Array.isArray(params.bookerId) ? params.bookerId[0] : params.bookerId || '';
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo || '';
  const parentDistId = Array.isArray(params.parentDistId) ? params.parentDistId[0] : params.parentDistId || '';
  const visitKind = Array.isArray(params.visitKind) ? params.visitKind[0] : params.visitKind || '';
  const partyLabel =
    visitKind === 'distributor'
      ? 'Distributor'
      : snd
        ? 'Customer'
        : 'Distributor';
  const isTsm =
    isTsmRole(loginRole || loginVendor?.loginRole)
    || returnTo === 'tsm-home';
  const isZsm =
    isZsmRole(loginRole || loginVendor?.loginRole)
    || returnTo === 'zsm-home';
  /** TSM + ZSM: visit flow (no phone order). */
  const isVisitRole = isTsm || isZsm;
  const orderBookerId = routeBookerId || sessionBookerId;
  const owningDistributorId = parentDistId || bookerDistributorId || '';
  const goHome = useCallback(() => {
    router.replace(
      roleHomePath(
        isZsm ? 'zsm' : isTsm ? 'tsm' : loginRole || loginVendor?.loginRole,
      ),
    );
  }, [isTsm, isZsm, loginRole, loginVendor?.loginRole]);
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
    typeof localOrder?.OrderDate === 'string' && localOrder.OrderDate ? localOrder.OrderDate : '',
  );
  const [dateLoading, setDateLoading] = useState(false);
  const [dateError, setDateError] = useState('');
  const [dateSource, setDateSource] = useState<'network' | 'device' | null>(null);
  const [remarks, setRemarks] = useState(typeof localOrder?.Remarks === 'string' ? localOrder.Remarks : '');
  const [visit, setVisit] = useState(
    localOrder ? localOrder.Visit === true : isVisitRole,
  );
  const [orderThroughPhone, setOrderThroughPhone] = useState(
    isVisitRole
      ? false
      : localOrder?.orderThroughPhone === true || localOrder?.OrderThroughPhone === true,
  );
  const [lines, setLines] = useState<OrderLine[]>(Array.isArray(localOrder?.OrderData) ? localOrder.OrderData as OrderLine[] : []);
  const [images, setImages] = useState<(OrderImage | null)[]>(() => savedImages(localOrder));
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
  if (appliedKey !== formKey) {
    setAppliedKey(formKey);
    if (localOrder) {
      setRemarks(typeof localOrder.Remarks === 'string' ? localOrder.Remarks : '');
      setVisit(localOrder.Visit === true);
      setOrderThroughPhone(
        isVisitRole
          ? false
          : localOrder.orderThroughPhone === true || localOrder.OrderThroughPhone === true,
      );
      setLines(Array.isArray(localOrder.OrderData) ? localOrder.OrderData as OrderLine[] : []);
      setImages(savedImages(localOrder));
      const latitude = Number(localOrder.latitude);
      const longitude = Number(localOrder.longitude);
      setLocation(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null);
      setOrderDate(typeof localOrder.OrderDate === 'string' && localOrder.OrderDate ? localOrder.OrderDate : '');
      setDateError('');
      setDateSource(null);
      setDateLoading(false);
    } else {
      setRemarks('');
      setVisit(isVisitRole);
      setOrderThroughPhone(false);
      setLines([]);
      setImages([null, null, null]);
      setLocation(null);
      setOrderDate('');
      setDateError('');
      setDateSource(null);
    }
  }

  const loadNetworkDate = useCallback(async () => {
    if (orderId) return;
    setDateLoading(true);
    setDateError('');
    // Show device date immediately so the field is never empty while network tries.
    const instant = deviceBusinessDate();
    if (instant) {
      setOrderDate(instant);
      setDateSource('device');
    }
    try {
      const resolved = await resolveBusinessDate();
      setOrderDate(resolved.date);
      setDateSource(resolved.source);
      setDateError('');
    } catch {
      // Keep device date already shown; only error if still empty.
      if (!instant) {
        setDateError('Could not get order date.');
        setOrderDate('');
        setDateSource(null);
      }
    } finally {
      setDateLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) return;
    void loadNetworkDate();
  }, [orderId, formKey, loadNetworkDate]);

  useLayoutEffect(() => {
    const visitTitle = orderId
      ? 'Update Visit'
      : visitKind === 'distributor'
        ? 'Distributor Visit'
        : 'Shop Visit';
    navigation.setOptions({
      title: isVisitRole
        ? visitTitle
        : orderId
          ? 'Update Sale Order'
          : 'New Sale Order',
      headerLeft: () => (
        <Pressable
          onPress={goHome}
          hitSlop={8}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
      ),
    });
  }, [navigation, orderId, goHome, isVisitRole, visitKind]);

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
  const photoCount = images.filter((image) => image?.uri).length;
  // TSM/ZSM can only save visits — never "order through phone".
  const throughPhone = !isVisitRole && orderThroughPhone;
  // TSM/ZSM shop visit: all 3 photos optional. Order booker: at least 1 (unless phone order).
  const photosReady = isVisitRole || throughPhone || photoCount >= 1;
  const hasProduct = lines.some((line) => line.product && (Number(line.carton) > 0 || Number(line.box) > 0));
  const dateReady = Boolean(orderDate) && !dateLoading && !dateError;
  const locationReady = Boolean(location);
  // TSM/ZSM visit requires remarks.
  const remarksReady = !(isVisitRole && visit) || remarks.trim().length > 0;
  // Visit or product order — GPS is always required (including visit-only).
  const orderReady = photosReady && dateReady && locationReady && remarksReady && (visit || hasProduct);

  const onVisitChange = (next: boolean) => {
    setVisit(next);
    if (!next) return;
    // Visit and phone order cannot both be on.
    setOrderThroughPhone(false);
    setLines([]);
    setPickerFor(null);
    setProductQuery('');
  };

  const onOrderThroughPhoneChange = (next: boolean) => {
    if (isVisitRole) return;
    setOrderThroughPhone(next);
    if (!next) return;
    // Phone order turns Visit off.
    setVisit(false);
    setImages([null, null, null]);
  };

  const captureLocation = async () => {
    // Once captured (or loaded from a saved order), GPS cannot be changed.
    if (location || locating) return;
    try {
      setLocating(true);
      const result = await getTrustedGpsLocation();
      if (!result.ok) {
        popup.error('Location blocked', result.message);
        return;
      }
      setLocation({
        latitude: result.geo.latitude,
        longitude: result.geo.longitude,
      });
    } catch {
      popup.error('Location', 'Could not read the current GPS location. Try again outdoors.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (localOrder) return;
    const timer = setTimeout(() => {
      void captureLocation();
    }, 0);
    return () => clearTimeout(timer);
  }, [localOrder]);

  const capturePhoto = async () => {
    try {
      // In-app camera — avoids OnePlus/Android process kill when leaving to system camera.
      const photo = await openCamera({
        facing: 'back',
        title: isVisitRole ? 'Visit photo' : 'Order photo',
      });
      if (!photo?.uri) return null;
      return orderImageFromAsset({
        uri: photo.uri,
        fileName: photo.fileName || null,
        mimeType: photo.mimeType || 'image/jpeg',
      });
    } catch {
      popup.error('Camera needed', 'Could not open the camera. Please try again.');
      return null;
    }
  };

  const takePhoto = async (index: number) => {
    const store = async () => {
      const photo = await capturePhoto();
      if (!photo) return;
      setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? photo : item)));
    };
    if (!images[index]) {
      await store();
      return;
    }
    popup.show({
      type: 'confirm',
      title: 'Photo',
      message: 'Replace this photo?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? null : item))),
        },
        { text: 'Retake', style: 'primary', onPress: () => { void store(); } },
      ],
    });
  };

  const openPicker = (lineId: string) => {
    if (visit && lineId === 'new') return;
    setProductQuery('');
    setPickerFor(lineId);
  };

  const chooseProduct = (product: ProductRef) => {
    const targetId = pickerFor;
    if (!targetId || !product._id) return;
    const duplicate = lines.some((line) => line.product === product._id && line.id !== targetId);
    if (duplicate) {
      popup.info('Already added', 'That product is already on this order.');
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

  const customerWaiting = distributor ? isPendingCustomer(distributor) : false;

  const saveLocally = async () => {
    if (!distributor) {
      popup.error('Distributor missing', 'Go back and choose a distributor again.');
      return;
    }
    const partyId = partyIdOf(distributor._id);
    if (!partyId) {
      popup.error('Distributor missing', 'Go back and choose a distributor again.');
      return;
    }
    if (customerWaiting && !orderId) {
      popup.info(
        'Send customer first',
        `This ${partyLabel.toLowerCase()} is still on this phone. Send them from Sync Data, then you can take their order.`,
      );
      return;
    }
    if (!isVisitRole && !throughPhone && photoCount < 1) {
      popup.error(
        'Photo required',
        'Take at least 1 photo, or turn on Order through phone.',
      );
      return;
    }
    if (isVisitRole && visit && !remarks.trim()) {
      popup.error('Remarks required', 'Enter remarks before saving this visit.');
      return;
    }
    const complete = lines.filter((line) => line.product && (Number(line.carton) > 0 || Number(line.box) > 0));
    if (!visit && complete.length === 0) {
      popup.error(
        'Add a product',
        isVisitRole
          ? 'Enter carton or box for at least one product, or keep Visit on.'
          : 'Enter carton or box for at least one product, or turn Visit on.',
      );
      return;
    }

    setSaving(true);

    // Fresh GPS on every create/update. Without location, order/visit cannot be saved.
    const coords = await getCurrentCoords();
    const resolvedLocation = coords
      ? { latitude: coords.latitude, longitude: coords.longitude }
      : location;
    if (coords) {
      setLocation({ latitude: coords.latitude, longitude: coords.longitude });
    }
    if (!resolvedLocation) {
      setSaving(false);
      popup.error(
        'Location required',
        'Capture GPS first. Without location you cannot save a visit or sale order.',
      );
      return;
    }

    let saveDate = orderDate;
    try {
      // Prefer internet date; if offline, Asia/Karachi device date.
      if (!orderId) {
        const resolved = await resolveBusinessDate();
        saveDate = resolved.date;
        setOrderDate(resolved.date);
        setDateSource(resolved.source);
        setDateError('');
      }
      if (!saveDate) {
        popup.error('Date required', 'Could not set order date. Try again.');
        setSaving(false);
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not get order date.';
      setDateError(message);
      popup.error('Order date', message);
      setSaving(false);
      return;
    }

    const name = textOf(distributor, partyNameKeys(loginVendor?.loginServer));
    const orderLocalId = orderId || newOrderId();
    const payload = {
      id: orderLocalId,
      kind: 'distributor',
      OrderDate: saveDate,
      SaleOrderDate: saveDate,
      Remarks: remarks.trim(),
      purchase: '',
      Distrbutor: partyId,
      Distributor: partyId,
      Customer: partyId,
      DistrbutorName: name,
      Balance: balance,
      TotalAmount: totals.net,
      OrderData: complete,
      Images: throughPhone
        ? []
        : images.filter((image): image is OrderImage => Boolean(image?.uri)),
      latitude: resolvedLocation?.latitude ?? '',
      longitude: resolvedLocation?.longitude ?? '',
      location: coords
        ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            capturedAt: coords.capturedAt,
          }
        : resolvedLocation
          ? {
              latitude: resolvedLocation.latitude,
              longitude: resolvedLocation.longitude,
              accuracy: null,
              capturedAt: new Date().toISOString(),
            }
          : null,
      PostStatus: 'Accept',
      Visit: visit,
      orderThroughPhone: throughPhone,
      OrderThroughPhone: throughPhone,
      UserId: isVisitRole ? sessionBookerId : orderBookerId,
      OrderBookerId: orderBookerId || (isZsm ? sessionBookerId : ''),
      ParentDistributor: owningDistributorId || (visitKind === 'distributor' ? partyId : ''),
      AssignedDistributor: owningDistributorId || (visitKind === 'distributor' ? partyId : ''),
      VisitedBy: isVisitRole && visit ? String(sessionBookerId || '') : '',
      CreatedByRole: isZsm ? 'zsm' : isTsm ? 'tsm' : 'orderbooker',
      VisitKind: isVisitRole ? (visitKind || 'shop') : '',
    };
    if (orderId) dispatch(updateSaleOrder(payload));
    else dispatch(AddSaleOrder(payload));
    for (const order of pendingOrders) {
      if (order.kind !== 'distributor' || !order.id || String(order.id) === payload.id) continue;
      const owner = String(order.Distrbutor || order.Distributor || order.Customer || '');
      if (owner === String(distributor._id)) dispatch(removeSaleOrder(order.id));
    }

    const net = await NetInfo.fetch();
    const online = Boolean(net.isConnected && net.isInternetReachable !== false);
    if (!online) {
      await enqueueOfflineOrder({
        id: orderLocalId,
        payload,
        distributorId: String(
          owningDistributorId
          || (visitKind === 'distributor' ? partyId : '')
          || bookerDistributorId
          || distributorId
          || '',
        ),
        orderBookerId: String(orderBookerId || sessionBookerId || ''),
        enqueuedAt: new Date().toISOString(),
      });
      setSaving(false);
      popup.success(
        'Saved offline',
        `${name} is saved on this phone with GPS. It stays here until you open Sync Data and sync yourself — internet alone will not remove it.`,
        () => goHome(),
      );
      return;
    }

    setSaving(false);
    popup.success(
      orderId ? 'Order updated' : 'Saved on this phone',
      `${name} is saved on this phone. Open Sync Data from the sidebar when you want to send pending orders.`,
      () => goHome(),
    );
  };

  if (!distributor) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingTitle}>{partyLabel} not on this phone</Text>
        <Text style={styles.missingText}>Sign in again so the {partyLabel.toLowerCase()} list is saved, then open the order from Home.</Text>
      </View>
    );
  }

  if (customerWaiting && !orderIdParam) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingTitle}>Send this {partyLabel.toLowerCase()} first</Text>
        <Text style={styles.missingText}>
          This {partyLabel.toLowerCase()} is saved on this phone and has not been sent. Send them from Sync Data, then you can take their order.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardSafeScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={styles.party}>
          <Text style={styles.kicker}>{partyLabel}</Text>
          <Text style={styles.partyName}>{textOf(distributor, partyNameKeys(loginVendor?.loginServer))}</Text>
          <Text style={styles.partyMeta}>
            Code {textOf(distributor, ['DistrbutorSystemCode', 'code'], '—')}
            {textOf(distributor, ['OwnerName'], '') ? `  ·  ${textOf(distributor, ['OwnerName'], '')}` : ''}
          </Text>
          {visitKind === 'distributor' ? null : (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balanceValue}>{money(balance)}</Text>
            </View>
          )}
          <Text style={styles.modeNote}>
            {isVisitRole
              ? (orderId
                ? 'This visit is saved on this phone. Save will update it.'
                : visitKind === 'distributor'
                  ? 'Distributor visit — photos optional, remarks and GPS required.'
                  : 'Shop visit — photos optional, remarks and GPS required.')
              : orderId
                ? 'This client already has an order on this phone. The products below are from that order. Save will update it.'
                : 'New client. This will be added as a new order.'}
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.countLabel}>
            {throughPhone
              ? 'Not required (phone order)'
              : isVisitRole
                ? `${photoCount}/3 · all optional`
                : `${photoCount}/3 · 1 required`}
          </Text>
        </View>
        {throughPhone ? (
          <Text style={styles.empty}>Order through phone is on. Photos are not required for this order.</Text>
        ) : (
          <View style={styles.photoRow}>
            {images.map((image, index) => (
              <TouchableOpacity key={index} style={styles.photoSlot} onPress={() => takePhoto(index)} activeOpacity={0.8}>
                {image?.uri ? (
                  <Image source={{ uri: image.uri }} style={styles.photo} />
                ) : (
                  <View style={styles.photoEmpty}>
                    <Feather name="camera" size={20} color={theme.colors.primary} />
                    <Text style={styles.photoIndex}>{isVisitRole || index > 0 ? 'Opt' : 'Req'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.locationCard}>
          <View style={styles.locationCopy}>
            <Text style={styles.sectionTitle}>Location (required)</Text>
            <Text style={styles.partyMeta}>
              {location
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : locating
                  ? 'Reading GPS…'
                  : 'Required — capture GPS before save'}
            </Text>
            {location ? (
              <Text style={styles.locationLocked}>GPS locked — cannot be changed</Text>
            ) : null}
          </View>
          {location ? (
            <View style={styles.lockedBadge}>
              <Feather name="lock" size={16} color={theme.colors.muted} />
            </View>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={captureLocation} disabled={locating}>
              {locating ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <>
                  <Feather name="map-pin" size={16} color={theme.colors.primary} />
                  <Text style={styles.addButtonText}>Capture GPS</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>{isVisitRole ? 'Visit date' : 'Order date'}</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.readonly, styles.dateInput]}
            value={dateLoading ? 'Getting date…' : orderDate}
            editable={false}
            placeholder="Resolving date"
            placeholderTextColor="#94A3B8"
          />
          {!orderId ? (
            <TouchableOpacity style={styles.dateRetry} onPress={() => void loadNetworkDate()} disabled={dateLoading}>
              {dateLoading ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Feather name="refresh-cw" size={16} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
        {!dateError && dateSource === 'device' ? (
          <Text style={styles.partyMeta}>Offline — using phone date (Asia/Karachi).</Text>
        ) : null}
        {!dateError && dateSource === 'network' ? (
          <Text style={styles.partyMeta}>Internet date (Asia/Karachi).</Text>
        ) : null}
        {dateError ? <Text style={styles.dateError}>{dateError}</Text> : null}

        <Text style={styles.label}>
          {isVisitRole && visit ? 'Remarks (required)' : 'Remarks'}
        </Text>
        <TextInput
          style={[styles.input, styles.remarks]}
          value={remarks}
          onChangeText={setRemarks}
          placeholder={
            isVisitRole && visit
              ? 'Visit remarks are required'
              : 'Delivery note or instruction'
          }
          placeholderTextColor="#94A3B8"
          multiline
        />

        {!isVisitRole ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Products</Text>
              <TouchableOpacity
                style={[styles.addButton, visit && styles.saveOff]}
                onPress={() => openPicker('new')}
                disabled={visit}
                accessibilityState={{ disabled: visit }}
              >
                <Feather name="plus" size={16} color={theme.colors.primary} />
                <Text style={styles.addButtonText}>Add product</Text>
              </TouchableOpacity>
            </View>

            {lines.length === 0 ? (
              <Text style={styles.empty}>
                {visit
                  ? 'Visit is on. Products are cleared and cannot be added.'
                  : 'No products yet. Add the first line to start this order.'}
              </Text>
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
          </>
        ) : null}
      </KeyboardSafeScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {!isVisitRole ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalMeta}>{totals.carton} ctn · {totals.box} box</Text>
            <Text style={styles.totalValue}>{money(totals.net)}</Text>
          </View>
        ) : null}
        {!isVisitRole ? (
          <View style={styles.visitRow}>
            <View style={styles.locationCopy}>
              <Text style={styles.sectionTitle}>Order through phone</Text>
              <Text style={styles.partyMeta}>Phone order — photos are not required.</Text>
            </View>
            <Switch
              value={orderThroughPhone}
              onValueChange={onOrderThroughPhoneChange}
              trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Order through phone"
            />
          </View>
        ) : null}
        <View style={styles.visitRow}>
          <View style={styles.locationCopy}>
            <Text style={styles.sectionTitle}>Visit</Text>
            <Text style={styles.partyMeta}>
              {isVisitRole
                ? 'Shop visit — GPS and remarks required. Photos optional.'
                : orderThroughPhone
                  ? 'No product. Location is still required.'
                  : 'No product. Location and 1 photo are still required.'}
            </Text>
          </View>
          <Switch
            value={visit}
            onValueChange={onVisitChange}
            trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Visit"
          />
        </View>
        {!dateReady ? (
          <Text style={styles.hint}>Order date is loading. Tap refresh if it stays empty.</Text>
        ) : !locationReady ? (
          <Text style={styles.hint}>Capture GPS first. Location is required for visit and sale order.</Text>
        ) : !photosReady ? (
          <Text style={styles.hint}>Take at least 1 photo, or turn on Order through phone.</Text>
        ) : !remarksReady ? (
          <Text style={styles.hint}>Enter remarks before saving this visit.</Text>
        ) : !visit && !hasProduct ? (
          <Text style={styles.hint}>
            {isVisitRole
              ? 'Keep Visit on to save this shop visit.'
              : 'Add a product, or turn Visit on to save without products.'}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[styles.save, (!orderReady || saving) && styles.saveOff]}
          onPress={() => void saveLocally()}
          disabled={!orderReady || saving}
        >
          <Text style={styles.saveText}>
            {orderId ? 'Save changes' : isVisitRole ? 'Save visit' : 'Save on this phone'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={pickerFor !== null} animationType="slide" transparent onRequestClose={() => setPickerFor(null)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
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
                renderItem={({ item }) => {
                  const stockQty = Number(item.TotalQuantity);
                  const meta = [
                    item.mastercode || item.code || '—',
                    `TP ${money(Number(item.TPSale) || 0)}`,
                  ];
                  if (snd && Number.isFinite(stockQty)) {
                    meta.push(`Stock ${stockQty.toLocaleString()}`);
                  }
                  return (
                    <TouchableOpacity style={styles.productRow} onPress={() => chooseProduct(item)}>
                      <Text style={styles.productName}>{item.ProductName}</Text>
                      <Text style={styles.productMeta}>{meta.join(' · ')}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {cameraModal}
    </View>
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dateInput: {
    flex: 1,
    marginBottom: 0,
  },
  dateRetry: {
    width: 44,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateError: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
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
  locationLocked: {
    marginTop: 4,
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  lockedBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
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
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
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
