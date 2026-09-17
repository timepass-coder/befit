import { colors } from './colors';
import { radius } from './radius';
import { spacing } from './spacing';
import { typography } from './typography';

export const lightTheme = {
  colors: colors.light,
  spacing,
  typography,
  radius,
};

export const darkTheme = {
  colors: colors.dark,
  spacing,
  typography,
  radius,
};

export type AppTheme = typeof lightTheme;
