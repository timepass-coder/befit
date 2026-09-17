import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

import { Text } from '@/components/ui';
import { lightTheme } from '@/theme';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/workouts', label: 'Workouts' },
  { href: '/progress', label: 'Progress' },
  { href: '/profile', label: 'Profile' },
] as const;

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.sidebar} role="navigation" aria-label="Main navigation">
      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [
                styles.navItem,
                isActive && styles.navItemActive,
                pressed && styles.navItemPressed,
              ]}
              role="menuitem"
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                variant="body"
                style={[
                  styles.navItemText,
                  isActive && styles.navItemTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    height: '100%',
    backgroundColor: lightTheme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: lightTheme.colors.border,
    paddingTop: lightTheme.spacing.lg,
    paddingBottom: lightTheme.spacing.lg,
  },

  navList: {
    gap: lightTheme.spacing.xs,
    paddingHorizontal: lightTheme.spacing.md,
  },

  navItem: {
    paddingVertical: lightTheme.spacing.md,
    paddingHorizontal: lightTheme.spacing.md,
    borderRadius: lightTheme.radius.md,
  },

  navItemActive: {
    backgroundColor: lightTheme.colors.primary,
  },

  navItemPressed: {
    opacity: 0.8,
  },

  navItemText: {
    color: lightTheme.colors.text,
  },

  navItemTextActive: {
    color: lightTheme.colors.onPrimary,
    fontWeight: '600',
  },
});
