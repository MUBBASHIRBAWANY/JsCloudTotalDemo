import { persistor } from '@/Redux/Store/store';
import { Feather } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { PersistGate } from 'redux-persist/integration/react';
import { DrawerPanel } from '../../src/ui/DrawerPanel';
import { theme } from '../../src/theme';

const icon =
  (name: React.ComponentProps<typeof Feather>['name']) =>
  ({ color, size }: { color: string; size: number }) =>
    <Feather name={name} color={color} size={size} />;

const Layout = () => {
  return (
    <PersistGate loading={null} persistor={persistor}>
      <Drawer
        initialRouteName="home"
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
        <Drawer.Screen
          name="home"
          options={{
            drawerLabel: 'Home',
            title: 'Home',
            drawerIcon: icon('home'),
          }}
        />
        <Drawer.Screen
          name="sales-order"
          options={{
            drawerLabel: 'Sales Order',
            title: 'Sales Order',
            drawerIcon: icon('file-text'),
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
          name="attendance"
          options={{
            drawerLabel: 'Attendance',
            title: 'Attendance',
            drawerIcon: icon('clock'),
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
    </PersistGate>
  );
};

export default Layout;
