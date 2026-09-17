import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { lightTheme } from '@/theme';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text variant="heading" style={styles.title}>
        Profile
      </Text>
      <Text variant="body" style={styles.description}>
        Your profile and application settings will appear here.
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
