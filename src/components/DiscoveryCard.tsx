import React, { useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { ScrollView, RectButton, TouchableOpacity } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Chip } from "./ui/Chip";
import { LanguageFlag } from "./ui/LanguageFlag";
import { OptimizedImage } from "./ui/OptimizedImage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = spacing.md;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
// MAX_CARD_HEIGHT is no longer strictly enforced for the scroll content,
// but the container size is determined by the parent SwipeableCard.

type DiscoveryCardProps = {
  card: {
    userId: string;
    distanceKm?: number;
    profile: {
      displayName: string;
      birthYear: number | null;
      city: string | null;
      purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
      bio: string | null;
      photos: string[];
      languagesNative: string[];
      languagesPractice: string[];
      createdAt?: string;
    };
  };
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onFavorite?: () => void;
  favoritesRemaining?: number;
  isPremium?: boolean;
  // True only for the top card of the SwipeDeck stack. Off-stack cards skip the
  // expensive ScrollView + sections to keep the main thread responsive while the
  // user is mid-swipe.
  isActive?: boolean;
};

function DiscoveryCardBase({
  card,
  onSwipeLeft,
  onSwipeRight,
  onFavorite,
  favoritesRemaining,
  isPremium,
  isActive = true,
}: DiscoveryCardProps) {
  const { profile, distanceKm } = card;
  const [bioExpanded, setBioExpanded] = useState(false);
  const { t } = useTranslation();

  const age = profile.birthYear
    ? new Date().getFullYear() - profile.birthYear
    : null;

  const formatDistance = (km?: number) => {
    if (!km) return null;
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${Math.round(km)} km away`;
  };

  // "New" badge: user profile created within the last 7 days.
  const isNewUser = (() => {
    if (!profile.createdAt) return false;
    const created = new Date(profile.createdAt).getTime();
    if (Number.isNaN(created)) return false;
    return Date.now() - created < 7 * 24 * 60 * 60 * 1000;
  })();

  const renderLanguageFlag = (lang: string) => <LanguageFlag language={lang} size={16} />;

  const photos = profile.photos && profile.photos.length > 0 ? profile.photos : [];

  // Helper to render basic info overlay
  const renderBasicInfo = () => (
    <LinearGradient
      colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.9)"]}
      style={styles.nameGradient}
    >
      <View style={styles.nameContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.displayName}</Text>
          {age && <Text style={styles.age}>{age}</Text>}
          {isNewUser && (
            <View
              style={styles.newBadge}
              accessibilityRole="text"
              accessibilityLabel={t("discovery_card.new_badge_a11y")}
            >
              <Text style={styles.newBadgeText}>{t("discovery_card.new_badge")}</Text>
            </View>
          )}
        </View>
        {(profile.city || distanceKm) && (
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={16} color={colors.textSecondaryDark} />
            <Text style={styles.locationText}>
              {profile.city || ""}
              {profile.city && distanceKm && ", "}
              {distanceKm && formatDistance(distanceKm)}
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );

  // Helper to render languages
  const renderLanguages = () => (
    (profile.languagesNative.length > 0 || profile.languagesPractice.length > 0) && (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t("profile.languages")}</Text>
        <View style={styles.sectionContent}>
          {profile.languagesNative.length > 0 && (
            <View style={styles.languageGroup}>
              <Text style={styles.subSectionTitle}>{t("discovery_card.speaks")}</Text>
              <View style={styles.chipsContainer}>
                {profile.languagesNative.map((lang, index) => (
                  <Chip
                    key={`native-${index}`}
                    label={lang}
                    icon={renderLanguageFlag(lang)}
                    variant="primary"
                  />
                ))}
              </View>
            </View>
          )}
          {profile.languagesPractice.length > 0 && (
            <View style={styles.languageGroup}>
              <Text style={styles.subSectionTitle}>{t("discovery_card.learning")}</Text>
              <View style={styles.chipsContainer}>
                {profile.languagesPractice.map((lang, index) => (
                  <Chip
                    key={`practice-${index}`}
                    label={lang}
                    icon={renderLanguageFlag(lang)}
                    variant="default"
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    )
  );

  // Helper to render Bio
  const renderBio = () => (
    profile.bio && (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t("discovery_card.about")}</Text>
        <View style={styles.sectionContent}>
          <Text
            style={styles.bio}
            numberOfLines={bioExpanded ? undefined : 4}
          >
            {profile.bio}
          </Text>
          {profile.bio.length > 150 && (
            <TouchableOpacity
              onPress={() => setBioExpanded(!bioExpanded)}
              style={styles.readMoreButton}
            >
              <Text style={styles.readMoreText}>
                {bioExpanded ? t("discovery_card.read_less") : t("discovery_card.read_more")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  );

  // Dynamic Content rendering strategy:
  // 1. Photo 1 (Main) + Basic Info Overlay
  // 2. Bio
  // 3. Languages
  // 4. Photo 2
  // 5. Photo 3+

  // For cards behind the top of the deck, render only the cover photo + basic
  // info overlay. This skips the ScrollView, sections, extra photos, location
  // card, action button row and safety section — keeping the deck mount cheap
  // while the user swipes the top card.
  if (!isActive) {
    return (
      <View style={styles.container}>
        <View style={styles.mainImageContainer}>
          {photos.length > 0 ? (
            <OptimizedImage
              source={{ uri: photos[0] }}
              style={styles.mainImage}
              containerStyle={styles.mainImageContainer}
              resizeMode="cover"
              fallbackIconSize={64}
              showLoader={false}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>
                {profile.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {renderBasicInfo()}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* First Photo with Info Overlay */}
        <View style={styles.mainImageContainer}>
          {photos.length > 0 ? (
            <OptimizedImage
              source={{ uri: photos[0] }}
              style={styles.mainImage}
              containerStyle={styles.mainImageContainer}
              resizeMode="cover"
              fallbackIconSize={64}
              accessibilityLabel={t("a11y.open_profile")}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>
                {profile.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {renderBasicInfo()}

          {/* Favorite Button - Inside photo area */}
          {onFavorite && (
            <RectButton
              style={styles.favoriteButtonOnPhoto}
              onPress={onFavorite}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.favoriteButtonGradient}
              >
                <MaterialIcons name="star" size={24} color={colors.onMedia} />
              </LinearGradient>
              {!isPremium && favoritesRemaining !== undefined && (
                <View style={styles.favoriteBadge}>
                  <Text style={styles.favoriteBadgeText}>{favoritesRemaining}</Text>
                </View>
              )}
            </RectButton>
          )}

          {/* Scroll Indicator */}
          <View style={styles.scrollIndicator}>
            <MaterialIcons name="keyboard-arrow-up" size={20} color={colors.onMediaMuted} />
            <Text style={styles.scrollIndicatorText}>{t("discovery_card.scroll_hint")}</Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.bodyContainer}>

          {/* About Me Section */}
          {renderBio()}

          {/* Languages Section */}
          {renderLanguages()}

          {/* Remaining Photos */}
          {photos.slice(1).map((photoUri, index) => (
            <OptimizedImage
              key={`photo-extra-${index}`}
              source={{ uri: photoUri }}
              style={styles.extraImage}
              containerStyle={styles.extraPhotoContainer}
              resizeMode="cover"
              fallbackIconSize={56}
            />
          ))}

          {/* Bumble-style Location Card */}
          <View style={styles.locationCard}>
            <Text style={styles.locationCardHeader}>{t("discovery_card.location_title")}</Text>
            <View style={styles.locationCardContent}>
              <MaterialIcons name="location-on" size={28} color={colors.textSecondaryDark} />
              <View style={styles.locationCardInfo}>
                <Text style={styles.locationCardCity}>
                  {profile.city || t("discovery_card.location_unknown")}
                </Text>
                {distanceKm && (
                  <Text style={styles.locationCardDistance}>
                    {formatDistance(distanceKm)}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Action Buttons Row - Dark Theme */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButtonCircle, styles.declineButton]}
              onPress={onSwipeLeft}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("a11y.pass")}
            >
              <MaterialIcons name="close" size={32} color={colors.passRed} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButtonCircle, styles.starButton]}
              onPress={onFavorite}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("a11y.favorite")}
            >
              <LinearGradient
                colors={[colors.accent, colors.primary]}
                style={styles.starGradient}
              >
                <MaterialIcons name="star" size={26} color={colors.onMedia} />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButtonCircle, styles.heartButton]}
              onPress={onSwipeRight}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("a11y.like")}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={styles.heartGradient}
              >
                <MaterialIcons name="favorite" size={28} color={colors.onMedia} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Block & Report Section */}
          <View style={styles.safetySection}>
            <TouchableOpacity
              style={styles.safetyButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t("safety.block")}
            >
              <Text style={styles.blockText}>{t("safety.block")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.safetyButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t("safety.report")}
            >
              <Text style={styles.reportText}>{t("safety.report")}</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom padding for safe scrolling */}
          <View style={{ height: spacing.xl * 2 }} />
        </View>
      </ScrollView>
    </View>
  );
}

export const DiscoveryCard = React.memo(DiscoveryCardBase, (prev, next) => {
  // Re-render only when the user being shown, visible counters, or
  // active-in-stack state changes.
  return (
    prev.card.userId === next.card.userId &&
    prev.favoritesRemaining === next.favoritesRemaining &&
    prev.isPremium === next.isPremium &&
    prev.isActive === next.isActive &&
    prev.card.distanceKm === next.card.distanceKm
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1, // Fill the parent SwipeableCard
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainImageContainer: {
    width: "100%",
    height: 500, // Large main photo
    position: "relative",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: typography.fontSize["5xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  nameGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  nameContainer: {
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.onMedia,
    textShadowColor: colors.shadowStrong,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  age: {
    fontSize: 26,
    fontWeight: "400",
    color: colors.onMediaSubtle,
    textShadowColor: colors.shadowStrong,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  newBadge: {
    backgroundColor: colors.newBadge,
    borderColor: colors.newBadgeBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 4,
    alignSelf: "center",
  },
  newBadgeText: {
    color: colors.onMedia,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 16,
    color: colors.onMediaSubtle, // White on dark gradient — much better contrast than gray
    fontWeight: "500",
    textShadowColor: colors.shadowStrong,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bodyContainer: {
    padding: spacing.md,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondaryDark,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionContent: {
    backgroundColor: colors.surfaceTint,
    padding: spacing.md,
    borderRadius: 20,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceTintBorder,
  },
  bio: {
    fontSize: 16,
    color: colors.onMediaSubtle,
    lineHeight: 24,
  },
  readMoreButton: {
    alignSelf: "flex-start",
  },
  readMoreText: {
    color: colors.primary,
    fontWeight: "bold",
  },
  languageGroup: {
    gap: 8,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.textSecondaryDark,
    textTransform: "uppercase",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  extraPhotoContainer: {
    width: "100%",
    height: 400,
    borderRadius: 16,
    overflow: "hidden",
  },
  extraImage: {
    width: "100%",
    height: "100%",
  },
  favoriteButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
  favoriteButtonFloating: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 100,
  },
  favoriteButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    opacity: 0.85,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primaryLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  favoriteButtonGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    // Modern shadow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  favoriteButtonText: {
    color: colors.onMedia,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  favoriteButtonOnPhoto: {
    position: "absolute",
    bottom: 20,
    right: 16,
    zIndex: 20,
  },
  scrollIndicator: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: colors.overlayLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scrollIndicatorText: {
    color: colors.onMediaMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  favoriteBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.onMedia,
  },
  favoriteBadgeText: {
    color: colors.onMedia,
    fontSize: 11,
    fontWeight: "bold",
  },
  // Bumble-style Location Card - Dark Theme
  locationCard: {
    backgroundColor: colors.surfaceTintStrong,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceTintBorder,
  },
  locationCardHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondaryDark,
    marginBottom: spacing.sm,
  },
  locationCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationCardInfo: {
    flex: 1,
  },
  locationCardCity: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.onMedia,
  },
  locationCardDistance: {
    fontSize: 14,
    color: colors.textSecondaryDark,
    marginTop: 2,
  },
  // Action Buttons Row - Dark Theme
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  actionButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  declineButton: {
    backgroundColor: colors.passRedSoft,
    borderWidth: 2,
    borderColor: colors.passRedBorder,
  },
  starButton: {
    overflow: "hidden",
  },
  starGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  heartButton: {
    overflow: "hidden",
  },
  heartGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  // Safety Section - Dark Theme
  safetySection: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  safetyButton: {
    paddingVertical: spacing.sm,
  },
  blockText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondaryDark,
  },
  reportText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.passRed,
  },
});
