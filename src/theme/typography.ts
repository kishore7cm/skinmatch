import { Platform } from 'react-native';

// Serif for display/large numbers only — Georgia on iOS, the platform's
// generic serif family on Android (no custom font asset required).
export const fontFamilies = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  // Body/label text intentionally has no fontFamily override — it inherits
  // the existing system sans-serif stack already used across the app.
};

// Named type roles, not raw sizes — every screen should use these rather
// than one-off fontSize/fontWeight pairs. Color is intentionally left out;
// compose with colors.ink / colors.inkSoft at the call site.
export const typography = {
  screenTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  // Large figures — savings, cost totals, streak/score numbers — same
  // family as screenTitle since both are "the big serif number/word" role.
  displayNumber: {
    fontFamily: fontFamilies.serif,
    fontSize: 26,
    fontWeight: '700' as const,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
};
