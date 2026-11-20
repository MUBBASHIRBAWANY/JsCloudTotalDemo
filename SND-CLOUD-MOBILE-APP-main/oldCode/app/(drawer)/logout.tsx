import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { removeSaleOrder } from '../../Redux/Reducer/SaleOrderReducer';
import type { RootState } from '../../Redux/Store/types';
import { postPendingOrder } from '../../src/distributorSaleOrder';
import { theme, ui } from '../../src/theme';
import { useLoginUser, type Row } from '../../src/useLoginUser';

const LogoutScreen = () => {
  const { dispatch, loginVendor, distributorId, orderBookerId } = useLoginUser();
  const pendingOrders = useSelector((state: RootState) => state.SalesOrder.SalesOrder) as Row[];
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (loginVendor && pendingOrders.length > 0) {
        for (const order of pendingOrders) {
          await postPendingOrder(order, { distributorId, orderBookerId });
          if (order.id) dispatch(removeSaleOrder(order.id));
        }
      }
      await AsyncStorage.removeItem('OrderBookerToken');
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Logout', 'Orders could not be sent, so you are still signed in.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather name="log-out" size={26} color={theme.colors.danger} />
        </View>
        <Text style={styles.title}>Sign out</Text>
        <Text style={styles.subtitle}>
          {pendingOrders.length > 0
            ? `${pendingOrders.length} pending sales order${pendingOrders.length === 1 ? '' : 's'} will be sent before this phone is signed out.`
            : 'You will leave this phone signed out. Saved distributors and products stay on the device.'}
        </Text>
        <TouchableOpacity
          style={[styles.button, loggingOut && ui.disabled]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 22,
  },
  button: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default LogoutScreen;
