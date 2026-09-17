import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

import { Text } from '@/components/ui';
import { lightTheme } from '@/theme';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/workouts', label: 'Workouts', icon: '💪' },
  { href: '/progress', label: 'Progress', icon: '📊' },
  { href: '/profile', label: 'Profile', icon: '👤' },
] as const;

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View
      style={styles.bottomNav}
      role="navigation"
      aria-label="Main navigation"
    >
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
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text
              variant="caption"
              style={[styles.navItemText, isActive && styles.navItemTextActive]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    height: 80,
    backgroundColor: lightTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.border,
    paddingBottom: lightTheme.spacing.md,
    paddingTop: lightTheme.spacing.sm,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: lightTheme.spacing.xs,
    paddingHorizontal: lightTheme.spacing.sm,
    borderRadius: lightTheme.radius.md,
  },

  navItemActive: {
    backgroundColor: 'transparent',
  },

  navItemPressed: {
    opacity: 0.7,
  },

  iconContainer: {
    marginBottom: 2,
  },

  icon: {
    fontSize: 24,
  },

  navItemText: {
    color: lightTheme.colors.textSecondary,
    fontSize: 11,
  },

  navItemTextActive: {
    color: lightTheme.colors.primary,
    fontWeight: '600',
  },
});
