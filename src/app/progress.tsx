import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { lightTheme } from '@/theme';

export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text variant="heading" style={styles.title}>
        Progress
      </Text>
      <Text variant="body" style={styles.description}>
        Your workout and fitness progress will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: lightTheme.spacing.md,
  },

  title: {
    color: lightTheme.colors.text,
  },

  description: {
    color: lightTheme.colors.textSecondary,
  },
});
