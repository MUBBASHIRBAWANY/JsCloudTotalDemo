import { Feather } from '@expo/vector-icons';
import { Redirect, useSegments } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useMemo } from 'react';
import { type ColorValue } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';

import { BrandSplash } from '@/components/BrandSplash';
import { DrawerPanel } from '@/components/ui/DrawerPanel';
import { theme } from '@/constants/app-theme';
import { isTsmRole, isZsmRole, roleHomePath, useLoginUser } from '@/hooks/useLoginUser';
import { persistor } from '@/redux/Store/store';

export const unstable_settings = {
  anchor: 'home',
};

/** Order-booker entry screens — TSM / ZSM must never stay here. */
const MANAGER_BLOCKED_ROUTES = new Set(['home', 'add-customer']);

function DrawerIcon({
  name,
  color,
  size,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: ColorValue;
  size: number;
}) {
  return (
    <Feather name={name} color={typeof color === 'string' ? color : theme.colors.muted} size={size} />
  );
}

const icon = (name: React.ComponentProps<typeof Feather>['name']) =>
  function Icon({ color, size }: { color: ColorValue; size: number }) {
    return <DrawerIcon name={name} color={color} size={size} />;
  };

function RoleRedirect() {
  const segments = useSegments();
  const { loginRole, loginVendor } = useLoginUser();
  const role = loginRole || loginVendor?.loginRole;
  const isTsm = isTsmRole(role);
  const isZsm = isZsmRole(role);
  const canSeeReport = isTsm || isZsm;
  const screen = useMemo(() => {
    const parts = segments as string[];
    return parts[parts.length - 1] || '';
  }, [segments]);

  if (!role) return null;
  if ((isTsm || isZsm) && MANAGER_BLOCKED_ROUTES.has(screen)) {
    return <Redirect href={roleHomePath(role)} />;
  }
  if (!isTsm && screen === 'tsm-home') {
    return <Redirect href={roleHomePath(role)} />;
  }
  if (!isZsm && screen === 'zsm-home') {
    return <Redirect href={roleHomePath(role)} />;
  }
  if (!canSeeReport && screen === 'report') {
    return <Redirect href={roleHomePath(role)} />;
  }
  return null;
}

const RoleDrawer = () => {
  const { loginRole, loginVendor } = useLoginUser();
  const role = loginRole || loginVendor?.loginRole;
  const isTsm = isTsmRole(role);
  const isZsm = isZsmRole(role);
  const canSeeReport = isTsm || isZsm;
  const isManager = isTsm || isZsm;
  const initialRouteName = isTsm ? 'tsm-home' : isZsm ? 'zsm-home' : 'home';

  return (
    <>
      <RoleRedirect />
      <Drawer
        initialRouteName={initialRouteName}
        drawerContent={(props) => <DrawerPanel {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.primaryDark },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerShadowVisible: false,
          headerTitleAlign: 'left',
          sceneStyle: { backgroundColor: theme.colors.background },
          drawerActiveTintColor: theme.colors.primary,
          drawerInactiveTintColor: theme.colors.muted,
          drawerActiveBackgroundColor: theme.colors.primarySoft,
          drawerLabelStyle: { fontSize: 15, fontWeight: '600', marginLeft: -8 },
          drawerItemStyle: { borderRadius: 12, marginHorizontal: 12, marginVertical: 2 },
          drawerStyle: { width: 292, backgroundColor: theme.colors.card },
        }}
      >
        <Drawer.Protected guard={!isManager} redirectTo={roleHomePath(role)}>
          <Drawer.Screen
            name="home"
            options={{
              drawerLabel: 'Home',
              title: 'Home',
              drawerIcon: icon('home'),
            }}
          />
          <Drawer.Screen
            name="add-customer"
            options={{
              drawerLabel: 'Add Customer',
              title: 'Add Customer',
              drawerIcon: icon('user-plus'),
            }}
          />
        </Drawer.Protected>

        <Drawer.Protected guard={isTsm} redirectTo={roleHomePath(role)}>
          <Drawer.Screen
            name="tsm-home"
            options={{
              drawerLabel: 'TSM Home',
              title: 'TSM Dashboard',
              drawerIcon: icon('layers'),
            }}
          />
        </Drawer.Protected>

        <Drawer.Protected guard={isZsm} redirectTo={roleHomePath(role)}>
          <Drawer.Screen
            name="zsm-home"
            options={{
              drawerLabel: 'ZSM Home',
              title: 'ZSM Dashboard',
              drawerIcon: icon('git-branch'),
            }}
          />
        </Drawer.Protected>

        <Drawer.Protected guard={canSeeReport} redirectTo={roleHomePath(role)}>
          <Drawer.Screen
            name="report"
            options={{
              drawerLabel: 'Report',
              title: 'Report',
              drawerIcon: icon('bar-chart-2'),
            }}
          />
        </Drawer.Protected>

        <Drawer.Screen
          name="sales-order"
          options={{
            drawerLabel: 'Sync Data',
            title: 'Sync Data',
            drawerIcon: icon('refresh-cw'),
          }}
        />
        <Drawer.Screen
          name="distributor-sale-order"
          options={{
            title: 'Distributor Sale Order',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="day-summary"
          options={{
            drawerLabel: 'Day Summary',
            title: 'Day Summary',
            drawerIcon: icon('clipboard'),
          }}
        />
        <Drawer.Screen
          name="attendance"
          options={{
            drawerLabel: 'Attendance',
            title: 'Attendance',
            drawerIcon: icon('clock'),
          }}
        />
        <Drawer.Screen
          name="change-password"
          options={{
            drawerLabel: 'Change Password',
            title: 'Change Password',
            drawerIcon: icon('lock'),
          }}
        />
        <Drawer.Screen
          name="logout"
          options={{
            drawerLabel: 'Logout',
            title: 'Logout',
            drawerIcon: icon('log-out'),
          }}
        />
      </Drawer>
    </>
  );
};

const Layout = () => {
  return (
    <PersistGate loading={<BrandSplash animate={false} />} persistor={persistor}>
      <RoleDrawer />
    </PersistGate>
  );
};

export default Layout;
