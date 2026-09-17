import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
} from 'react-native';

import { lightTheme } from '@/theme';

type AppTextProps = RNTextProps & {
  variant?: 'title' | 'heading' | 'body' | 'small' | 'caption';
};

export function Text({ variant = 'body', style, ...props }: AppTextProps) {
  return <RNText {...props} style={[styles.base, styles[variant], style]} />;
}

const styles = StyleSheet.create({
  base: {
    color: lightTheme.colors.text,
  },

  title: lightTheme.typography.title,

  heading: lightTheme.typography.heading,

  body: lightTheme.typography.body,

  small: lightTheme.typography.bodySmall,

  caption: lightTheme.typography.caption,
});
