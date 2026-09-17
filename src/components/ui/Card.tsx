import { StyleSheet, View, ViewProps } from 'react-native';

import { lightTheme } from '@/theme';

export function Card({ style, children, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: lightTheme.spacing.md,
    borderRadius: lightTheme.radius.md,
    backgroundColor: lightTheme.colors.surface,
  },
});
