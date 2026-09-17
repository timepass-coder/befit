import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { lightTheme } from '@/theme';

const DESKTOP_BREAKPOINT = 768;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.contentWrapper}>
        {isDesktop && <Sidebar />}
        <View
          style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}
        >
          {children}
        </View>
      </View>
      {!isDesktop && <BottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },

  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },

  mainContent: {
    flex: 1,
    padding: lightTheme.spacing.md,
    overflow: 'hidden',
  },

  mainContentDesktop: {
    padding: lightTheme.spacing.lg,
  },
});
