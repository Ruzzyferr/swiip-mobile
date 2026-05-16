import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ChipProps = {
  label: string;
  variant?: "default" | "primary" | "outlined";
  onPress?: () => void;
  // Accepts a string (legacy emoji/text) or any React node (e.g. <LanguageFlag />)
  icon?: React.ReactNode;
};

export function Chip({ label, variant = "default", onPress, icon }: ChipProps) {
  const isPressable = !!onPress;
  const Container: React.ComponentType<any> = isPressable ? TouchableOpacity : View;

  const renderIcon = () => {
    if (icon === null || icon === undefined || icon === "") return null;
    if (typeof icon === "string" || typeof icon === "number") {
      return <Text style={styles.icon}>{icon}</Text>;
    }
    return <View style={styles.iconWrap}>{icon}</View>;
  };

  return (
    <Container
      onPress={onPress}
      accessibilityRole={isPressable ? "button" : undefined}
      accessibilityLabel={isPressable ? label : undefined}
      hitSlop={isPressable ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined}
      style={[
        styles.chip,
        variant === "primary" && styles.chipPrimary,
        variant === "outlined" && styles.chipOutlined,
      ]}
    >
      {renderIcon()}
      <Text
        style={[
          styles.text,
          variant === "primary" && styles.textPrimary,
          variant === "outlined" && styles.textOutlined,
        ]}
      >
        {label}
      </Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPrimary: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryTintBorder,
  },
  chipOutlined: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  text: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  textPrimary: {
    color: colors.primaryTintText,
  },
  textOutlined: {
    color: colors.textSecondary,
  },
  icon: {
    fontSize: typography.fontSize.sm,
    marginRight: spacing.xs / 2,
  },
  iconWrap: {
    marginRight: spacing.xs / 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
