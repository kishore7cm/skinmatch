import { colors } from './colors';

export const radii = {
  card: 18,
};

export const spacing = {
  cardPadding: 16,
  cardGap: 12,
};

export const borders = {
  card: 1,
  manualOverride: 1.5, // the one intentional exception — gold border on manually-reported/overridden data
};

// Base card look — flat, bordered, no shadow/elevation. Spread this into a
// screen's own card style rather than re-declaring radius/border/padding.
export const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: radii.card,
  borderWidth: borders.card,
  borderColor: colors.line,
  padding: spacing.cardPadding,
};

// The one intentional card variant: manual/user-overridden data (e.g. a
// reported price) gets a gold border instead of the standard line border.
// Not a starting point for further one-off card variants.
export const manualOverrideCardStyle = {
  ...cardStyle,
  borderWidth: borders.manualOverride,
  borderColor: colors.gold,
};
