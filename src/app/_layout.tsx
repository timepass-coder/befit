import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';

import { useDatabase } from '@/database';
import { AppShell } from '@/components/layout';
import { darkTheme, lightTheme } from '@/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { status, error, retry } = useDatabase();

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const isDark = colorScheme === 'dark';

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AppShell>
        {status === 'initializing' ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
              Starting local database…
            </Text>
          </View>
        ) : status === 'error' ? (
          <View style={styles.center}>
            <Text style={[styles.message, { color: theme.colors.error }]}>
              Unable to initialize the local database.
            </Text>
            {error ? (
              <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>
                {error.message}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={retry}
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: theme.colors.primary },
                pressed && styles.retryButtonPressed,
              ]}
            >
              <Text style={[styles.retryLabel, { color: theme.colors.onPrimary }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : (
          <Slot />
        )}
      </AppShell>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: lightTheme.spacing.lg,
  },

  message: {
    fontSize: 16,
    textAlign: 'center',
  },

  detail: {
    fontSize: 13,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: lightTheme.spacing.sm,
    paddingHorizontal: lightTheme.spacing.lg,
    paddingVertical: lightTheme.spacing.sm,
    borderRadius: lightTheme.radius.md,
  },

  retryButtonPressed: {
    opacity: 0.8,
  },

  retryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});