import { Feather } from '@expo/vector-icons';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useLoginUser } from '../useLoginUser';

export function DrawerPanel(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { loginVendor } = useLoginUser();
  const name = loginVendor?.firstname?.trim() || 'Order booker';

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
        <Text style={styles.role}>Field operations</Text>
      </LinearGradient>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.list}>
        <DrawerItemList {...props} />
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
