import { fetchProduct } from '@/Redux/Reducer/ProductReducers';
import { fetchDistributor } from '@/Redux/Reducer/shopsReducer';
import { fetchUsers } from '@/Redux/Reducer/userReduser';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch } from 'react-redux';
import Cookies from 'universal-cookie';
import { createDataFunction } from '../src/Api/CurdFunctions';
import { shadow, theme } from '../src/theme';
import { asList, type LoginUser } from '../src/useLoginUser';


const Login = () => {
  const [Id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const dispatch = useDispatch()
  const handleLogin = async () => {

    try {
      if (!Id || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      setIsLoading(true);
      const res = await createDataFunction("/DitriButorOrderBooker/login2", { firstname: Id, password });
      const nested = res?.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : null;
      const loginBody = {
        token: res?.token ?? nested?.token,
        user: res?.user ?? nested?.user,
        distributors: res?.distributors ?? nested?.distributors,
        products: res?.products ?? nested?.products,
      } as {
        token?: unknown;
        user?: LoginUser;
        distributors?: unknown;
        products?: unknown;
      };
      const token = typeof loginBody.token === 'string' ? loginBody.token : '';
      const distributors = asList(loginBody.distributors);
      const products = asList(loginBody.products);
      const rawUser = loginBody.user && typeof loginBody.user === 'object' && loginBody.user._id
        ? loginBody.user
        : null;

      if (token) {
        await AsyncStorage.setItem('OrderBookerToken', token);
      }
      if (rawUser?._id) {
        dispatch(fetchUsers({
          ...rawUser,
          Distributor: rawUser.Distributor || rawUser.distributor || distributors[0]?._id || '',
        }));
      }
      if (distributors.length > 0) {
        dispatch(fetchDistributor(distributors));
      }
      if (products.length > 0) {
        dispatch(fetchProduct(products));
      }
      const saved = [
        distributors.length > 0 ? `${distributors.length} distributor${distributors.length === 1 ? '' : 's'}` : '',
        products.length > 0 ? `${products.length} products` : '',
      ].filter(Boolean);
      router.replace('/home');
      setTimeout(() => {
        setIsLoading(false);
        Alert.alert(
          'Success',
          saved.length > 0
            ? `Logged in. ${saved.join(' and ')} saved on this phone.`
            : 'Logged in successfully!',
        );
      }, 1500);
    }
    catch (error) {
      setIsLoading(false);
      Alert.alert('Login Failed', 'Invalid ID or Password');
      console.error('Login error:', error);
    }

  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'please contact to administrator.');
  };
  const valideUser = async () => {
    const cookies = new Cookies();
    const Token = await AsyncStorage.getItem('OrderBookerToken');
    try {
      if (Token) {
        const response = await createDataFunction('/users/profile', { authorization: Token });
console.log(response)

        if (response?.data?.val) {
          dispatch(fetchUsers(response.data.val));
        }

        router.replace('/home');
      }


    } catch (err) {
      Alert.alert('Session Expired', 'Please log in again.');
    }
  }

  useEffect(() => {
    valideUser()
  }, [])
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <Text style={styles.appName}>JSERP</Text>
            <Text style={styles.tagline}>Field sales and attendance</Text>
          </LinearGradient>

          <View style={styles.formContainer}>
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
        </ScrollView>
      </KeyboardAvoidingView>
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
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.2,
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