import React from "react";
import { Text, View, StyleSheet, TextStyle } from "react-native";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

/**
 * Visual representation of a language using a flag emoji (default) or
 * a typographic ISO code badge fallback (variant="code").
 *
 * Future upgrade path: swap the emoji renderer with a vector flag library
 * (e.g. react-native-country-flag / local SVGs in assets/flags/) without
 * touching call sites. Keep the LANG_INFO map as the single source of truth.
 *
 * Always pass the original language string — it is exposed to assistive
 * technologies via accessibilityLabel.
 */
type LanguageFlagProps = {
  language: string;
  size?: number;
  variant?: "emoji" | "code";
  style?: TextStyle;
};

type LangInfo = { code: string; emoji: string };

const LANG_INFO: Record<string, LangInfo> = {
  English: { code: "EN", emoji: "🇺🇸" },
  Turkish: { code: "TR", emoji: "🇹🇷" },
  German: { code: "DE", emoji: "🇩🇪" },
  Spanish: { code: "ES", emoji: "🇪🇸" },
  French: { code: "FR", emoji: "🇫🇷" },
  Italian: { code: "IT", emoji: "🇮🇹" },
  Portuguese: { code: "PT", emoji: "🇵🇹" },
  Russian: { code: "RU", emoji: "🇷🇺" },
  Chinese: { code: "ZH", emoji: "🇨🇳" },
  Japanese: { code: "JA", emoji: "🇯🇵" },
  Korean: { code: "KO", emoji: "🇰🇷" },
  Arabic: { code: "AR", emoji: "🇸🇦" },
  Dutch: { code: "NL", emoji: "🇳🇱" },
  Polish: { code: "PL", emoji: "🇵🇱" },
  Swedish: { code: "SV", emoji: "🇸🇪" },
  Norwegian: { code: "NO", emoji: "🇳🇴" },
  Danish: { code: "DA", emoji: "🇩🇰" },
  Finnish: { code: "FI", emoji: "🇫🇮" },
  Greek: { code: "EL", emoji: "🇬🇷" },
  Hebrew: { code: "HE", emoji: "🇮🇱" },
  Hindi: { code: "HI", emoji: "🇮🇳" },
  Indonesian: { code: "ID", emoji: "🇮🇩" },
  Thai: { code: "TH", emoji: "🇹🇭" },
  Vietnamese: { code: "VI", emoji: "🇻🇳" },
  Ukrainian: { code: "UK", emoji: "🇺🇦" },
  Romanian: { code: "RO", emoji: "🇷🇴" },
  Czech: { code: "CS", emoji: "🇨🇿" },
};

export function LanguageFlag({
  language,
  size = 16,
  variant = "emoji",
  style,
}: LanguageFlagProps) {
  const info = LANG_INFO[language];
  if (!info) return null;

  if (variant === "code") {
    return (
      <View
        style={[
          styles.codeBadge,
          { minWidth: size + 8, height: size + 6, borderRadius: (size + 6) / 2 },
        ]}
        accessibilityLabel={language}
        accessibilityRole="text"
      >
        <Text style={[styles.codeText, { fontSize: size * 0.7 }, style]}>{info.code}</Text>
      </View>
    );
  }

  return (
    <Text
      style={[{ fontSize: size }, style]}
      accessibilityLabel={language}
      accessibilityRole="text"
      allowFontScaling={false}
    >
      {info.emoji}
    </Text>
  );
}

const styles = StyleSheet.create({
  codeBadge: {
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  codeText: {
    color: colors.primaryTintText,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
});
