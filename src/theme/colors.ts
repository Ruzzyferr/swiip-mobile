/**
 * Premium theme colors for Swiip (Light + Dark support)
 */
export const colors = {
  // Primary colors (updated to match HTML mock)
  primary: "#6C5DD3", // Vibrant purple/indigo
  primaryDark: "#5A4FC0",
  primaryLight: "#818CF8",

  // Secondary/Accent colors (for like button)
  secondary: "#FF5B84", // Pink for like button
  accent: "#FF5B84", // Alias for secondary
  accentDark: "#FF3D6B",
  accentLight: "#FF8FA9",
  
  // Gradient colors
  accentGradientStart: "#FF5B84",
  accentGradientEnd: "#FF8FA9",

  // Background colors (Light mode support)
  background: "#F3F4F6", // Light mode background
  backgroundDark: "#111422", // Dark mode background
  backgroundSecondary: "#FFFFFF", // Light mode card background
  backgroundSecondaryDark: "#1C2033", // Dark mode card background
  backgroundTertiary: "#F9FAFB",

  // Surface colors
  surface: "#FFFFFF",
  surfaceDark: "#1C2033",
  surfaceElevated: "#FFFFFF",
  surfaceHover: "#F3F4F6",

  // Text colors (Light mode support)
  text: "#1F2937", // Light mode text
  textDark: "#E5E7EB", // Dark mode text
  textSecondary: "#6B7280", // Light mode muted
  textSecondaryDark: "#9CA3AF", // Dark mode muted
  textTertiary: "#9CA3AF",
  textInverse: "#FFFFFF",

  // Status colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Border colors (Light mode support)
  border: "#E5E7EB", // Light mode border
  borderDark: "#374151", // Dark mode border
  borderLight: "#D1D5DB",
  borderMuted: "#F3F4F6",

  // Overlay
  overlay: "rgba(0, 0, 0, 0.7)",
  overlayLight: "rgba(0, 0, 0, 0.4)",
  overlayStrong: "rgba(0, 0, 0, 0.8)",

  // Card specific
  cardBackground: "#FFFFFF",
  cardBackgroundDark: "#1C2033",

  // Semantic action colors (swipe deck)
  passRed: "#FF4D6D",       // Pass / decline action
  favoriteBlue: "#60A5FA",  // Favorite / super-like action

  // Primary tints (chip / badge surfaces)
  primaryTint: "#F3E8FF",       // Soft purple background
  primaryTintBorder: "#E9D5FF", // Soft purple border
  primaryTintText: "#7C3AED",   // Vivid purple text on tint

  // Premium gradient (subscription cards / boost UI)
  premiumGradientStart: "#7A308F",
  premiumGradientEnd: "#C75FE4",

  // On-media text (text rendered over photos / dark gradients)
  onMedia: "#FFFFFF",
  onMediaSubtle: "rgba(255, 255, 255, 0.9)",
  onMediaMuted: "rgba(255, 255, 255, 0.7)",
  onMediaFaint: "rgba(255, 255, 255, 0.4)",

  // Primary at low alpha (waveform inactive bars, ghost surfaces)
  primaryFaint: "rgba(108, 93, 211, 0.3)",

  // Glass / tinted surfaces on dark backgrounds (cards layered on photos)
  surfaceTint: "rgba(255, 255, 255, 0.05)",
  surfaceTintStrong: "rgba(255, 255, 255, 0.08)",
  surfaceTintBorder: "rgba(255, 255, 255, 0.1)",

  // Pass action soft variants (decline button background)
  passRedSoft: "rgba(255, 77, 109, 0.15)",
  passRedBorder: "rgba(255, 77, 109, 0.4)",

  // Misc shadows / text shadows used over media
  shadowStrong: "rgba(0, 0, 0, 0.75)",

  // Recording (voice / video capture) — pulsing red
  recordingRed: "#FF5252",
  recordingRedSoft: "#FF525215",
  recordingRedBorder: "#FF525220",

  // Premium card supporting tints (subtitle / pricing meta on the deep purple BG)
  premiumMutedText: "#B884C7",
  premiumDeepBackdrop: "rgba(16, 5, 36, 1)",
  premiumDeepBackdropFade: "rgba(16, 5, 36, 0.26)",

  // Boost (premium boost feature highlight — warm gold)
  boostGold: "#FFD700",
  boostGoldDeep: "#FFA500",
  boostGoldSoft: "#FFD70015",
  boostGoldBorder: "#FFD70030",

  // "New user" badge — success green family
  newBadge: "#10B981",
  newBadgeBorder: "rgba(16, 185, 129, 0.5)",
} as const;

export type ColorKey = keyof typeof colors;

