/**
 * Match each breakpoint from the Tailwind config to its screen size value.
 * Note: Keep this in sync with the TW breakpoint config.
 * @see https://tailwindcss.com/docs/responsive-design#overview
 */
export const screens = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  "2xl": "96rem",
} as const;

export type Screen = keyof typeof screens;
