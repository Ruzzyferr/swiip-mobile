import React, { useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type ActionButtonsProps = {
  onLike: () => void;
  onPass: () => void;
  onFavorite?: () => void;
  disabled?: boolean;
};

export function ActionButtons({
  onLike,
  onPass,
  onFavorite,
  disabled = false
}: ActionButtonsProps) {
  const { t } = useTranslation();
  const likeScale = useRef(new Animated.Value(1)).current;
  const passScale = useRef(new Animated.Value(1)).current;
  const favoriteScale = useRef(new Animated.Value(1)).current;

  const animatePress = (scale: Animated.Value, callback: () => void) => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    callback();
  };

  const handleLike = () => {
    animatePress(likeScale, onLike);
  };

  const handlePass = () => {
    animatePress(passScale, onPass);
  };

  const handleFavorite = () => {
    if (onFavorite) {
      animatePress(favoriteScale, onFavorite);
    }
  };

  return (
    <View style={styles.container}>
      {/* Pass Button (X) - Larger */}
      <TouchableOpacity
        onPress={handlePass}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.pass")}
        accessibilityState={{ disabled }}
      >
        <Animated.View
          style={[
            styles.passButton,
            { transform: [{ scale: passScale }] },
          ]}
        >
          <MaterialIcons name="close" size={32} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {/* Favorite Button (Star) - Smaller, higher */}
      {onFavorite && (
        <TouchableOpacity
          onPress={handleFavorite}
          disabled={disabled}
          activeOpacity={0.8}
          style={styles.favoriteWrapper}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.favorite")}
          accessibilityState={{ disabled }}
        >
          <Animated.View
            style={[
              styles.favoriteButton,
              { transform: [{ scale: favoriteScale }] },
            ]}
          >
            <MaterialIcons name="star" size={24} color={colors.favoriteBlue} />
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Like Button (Heart) - Primary pink gradient */}
      <TouchableOpacity
        onPress={handleLike}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.like")}
        accessibilityState={{ disabled }}
      >
        <Animated.View
          style={[
            styles.likeButton,
            { transform: [{ scale: likeScale }] },
          ]}
        >
          <LinearGradient
            colors={[colors.accentGradientStart, colors.accentGradientEnd]}
            style={styles.likeButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="favorite" size={36} color={colors.onMedia} />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const PASS_SIZE = 64;
const FAVORITE_SIZE = 48;
const LIKE_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: spacing.xl,
    paddingVertical: spacing.md,
  },
  passButton: {
    width: PASS_SIZE,
    height: PASS_SIZE,
    borderRadius: PASS_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  favoriteWrapper: {
    marginTop: -spacing.lg, // Sits slightly higher
  },
  favoriteButton: {
    width: FAVORITE_SIZE,
    height: FAVORITE_SIZE,
    borderRadius: FAVORITE_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  likeButton: {
    width: LIKE_SIZE,
    height: LIKE_SIZE,
    borderRadius: LIKE_SIZE / 2,
    overflow: "hidden",
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  likeButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});

