import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
  type DrawerContentComponentProps,
} from 'expo-router/drawer';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/app-theme';
import { isTsmRole, isZsmRole, readMustChangePassword, useLoginUser } from '@/hooks/useLoginUser';

const drawerVisibleForRole = (
  routeName: string,
  isTsm: boolean,
  isZsm: boolean,
  canSeeReport: boolean,
) => {
  if (routeName === 'report') return canSeeReport;
  if (routeName === 'tsm-home') return isTsm;
  if (routeName === 'zsm-home') return isZsm;
  if (isTsm || isZsm) {
    // Managers never see order-booker entry points.
    return routeName !== 'home' && routeName !== 'add-customer';
  }
  return true;
};

export function DrawerPanel(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { loginVendor, loginRole } = useLoginUser();
  const role = loginRole || loginVendor?.loginRole;
  const isTsm = isTsmRole(role);
  const isZsm = isZsmRole(role);
  const canSeeReport = isTsm || isZsm;
  const name =
    loginVendor?.OrderBookerName?.trim()
    || loginVendor?.firstname?.trim()
    || (isTsm ? 'TSM' : isZsm ? 'ZSM' : 'Order booker');
  const roleLabel = isTsm ? 'TSM' : isZsm ? 'ZSM' : String(role || 'orderbooker');
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    let active = true;
    void readMustChangePassword().then((must) => {
      if (active) setMustChangePassword(must);
    });
    return () => {
      active = false;
    };
  }, [props.state.index]);

  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.primary]}
        style={[styles.header, { paddingTop: insets.top + 22 }]}
      >
        <View style={styles.mark}>
          <Feather name="briefcase" size={20} color="#fff" />
        </View>
        <Text style={styles.brand}>JSERP</Text>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.role}>
          {mustChangePassword ? 'Password update required' : roleLabel.toUpperCase()}
        </Text>
      </LinearGradient>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.list}>
        {mustChangePassword ? (
          <DrawerItem
            label="Change Password"
            icon={({ color, size }) => <Feather name="lock" color={color} size={size} />}
            focused={props.state.routes[props.state.index]?.name === 'change-password'}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.muted}
            activeBackgroundColor={theme.colors.primarySoft}
            labelStyle={{ fontSize: 15, fontWeight: '600', marginLeft: -8 }}
            style={{ borderRadius: 12, marginHorizontal: 12, marginVertical: 2 }}
            onPress={() => props.navigation.navigate('change-password', { force: '1' })}
          />
        ) : (
          <DrawerItemList
            {...props}
            state={{
              ...props.state,
              routes: props.state.routes.filter((route) =>
                drawerVisibleForRole(route.name, isTsm, isZsm, canSeeReport),
              ),
              // Keep focused index valid after filtering.
              index: Math.max(
                0,
                props.state.routes
                  .filter((route) => drawerVisibleForRole(route.name, isTsm, isZsm, canSeeReport))
                  .findIndex((route) => route.key === props.state.routes[props.state.index]?.key),
              ),
            }}
          />
        )}
      </DrawerContentScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: theme.colors.card,
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  mark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brand: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  name: {
    marginTop: 4,
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  role: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  list: {
    paddingTop: 12,
  },
});
