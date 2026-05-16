import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type PremiumCardProps = {
  title: string;
  price: string;
  priceTime?: string;
  subtitle?: string;
  features: string[];
  buttonText: string;
  onPress: () => void;
  isSelected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PremiumCard({
  title,
  price,
  priceTime = "/ month",
  subtitle,
  features,
  buttonText,
  onPress,
  isSelected = false,
  style,
}: PremiumCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, style, isSelected ? styles.containerSelected : undefined]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Glowing circle in top right */}
      <LinearGradient
        colors={[colors.premiumGradientStart, colors.premiumGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowCircle}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Pricing */}
        <View style={styles.pricingContainer}>
          <Text style={styles.pricing}>{price}</Text>
          {priceTime && <Text style={styles.pricingTime}>{priceTime}</Text>}
        </View>

        {/* Subtitle */}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {/* Features List */}
        <View style={styles.featuresList}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.premiumDeepBackdrop, colors.premiumDeepBackdropFade, "transparent"]}
            start={{ x: 0, y: 0.45 }}
            end={{ x: 1, y: 0.45 }}
            style={styles.buttonOverlayLeft}
          />
          <LinearGradient
            colors={["transparent", colors.premiumDeepBackdropFade, colors.premiumDeepBackdrop]}
            start={{ x: 0, y: 0.45 }}
            end={{ x: 1, y: 0.45 }}
            style={styles.buttonOverlayRight}
          />
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const CARD_BG = colors.premiumGradientStart;
const GLOW_COLOR = colors.premiumGradientEnd;
const FEATURE_CHECK_COLOR = GLOW_COLOR;

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
    width: 224, // 14rem = 224px
    minHeight: 300,
    backgroundColor: CARD_BG,
    borderRadius: 8, // 0.5rem
    padding: spacing.md, // 1rem
    marginBottom: spacing.md,
    // Gradient backgrounds (approximated with multiple layers)
    // Using shadowColor as a workaround for complex gradients in React Native
  },
  containerSelected: {
    borderWidth: 2,
    borderColor: GLOW_COLOR,
    shadowColor: GLOW_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  glowCircle: {
    position: "absolute",
    top: spacing.md, // 1rem
    right: spacing.md, // 1rem
    width: 32, // 2rem
    height: 32, // 2rem
    borderRadius: 16,
    shadowColor: GLOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
    gap: spacing.sm + spacing.xs, // 0.75rem
    zIndex: 1,
  },
  title: {
    fontSize: typography.fontSize.base, // 1rem
    color: colors.onMedia,
    fontWeight: typography.fontWeight.semibold, // 600
  },
  pricingContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs / 2,
  },
  pricing: {
    fontSize: typography.fontSize["2xl"], // 1.5rem
    color: colors.onMedia,
    fontWeight: typography.fontWeight.semibold, // 600
  },
  pricingTime: {
    fontSize: typography.fontSize.xs, // 0.75rem
    color: colors.premiumMutedText,
    fontWeight: typography.fontWeight.medium, // 500
  },
  subtitle: {
    fontSize: typography.fontSize.xs, // 0.75rem
    color: colors.premiumMutedText,
    fontWeight: typography.fontWeight.medium, // 500
    marginTop: spacing.xs,
  },
  featuresList: {
    gap: spacing.xs / 2, // 0.25rem
    marginTop: spacing.xs,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs / 2,
  },
  checkmark: {
    fontSize: typography.fontSize.base, // 1rem
    color: FEATURE_CHECK_COLOR,
    fontWeight: typography.fontWeight.bold, // 900
  },
  featureText: {
    fontSize: typography.fontSize.xs, // 0.75rem
    color: colors.onMedia,
    fontWeight: typography.fontWeight.medium, // 500
    flex: 1,
  },
  button: {
    overflow: "hidden",
    position: "relative",
    marginTop: spacing.xs, // 0.5rem
    paddingVertical: spacing.xs, // 0.5rem
    paddingHorizontal: spacing.sm + spacing.xs, // 0.75rem
    width: "100%",
    backgroundColor: CARD_BG,
    borderRadius: 8, // 0.5rem
    borderWidth: 1,
    borderColor: CARD_BG,
    shadowColor: CARD_BG,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonOverlayLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "50%",
    height: "100%",
  },
  buttonOverlayRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "50%",
    height: "100%",
  },
  buttonText: {
    position: "relative",
    zIndex: 10,
    fontSize: typography.fontSize.xs, // 0.75rem
    color: colors.onMedia,
    fontWeight: typography.fontWeight.medium,
    textAlign: "center",
  },
});

