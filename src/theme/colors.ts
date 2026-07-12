// Theme system: three named token sets rather than one fixed palette.
// Every screen should pull colors from useTheme() (see ThemeContext.tsx),
// not from a static import — colors are resolved at render time so
// switching themes updates the whole app without a restart.

export type ColorTokens = {
  paper: string;       // page background
  surface: string;     // card background
  ink: string;          // primary text
  inkSoft: string;      // secondary text
  line: string;          // borders / dividers

  sage: string;         // primary action / positive
  sageSoft: string;      // light primary background

  clay: string;          // warnings / negative (comedogenic, "avoid", low score)
  claySoft: string;

  gold: string;          // manual/user-chosen indicator, mid-tier caution
  goldSoft: string;

  // Dupe-score tiers — semantic, not the same as the accent colors above.
  // Each theme picks its own three hues; they just need to stay
  // distinguishable from each other and from the theme's own accents.
  scoreHigh: string;    // >= 70
  scoreMid: string;     // 40-69
  scoreLow: string;     // < 40
};

export type ThemeName = 'terracotta' | 'sunset' | 'editorial';

export interface Theme {
  name: ThemeName;
  label: string;
  description: string;
  colors: ColorTokens;
  cardRadius: number;
  cardBorderWidth: number;
  // Editorial Paper is built around near-monochrome color, so severity
  // there can't rely on hue alone — components that render flags/warnings
  // check this to add a structural cue (filled vs. outlined, border
  // weight) on top of color.
  structuralSeverity: boolean;
}

const terracotta: Theme = {
  name: 'terracotta',
  label: 'Terracotta & Olive',
  description: 'Warm, earthy, grounded',
  cardRadius: 18,
  cardBorderWidth: 1,
  structuralSeverity: false,
  colors: {
    paper: '#FBF3EA',
    surface: '#FFFFFF',
    ink: '#2E2620',
    inkSoft: '#8A7263',
    line: '#E6D3BE',

    sage: '#6B7A4F',
    sageSoft: '#E8ECDF',

    clay: '#C1613D',
    claySoft: '#F5E1D6',

    gold: '#B7913A',
    goldSoft: '#F2E7C9',

    scoreHigh: '#3F7D52',
    scoreMid: '#D9A441',
    scoreLow: '#A83A2C',
  },
};

const sunset: Theme = {
  name: 'sunset',
  label: 'Sunset',
  description: 'Coral-to-peach, energetic',
  cardRadius: 18,
  cardBorderWidth: 1,
  structuralSeverity: false,
  colors: {
    // Flat fallback for the gradient described in the brief — most of the
    // app uses solid fills; only large hero surfaces (see HomeScreen)
    // render the actual coral-to-peach gradient.
    paper: '#FFF3EA',
    surface: '#FFFFFF',
    ink: '#5C2E1E',
    inkSoft: '#9C6B54',
    line: '#FFD6BE',

    sage: '#FF8A65',
    sageSoft: '#FFE8DC',

    // Deliberately cooler/darker than the coral primary and peach
    // background so warnings never blend into the theme's own warmth.
    clay: '#C4223B',
    claySoft: '#FADADD',

    gold: '#B8722E',
    goldSoft: '#F5DFC2',

    // A cool teal-green for "great match" reads clearly against a warm
    // coral palette in a way a warmer green wouldn't.
    scoreHigh: '#2E7D5B',
    scoreMid: '#D9932E',
    scoreLow: '#B0203A',
  },
};

const editorial: Theme = {
  name: 'editorial',
  label: 'Editorial Paper',
  description: 'Black on cream, hard borders',
  cardRadius: 0,
  cardBorderWidth: 2,
  structuralSeverity: true,
  colors: {
    paper: '#F5F2EA',
    surface: '#F5F2EA',
    ink: '#141210',
    inkSoft: '#5A5650',
    line: '#141210',

    sage: '#141210',
    sageSoft: '#E4E0D4',

    clay: '#7A2020',
    claySoft: '#EDE0DC',

    gold: '#5C4B1E',
    goldSoft: '#E9E2CE',

    scoreHigh: '#2F5C3E',
    scoreMid: '#7A5A1E',
    scoreLow: '#7A2020',
  },
};

export const THEMES: Record<ThemeName, Theme> = {
  terracotta,
  sunset,
  editorial,
};

export const DEFAULT_THEME: ThemeName = 'terracotta';

export function scoreColor(score: number, colors: ColorTokens): string {
  if (score >= 70) return colors.scoreHigh;
  if (score >= 40) return colors.scoreMid;
  return colors.scoreLow;
}

// Light background tint to pair with scoreColor() for pills/badges.
export function scoreBgColor(score: number, colors: ColorTokens): string {
  if (score >= 70) return colors.sageSoft;
  if (score >= 40) return colors.goldSoft;
  return colors.claySoft;
}
