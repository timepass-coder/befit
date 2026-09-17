import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { lightTheme } from '@/theme';

export default function WorkoutsScreen() {
  return (
    <View style={styles.container}>
      <Text variant="heading" style={styles.title}>
        Workouts
      </Text>
      <Text variant="body" style={styles.description}>
        Your workout programs and sessions will appear here.
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
