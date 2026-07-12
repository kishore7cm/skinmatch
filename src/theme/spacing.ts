import { ColorTokens, Theme } from './colors';

export const spacing = {
  cardPadding: 16,
  cardGap: 12,
};

export const borders = {
  manualOverride: 1.5, // the one intentional exception — gold border on manually-reported/overridden data
};

// Base card look — flat, bordered, no shadow/elevation. Spread this into a
// screen's own card style rather than re-declaring radius/border/padding.
// Radius and border weight come from the active theme (Editorial Paper
// wants square corners and a heavier border, not just different colors).
export function getCardStyle(theme: Theme) {
  return {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.cardRadius,
    borderWidth: theme.cardBorderWidth,
    borderColor: theme.colors.line,
    padding: spacing.cardPadding,
  };
}

// The one intentional card variant: manual/user-overridden data (e.g. a
// reported price) gets a gold border instead of the standard line border.
// Not a starting point for further one-off card variants.
export function getManualOverrideCardStyle(theme: Theme) {
  return {
    ...getCardStyle(theme),
    borderWidth: borders.manualOverride,
    borderColor: theme.colors.gold,
  };
}
