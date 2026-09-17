import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { lightTheme } from '@/theme';

export function Header() {
  return (
    <View style={styles.header}>
      <Text variant="heading" style={styles.title}>
        BeFit
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: lightTheme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: lightTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.border,
  },

  title: {
    color: lightTheme.colors.primary,
  },
});
