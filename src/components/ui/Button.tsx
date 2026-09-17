import { Pressable, StyleSheet, Text } from 'react-native';

import { lightTheme } from '@/theme';

type ButtonProps = {
  title: string;
  onPress?: () => void;
};

export function Button({ title, onPress }: ButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: lightTheme.spacing.md,
    paddingHorizontal: lightTheme.spacing.lg,
    borderRadius: lightTheme.radius.md,
    backgroundColor: lightTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  text: {
    color: lightTheme.colors.onPrimary,
    fontSize: lightTheme.typography.body.fontSize,
    fontWeight: '600',
  },
});
