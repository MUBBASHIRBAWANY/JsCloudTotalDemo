import { createDataFunction } from '@/api/CurdFunctions';
import { createDataFunction as createSndData } from '@/api/SNDCurdFunctions';
import { BrandSplash } from '@/components/BrandSplash';
import { KeyboardSafeScrollView } from '@/components/KeyboardSafeScrollView';
import { appPopup, useAppPopup } from '@/components/ui/AppPopup';
import { shadow, theme } from '@/constants/app-theme';
import {
  asList,
  DEFAULT_OTP_PASSWORD,
  loginDisplayName,
  readMustChangePassword,
  readStoredSession,
  resolveDistributorId,
  roleHomePath,
  saveLoginSession,
  setMustChangePassword,
  type LoginUser,
  type Row,
} from '@/hooks/useLoginUser';
import { isPendingCustomer } from '@/lib/customerForm';
import { fetchProduct } from '@/redux/Reducer/ProductReducers';
import { fetchDistributor } from '@/redux/Reducer/shopsReducer';
import { fetchUsers } from '@/redux/Reducer/userReduser';
import { store } from '@/redux/Store/store';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch } from 'react-redux';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

type LoginServer = 'snd' | 'cloud';
type LoginRole = 'orderbooker' | 'tsm' | 'zsm';
type LoginOptionId = `${LoginServer}-${LoginRole}`;

const LOGIN_OPTIONS: { id: LoginOptionId; server: LoginServer; role: LoginRole; label: string }[] = [
  { id: 'snd-orderbooker', server: 'snd', role: 'orderbooker', label: 'SND' },
  { id: 'cloud-orderbooker', server: 'cloud', role: 'orderbooker', label: 'Cloud' },
  { id: 'snd-tsm', server: 'snd', role: 'tsm', label: 'TSM' },
  { id: 'snd-zsm', server: 'snd', role: 'zsm', label: 'ZSM' },
];

const loginEndpoint = (option: (typeof LOGIN_OPTIONS)[number], id: string, password: string) => {
  const body = { firstname: id.trim(), password };
  if (__DEV__) {
    console.log(`[Login] ${option.label} → ${option.server}/${option.role}`);
  }
  // TSM + ZSM → SND users backend (see LOGIN_OPTIONS).
  if (option.server === 'snd') {
    if (option.role === 'tsm') return createSndData('/users/LoginTsm', body, true);
    if (option.role === 'zsm') return createSndData('/users/LoginZsm', body, true);
    return createSndData('/OrderBooker/OrderBookerLogin3', body, true);
  }
  if (option.role === 'tsm') return createDataFunction('/users/LoginTsm', body, true);
  if (option.role === 'zsm') return createDataFunction('/users/LoginZsm', body, true);
  return createDataFunction('/DitriButorOrderBooker/login4', body, true);
};

const Login = () => {
  const popup = useAppPopup();
  const [Id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const bootActionRef = useRef<(() => void) | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginOption, setLoginOption] = useState<LoginOptionId>('snd-orderbooker');
  const [serverOpen, setServerOpen] = useState(false);
  const dispatch = useDispatch()
  const selectedLogin = LOGIN_OPTIONS.find((item) => item.id === loginOption) ?? LOGIN_OPTIONS[0];
  const server = selectedLogin.server;
  const handleLogin = async () => {

    try {
      if (!Id || !password) {
        popup.error('Error', 'Please fill in all fields');
        return;
      }

      setIsLoading(true);
      const res = await loginEndpoint(selectedLogin, Id, password);
      const nested = res?.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : null;
      const loginBody = {
        token: res?.token ?? nested?.token,
        user: res?.user ?? nested?.user,
        distributors: res?.distributors ?? nested?.distributors,
        products: res?.products ?? nested?.products,
        route: res?.route ?? nested?.route,
        loginRole: res?.loginRole ?? nested?.loginRole,
      } as {
        token?: unknown;
        user?: LoginUser;
        distributors?: unknown;
        products?: unknown;
        route?: unknown;
        loginRole?: unknown;
      };
      const token = typeof loginBody.token === 'string' ? loginBody.token : '';
      const partyPayload = selectedLogin.role === 'orderbooker' && server === 'snd'
        ? res?.customers ?? nested?.customers ?? res?.Customers ?? nested?.Customers ?? loginBody.distributors
        : loginBody.distributors ?? res?.customers ?? nested?.customers;
      const parties = asList(partyPayload);
      const products = asList(loginBody.products);
      const rawUser = loginBody.user && typeof loginBody.user === 'object' && loginBody.user._id
        ? loginBody.user
        : null;
      const partyWord = selectedLogin.role === 'orderbooker' && server === 'snd' ? 'customer' : 'distributor';
      const mustChangePassword =
        password === DEFAULT_OTP_PASSWORD || String(loginBody.route || '').toLowerCase() === 'yes';

      const name = loginDisplayName(rawUser, Id);
      const assignedDistributorId =
        resolveDistributorId(rawUser) || String(parties[0]?._id || '');
      const sessionUser = await saveLoginSession({
        ...(rawUser ?? { _id: '', firstname: name }),
        loginServer: server,
        loginRole: selectedLogin.role,
        OrderBookerName: rawUser?.OrderBookerName?.trim() || name,
        firstname: rawUser?.firstname?.trim() || name,
        Distributor: assignedDistributorId,
        distributor: assignedDistributorId,
        Vendor: rawUser?.Vendor,
      }, token, server);
      dispatch(fetchUsers(sessionUser));
      await setMustChangePassword(mustChangePassword);
      const pending = (store.getState().distributors.Distributor as Row[]).filter((row) => isPendingCustomer(row));
      const serverIds = new Set(parties.map((row) => String(row._id || '')));
      dispatch(fetchDistributor([
        ...pending.filter((row) => !serverIds.has(String(row._id || ''))),
        ...parties,
      ]));
      // SND login always refreshes products (in-stock only). Cloud keeps prior list if empty.
      if (server === 'snd' || products.length > 0) {
        dispatch(fetchProduct(products));
      }

      if (mustChangePassword) {
        setIsLoading(false);
        router.replace({ pathname: '/change-password', params: { force: '1' } });
        return;
      }

      const saved = [
        parties.length > 0 ? `${parties.length} ${partyWord}${parties.length === 1 ? '' : 's'}` : '',
        products.length > 0 ? `${products.length} products` : '',
      ].filter(Boolean);
      router.replace(roleHomePath(selectedLogin.role));
      setTimeout(() => {
        setIsLoading(false);
        popup.success(
          'Success',
          saved.length > 0
            ? `Logged in. ${saved.join(' and ')} saved on this phone.`
            : 'Logged in successfully!',
        );
      }, 1500);
    }
    catch (error) {
      setIsLoading(false);
      const err = error as { message?: string; response?: { data?: unknown } };
      const responseData = err?.response?.data;
      const message =
        typeof responseData === 'string' && responseData.trim()
          ? responseData.trim()
          : (responseData as { message?: string })?.message
          || (typeof err?.message === 'string' && /network|timeout|econnrefused/i.test(err.message)
            ? `Cannot reach server (${selectedLogin.label}). Is the backend running?`
            : err?.message)
          || 'Invalid ID or Password';
      if (__DEV__) console.warn('[Login] failed', selectedLogin.id, err?.message || error);
      popup.error('Login Failed', message);
    }

  };

  const handleForgotPassword = () => {
    popup.info('Forgot Password', 'please contact to administrator.');
  };
  useEffect(() => {
    let active = true;
    const valideUser = async () => {
      try {
        const session = await readStoredSession();
        if (!active) return;
        if (session.status === 'none') {
          bootActionRef.current = () => setCheckingSession(false);
          setSessionReady(true);
          return;
        }
        if (session.status === 'expired') {
          bootActionRef.current = () => {
            setCheckingSession(false);
            appPopup.info('Session Expired', 'Please log in again.');
          };
          setSessionReady(true);
          return;
        }
        if (session.user) dispatch(fetchUsers(session.user));
        if (await readMustChangePassword()) {
          bootActionRef.current = () => {
            setCheckingSession(false);
            router.replace({ pathname: '/change-password', params: { force: '1' } });
          };
          setSessionReady(true);
          return;
        }
        bootActionRef.current = () => {
          setCheckingSession(false);
          router.replace(roleHomePath(session.user?.loginRole));
        };
        setSessionReady(true);
      } catch {
        if (active) {
          bootActionRef.current = () => setCheckingSession(false);
          setSessionReady(true);
        }
      }
    };
    void valideUser();
    return () => {
      active = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!splashDone || !sessionReady) return;
    bootActionRef.current?.();
    bootActionRef.current = null;
  }, [splashDone, sessionReady]);

  // Native splash image + zoom animation, then continue.
  if (checkingSession) {
    return (
      <BrandSplash
        onReady={() => {
          void SplashScreen.hideAsync().catch(() => undefined);
        }}
        onFinished={() => setSplashDone(true)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardSafeScrollView style={styles.keyboardAvoid} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={[theme.colors.primaryDark, theme.colors.primary, '#6D28D9']}
          style={styles.header}
        >
          <View style={styles.logoPlate}>
            <Image
              source={{ uri: 'https://res.cloudinary.com/dmi26itgk/image/upload/v1746526783/ocfvq7hxb3lqrobtlrkp.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>{"Jaffar Son's International"}</Text>
          <Text style={styles.tagline}>Field sales and attendance</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.fieldLabel}>Login as</Text>
          <View style={styles.dropdownWrap}>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setServerOpen((open) => !open)}
              disabled={isLoading}
            >
              <Feather name="server" size={18} color={theme.colors.primary} style={styles.inputIcon} />
              <Text style={styles.dropdownValue}>{selectedLogin.label}</Text>
              <Feather name={serverOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
            </TouchableOpacity>
            {serverOpen ? (
              <ScrollView style={styles.menu} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {LOGIN_OPTIONS.map((item) => {
                  const selected = item.id === loginOption;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.menuItem, selected && styles.menuItemSelected]}
                      onPress={() => {
                        setLoginOption(item.id);
                        setServerOpen(false);
                      }}
                    >
                      <Text style={[styles.menuText, selected && styles.menuTextSelected]}>{item.label}</Text>
                      {selected ? <Feather name="check" size={16} color={theme.colors.primary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Feather name="user" size={18} color={theme.colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your ID"
              placeholderTextColor="#999"
              value={Id}
              onChangeText={setId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color={theme.colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Feather
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={theme.colors.muted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMe}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Feather name="check" size={14} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[theme.colors.primary, '#6D28D9']}
              style={styles.gradientButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>



        </View>
      </KeyboardSafeScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  header: {
    height: 280,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 54,
  },
  logoPlate: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 14,
    ...shadow.card,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  logoImage: {
    width: 148,
    height: 64,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 6,
  },
  formContainer: {
    marginTop: -32,
    marginHorizontal: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...shadow.card,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  fieldLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  dropdownWrap: {
    marginBottom: 14,
    zIndex: 2,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  dropdownValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  menu: {
    maxHeight: 280,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.card,
    overflow: 'hidden',
  },
  menuItem: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemSelected: {
    backgroundColor: theme.colors.primarySoft,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  menuTextSelected: {
    color: theme.colors.primary,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: theme.colors.ink,
  },
  eyeIcon: {
    padding: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
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
  rememberText: {
    color: theme.colors.text,
    fontSize: 13,
  },
  forgotPassword: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 18,
  },
  gradientButton: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
});

export default Login;