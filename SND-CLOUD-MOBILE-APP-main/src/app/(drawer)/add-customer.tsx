import { getDataFundtion } from '@/api/CurdFunctions';
import { getDataFundtion as getSndData } from '@/api/SNDCurdFunctions';
import { theme, ui } from '@/constants/app-theme';
import { asList, textOf, useLoginUser, type Row } from '@/hooks/useLoginUser';
import {
  cloudDefaults,
  cloudPayload,
  cloudSections,
  customerValidation,
  formatCnic,
  localCustomerId,
  sndDefaults,
  sndPayload,
  sndSections,
  STATUS_OPTIONS,
  TRANSPORT_OPTIONS,
  TYPE_OPTIONS,
  type CustomerField,
  type CustomerFieldErrors,
  type CustomerOption,
  type CustomerValues,
  type LoginServer,
} from '@/lib/customerForm';
import { fetchDistributor } from '@/redux/Reducer/shopsReducer';
import type { RootState } from '@/redux/Store/types';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ScrollViewInstance,
  type ViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { KeyboardSafeScrollView } from '@/components/KeyboardSafeScrollView';
import { useAppPopup } from '@/components/ui/AppPopup';

const optionFrom = (row: Row, labelKeys: string[]): CustomerOption | null => {
  const value = String(row._id || '');
  if (!value) return null;
  return { value, label: textOf(row, labelKeys, value) };
};

/** GET /City returns { status, data: [{ _id, code, CityName, Region }] }. The saved value is _id. */
const cityOptionsFrom = (payload: unknown): CustomerOption[] => {
  const body = payload && typeof payload === 'object' ? payload as { data?: unknown } : null;
  const rows = Array.isArray(body?.data) ? body.data : asList(payload);
  return rows.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Row;
    const value = typeof row._id === 'string' ? row._id : '';
    const name = typeof row.CityName === 'string' ? row.CityName.trim() : '';
    if (!value || !name) return [];
    const code = typeof row.code === 'string' ? row.code.trim() : '';
    return [{ value, label: code ? `${name}  ${code}` : name }];
  });
};

const AddCustomer = () => {
  const popup = useAppPopup();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const contentRef = useRef<ViewInstance>(null);
  const fieldRefs = useRef<Record<string, ViewInstance | null>>({});
  const { dispatch, loginVendor, loginServer, distributorId, orderBookerId } = useLoginUser();
  const distributors = useSelector((state: RootState) => state.distributors.Distributor) as Row[];
  const server: LoginServer = loginServer === 'snd' ? 'snd' : 'cloud';
  const [appliedServer, setAppliedServer] = useState<LoginServer | null>(loginServer);
  const [values, setValues] = useState<CustomerValues>(() => (
    loginServer === 'snd' ? sndDefaults() : cloudDefaults()
  ));
  const [orderBookers, setOrderBookers] = useState<CustomerOption[]>([]);
  const [cities, setCities] = useState<CustomerOption[]>([]);
  const [transporters, setTransporters] = useState<CustomerOption[]>([]);
  const [lookupNote, setLookupNote] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  if (loginServer && appliedServer !== loginServer) {
    setAppliedServer(loginServer);
    setValues(loginServer === 'snd' ? sndDefaults() : cloudDefaults());
    setFieldErrors({});
    setError('');
  }

  useEffect(() => {
    if (!loginServer) return undefined;
    let active = true;
    const toOptions = (payload: unknown, labelKeys: string[]) =>
      asList(payload)
        .map((row) => optionFrom(row, labelKeys))
        .filter((row): row is CustomerOption => Boolean(row));
    const load = async () => {
      const missed: string[] = [];
      const remember = async (label: string, task: () => Promise<void>) => {
        try {
          await task();
        } catch {
          missed.push(label);
        }
      };
      if (loginServer === 'snd') {
        await remember('Order booker', async () => {
          const endpoint = distributorId
            ? `/OrderBooker/OrderByvendor/${distributorId}`
            : '/OrderBooker';
          const rows = toOptions(await getSndData(endpoint), ['OrderBookerName', 'firstname']);
          if (active) setOrderBookers(rows);
        });
      } else {
        await Promise.all([
          remember('City', async () => {
            const rows = cityOptionsFrom(await getDataFundtion('/City'));
            if (active) setCities(rows);
          }),
        ]);
      }
      if (active) {
        setLookupNote(missed.length > 0 ? `${missed.join(', ')} could not load. The other fields can still be filled.` : '');
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [distributorId, loginServer]);

  const bookerOptions = useMemo(() => {
    if (!orderBookerId || orderBookers.some((item) => item.value === orderBookerId)) return orderBookers;
    const name = loginVendor?.OrderBookerName?.trim() || loginVendor?.firstname?.trim() || 'This order booker';
    return [{ value: orderBookerId, label: name }, ...orderBookers];
  }, [loginVendor?.OrderBookerName, loginVendor?.firstname, orderBookerId, orderBookers]);

  const sections = server === 'snd' ? sndSections : cloudSections;
  const optionsFor = (field: CustomerField): CustomerOption[] => {
    if (field.optionsKey === 'orderBookers') return bookerOptions;
    if (field.optionsKey === 'cities') return cities;
    if (field.optionsKey === 'transporters') return transporters;
    if (field.optionsKey === 'types') return TYPE_OPTIONS;
    if (field.optionsKey === 'transportTypes') return TRANSPORT_OPTIONS;
    if (field.optionsKey === 'activeStatus') return STATUS_OPTIONS;
    return [];
  };

  const pickerField = sections
    .flatMap((section) => section.fields)
    .find((field) => field.key === pickerKey) || null;
  const pickerOptions = pickerField
    ? optionsFor(pickerField).filter((item) => item.label.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
    : [];

  const resetForm = () => {
    setValues(server === 'snd' ? sndDefaults() : cloudDefaults());
    setError('');
    setFieldErrors({});
  };

  const formValues = values.OrderBooker || !orderBookerId
    ? values
    : { ...values, OrderBooker: orderBookerId };

  const scrollToField = (key: string) => {
    const field = fieldRefs.current[key];
    const content = contentRef.current;
    const scroll = scrollRef.current;
    if (!field || !content || !scroll) {
      scroll?.scrollToEnd({ animated: true });
      return;
    }
    field.measureLayout(
      content,
      (_x, y) => {
        scroll.scrollTo({ y: Math.max(y - 24, 0), animated: true });
      },
      () => {
        scroll.scrollToEnd({ animated: true });
      },
    );
  };

  const save = async () => {
    if (saving) return;
    const problem = customerValidation(server, formValues, distributorId);
    if (problem.message) {
      setFieldErrors(problem.fields);
      setError(problem.message);
      requestAnimationFrame(() => {
        if (problem.firstKey) scrollToField(problem.firstKey);
        else scrollRef.current?.scrollToEnd({ animated: true });
      });
      return;
    }

    setSaving(true);
    try {
      const payload = server === 'snd'
        ? sndPayload(formValues, { code: '', distributorId, orderBookerId })
        : cloudPayload(formValues);
      const name = (
        payload.DistrbutorName
        || payload.CustomorName
        || 'Customer'
      ).trim();
      const row: Row = {
        ...payload,
        _id: localCustomerId(),
        pendingCustomer: true,
        loginServer: server,
        sumAging: 0,
      };
      // Let the loader paint before Redux work.
      await new Promise((resolve) => setTimeout(resolve, 250));
      dispatch(fetchDistributor([row, ...distributors]));
      resetForm();
      setSaving(false);
      popup.success(
        'Customer saved',
        `${name} is saved on this phone. Send pending from Sync Data when you are ready.`,
        () => router.replace('/home'),
      );
    } catch (saveError) {
      setSaving(false);
      popup.error('Save failed', 'Customer could not be saved. Please try again.');
    }
  };

  const clearFieldError = (key: string) => {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (error) setError('');
  };

  const setField = (field: CustomerField, text: string) => {
    const next = field.input === 'cnic' ? formatCnic(text) : text;
    setValues((current) => ({ ...current, [field.key]: next }));
    clearFieldError(field.key);
  };

  if (!loginServer) {
    return (
      <View style={styles.waiting}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardSafeScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
      >
        <View ref={contentRef} collapsable={false}>
        <Text style={ui.lead}>
          This customer stays on this phone until you send pending data. You can take their order only after that send. NIC is required.
        </Text>
        {lookupNote ? <Text style={styles.note}>{lookupNote}</Text> : null}
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={ui.sectionTitle}>{section.title}</Text>
            {section.fields.filter((field) => !field.when || field.when(values)).map((field) => {
              const fieldError = fieldErrors[field.key] || '';
              if (field.input === 'select') {
                const selected = optionsFor(field).find((item) => item.value === formValues[field.key]);
                return (
                  <View
                    key={field.key}
                    style={styles.field}
                    collapsable={false}
                    ref={(node) => {
                      fieldRefs.current[field.key] = node;
                    }}
                  >
                    <Text style={styles.label}>
                      {field.label}
                      {field.required ? <Text style={styles.star}> *</Text> : null}
                    </Text>
                    <TouchableOpacity
                      style={[styles.select, fieldError ? styles.inputError : null]}
                      onPress={() => {
                        setPickerQuery('');
                        setPickerKey(field.key);
                      }}
                    >
                      <Text style={selected ? styles.selectValue : styles.placeholder} numberOfLines={1}>
                        {selected?.label || 'Select'}
                      </Text>
                    </TouchableOpacity>
                    {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}
                  </View>
                );
              }
              return (
                <View
                  key={field.key}
                  style={styles.field}
                  collapsable={false}
                  ref={(node) => {
                    fieldRefs.current[field.key] = node;
                  }}
                >
                  <Text style={styles.label}>
                    {field.label}
                    {field.required ? <Text style={styles.star}> *</Text> : null}
                  </Text>
                  <TextInput
                    style={[styles.input, fieldError ? styles.inputError : null]}
                    value={formValues[field.key] || ''}
                    onChangeText={(text) => setField(field, text)}
                    autoCapitalize={field.input === 'email' || field.key === 'WebSite' ? 'none' : 'sentences'}
                    autoCorrect={false}
                    keyboardType={
                      field.input === 'email' ? 'email-address'
                        : field.input === 'phone' || field.input === 'cnic' || field.input === 'number' ? 'phone-pad'
                          : 'default'
                    }
                    secureTextEntry={field.key === 'Password'}
                    maxLength={field.input === 'cnic' ? 15 : undefined}
                    placeholder={field.input === 'cnic' ? '42301-68438451-1' : field.input === 'date' ? 'YYYY-MM-DD' : ''}
                    placeholderTextColor={theme.colors.muted}
                  />
                  {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}
        {error ? (
          <View
            style={styles.bottomError}
            collapsable={false}
            ref={(node) => {
              fieldRefs.current.__bottomError = node;
            }}
          >
            <Text style={styles.bottomErrorTitle}>Fix these errors</Text>
            <Text style={styles.bottomErrorText}>{error}</Text>
            {Object.entries(fieldErrors).map(([key, message]) => (
              <TouchableOpacity key={key} onPress={() => scrollToField(key)}>
                <Text style={styles.bottomErrorItem}>• {message}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        </View>
      </KeyboardSafeScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[ui.primaryButton, saving && ui.disabled]}
          onPress={() => void save()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={ui.primaryButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      <Modal visible={saving} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderTitle}>Saving customer…</Text>
            <Text style={styles.loaderMeta}>Please wait.</Text>
          </View>
        </View>
      </Modal>
      <Modal visible={Boolean(pickerField)} animationType="slide" transparent onRequestClose={() => setPickerKey(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setPickerKey(null)}>
            <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>{pickerField?.label}</Text>
                <TouchableOpacity onPress={() => setPickerKey(null)}>
                  <Text style={styles.close}>Close</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={ui.search}
                value={pickerQuery}
                onChangeText={setPickerQuery}
                placeholder="Search"
                placeholderTextColor={theme.colors.muted}
              />
              <FlatList
                style={styles.optionList}
                data={pickerOptions}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item) => item.value}
                ListEmptyComponent={<Text style={ui.empty}>Nothing to show.</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => {
                      if (!pickerField) return;
                      setValues((current) => ({ ...current, [pickerField.key]: item.value }));
                      clearFieldError(pickerField.key);
                      setPickerKey(null);
                    }}
                  >
                    <Text style={styles.optionText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: ui.screen,
  waiting: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  note: {
    marginBottom: 12,
    color: theme.colors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  star: {
    color: theme.colors.danger,
  },
  input: {
    ...ui.search,
    marginBottom: 0,
  },
  inputError: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  fieldError: {
    marginTop: 6,
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomError: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    padding: 12,
  },
  bottomErrorTitle: {
    color: theme.colors.danger,
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  bottomErrorText: {
    color: theme.colors.danger,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 6,
  },
  bottomErrorItem: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  select: {
    ...ui.search,
    marginBottom: 0,
    justifyContent: 'center',
  },
  selectValue: {
    color: theme.colors.ink,
    fontSize: 15,
  },
  placeholder: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  footer: {
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loaderCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  loaderTitle: {
    marginTop: 16,
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  loaderMeta: {
    marginTop: 8,
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '82%',
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  optionList: {
    flex: 1,
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
  close: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  optionText: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
});

export default AddCustomer;
