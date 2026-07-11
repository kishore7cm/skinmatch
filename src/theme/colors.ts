// Single source of truth for color across the app. Import from here rather
// than hardcoding hex values — every screen should pull tokens from this file.
export const colors = {
  paper: '#FAF7F2',       // page background
  surface: '#FFFFFF',     // card background — sits on paper, distinguished only by a thin border, not a shadow
  ink: '#1E2422',         // primary text
  inkSoft: '#5B655F',     // secondary text
  line: '#DED7C9',        // borders / dividers

  sage: '#3D5A50',        // primary action / positive
  sageSoft: '#E4EBE6',    // light sage background

  clay: '#C9694F',        // warnings / negative
  claySoft: '#F3E1D8',    // light clay background

  gold: '#B7913A',        // manual/user-chosen indicator
  goldSoft: '#F4EBD3',    // light gold background

  // Dupe-score tiers — semantic, not the same as the accent colors above
  scoreHigh: '#3D7A5A',   // ≥ 70
  scoreMid: '#B7913A',    // 40–69
  scoreLow: '#B84A3E',    // < 40
} as const;

export function scoreColor(score: number): string {
  if (score >= 70) return colors.scoreHigh;
  if (score >= 40) return colors.scoreMid;
  return colors.scoreLow;
}

// Light background tint to pair with scoreColor() for pills/badges.
export function scoreBgColor(score: number): string {
  if (score >= 70) return colors.sageSoft;
  if (score >= 40) return colors.goldSoft;
  return colors.claySoft;
}
