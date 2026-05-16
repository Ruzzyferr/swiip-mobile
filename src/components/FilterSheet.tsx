import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - spacing.lg * 4;

export type FilterParams = {
  ageRange: [number, number];
  gender: "ALL" | "FEMALE" | "MALE";
  distanceRange: [number, number];
  nativeLanguages: string[];
  targetLanguages: string[];
  countries: string[];
  purpose?: "CONVERSATION" | "PRACTICE" | "COFFEE";
  verifiedOnly: boolean;
  recentlyActive: boolean;
  minPhotos: number;
};

type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterParams) => void;
  initialFilters: FilterParams;
  isPremium: boolean;
};

const LANGUAGES = [
  "English", "Turkish", "German", "French", "Spanish",
  "Italian", "Russian", "Portuguese", "Japanese", "Korean",
  "Chinese", "Arabic", "Dutch", "Swedish", "Greek"
];

const COUNTRIES = [
  // Europe
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GB", name: "UK", flag: "🇬🇧" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "CZ", name: "Czechia", flag: "🇨🇿" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  // Russia
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  // North America
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
];

const DEFAULT_FILTERS: FilterParams = {
  ageRange: [18, 60],
  gender: "ALL",
  distanceRange: [0, 100],
  nativeLanguages: [],
  targetLanguages: [],
  countries: [],
  purpose: undefined,
  verifiedOnly: false,
  recentlyActive: false,
  minPhotos: 0,
};

export function FilterSheet({
  visible,
  onClose,
  onApply,
  initialFilters,
  isPremium,
}: FilterSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<FilterParams>(initialFilters);

  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    onApply(DEFAULT_FILTERS);
    onClose();
  };

  const toggleArrayItem = (key: keyof FilterParams, item: string) => {
    setFilters((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(item)
          ? arr.filter((i) => i !== item)
          : [...arr, item],
      };
    });
  };

  const handlePremiumFilterPress = () => {
    onClose();
    router.push("/premium");
  };

  // Premium badge component
  const PremiumBadge = () => (
    <View style={styles.premiumBadge}>
      <Text style={styles.premiumBadgeText}>👑</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Age Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Age</Text>
              <Text style={styles.sliderValue}>
                {filters.ageRange[0]} - {filters.ageRange[1] >= 60 ? "60+" : filters.ageRange[1]}
              </Text>
              <MultiSlider
                values={filters.ageRange}
                min={18}
                max={60}
                step={1}
                sliderLength={SLIDER_WIDTH}
                onValuesChange={(values) =>
                  setFilters((prev) => ({ ...prev, ageRange: [values[0], values[1]] }))
                }
                selectedStyle={styles.sliderSelected}
                unselectedStyle={styles.sliderUnselected}
                containerStyle={styles.sliderContainer}
                markerStyle={styles.sliderMarker}
                pressedMarkerStyle={styles.sliderMarkerPressed}
              />
            </View>

            {/* Gender */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gender</Text>
              <View style={styles.segmentedControl}>
                {[
                  { label: "All", value: "ALL" as const },
                  { label: "Women", value: "FEMALE" as const },
                  { label: "Men", value: "MALE" as const },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.segmentedButton,
                      filters.gender === option.value && styles.segmentedButtonActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, gender: option.value }))
                    }
                  >
                    <Text
                      style={[
                        styles.segmentedButtonText,
                        filters.gender === option.value && styles.segmentedButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Distance Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distance</Text>
              <Text style={styles.sliderValue}>
                {filters.distanceRange[0]} - {filters.distanceRange[1] >= 100 ? "100+" : filters.distanceRange[1]} km
              </Text>
              <MultiSlider
                values={filters.distanceRange}
                min={0}
                max={100}
                step={5}
                sliderLength={SLIDER_WIDTH}
                onValuesChange={(values) =>
                  setFilters((prev) => ({ ...prev, distanceRange: [values[0], values[1]] }))
                }
                selectedStyle={styles.sliderSelected}
                unselectedStyle={styles.sliderUnselected}
                containerStyle={styles.sliderContainer}
                markerStyle={styles.sliderMarker}
                pressedMarkerStyle={styles.sliderMarkerPressed}
              />
            </View>

            {/* Native Language */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Native Language</Text>
              <Text style={styles.sectionDescription}>
                Show people who speak these languages natively
              </Text>
              <View style={styles.chipContainer}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={`native-${lang}`}
                    style={[
                      styles.chip,
                      filters.nativeLanguages.includes(lang) && styles.chipActive,
                    ]}
                    onPress={() => toggleArrayItem("nativeLanguages", lang)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.nativeLanguages.includes(lang) && styles.chipTextActive,
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target Language */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Learning Language</Text>
              <Text style={styles.sectionDescription}>
                Show people who are learning these languages
              </Text>
              <View style={styles.chipContainer}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={`target-${lang}`}
                    style={[
                      styles.chip,
                      filters.targetLanguages.includes(lang) && styles.chipActive,
                    ]}
                    onPress={() => toggleArrayItem("targetLanguages", lang)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.targetLanguages.includes(lang) && styles.chipTextActive,
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Countries */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Country</Text>
              <Text style={styles.sectionDescription}>
                Show people from these countries
              </Text>
              <View style={styles.chipContainer}>
                {COUNTRIES.map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.chip,
                      filters.countries.includes(country.code) && styles.chipActive,
                    ]}
                    onPress={() => toggleArrayItem("countries", country.code)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.countries.includes(country.code) && styles.chipTextActive,
                      ]}
                    >
                      {country.flag} {country.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Purpose */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Purpose</Text>
              <View style={styles.chipContainer}>
                {[
                  { label: "Conversation", value: "CONVERSATION" as const },
                  { label: "Language practice", value: "PRACTICE" as const },
                  { label: "Coffee", value: "COFFEE" as const },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      filters.purpose === option.value && styles.chipActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        purpose:
                          prev.purpose === option.value ? undefined : option.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.purpose === option.value && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Premium Filters with Badge */}
            <View style={styles.section}>
              {/* Verified Profiles Only */}
              <TouchableOpacity
                onPress={!isPremium ? handlePremiumFilterPress : undefined}
                activeOpacity={isPremium ? 1 : 0.7}
                style={[styles.premiumFilter, !isPremium && styles.premiumFilterLocked]}
              >
                <View style={styles.premiumFilterContent}>
                  <View style={styles.premiumFilterHeader}>
                    <Text style={styles.premiumFilterTitle}>Verified profiles only</Text>
                    {!isPremium && <PremiumBadge />}
                  </View>
                  <Text style={styles.premiumFilterDescription}>
                    Show only users with verified profiles
                  </Text>
                </View>
                {isPremium ? (
                  <Switch
                    value={filters.verifiedOnly}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, verifiedOnly: value }))
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.onMedia}
                  />
                ) : (
                  <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>

              {/* Recently Active */}
              <TouchableOpacity
                onPress={!isPremium ? handlePremiumFilterPress : undefined}
                activeOpacity={isPremium ? 1 : 0.7}
                style={[styles.premiumFilter, !isPremium && styles.premiumFilterLocked]}
              >
                <View style={styles.premiumFilterContent}>
                  <View style={styles.premiumFilterHeader}>
                    <Text style={styles.premiumFilterTitle}>Recently active</Text>
                    {!isPremium && <PremiumBadge />}
                  </View>
                  <Text style={styles.premiumFilterDescription}>
                    Show only users active in the last 24h
                  </Text>
                </View>
                {isPremium ? (
                  <Switch
                    value={filters.recentlyActive}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, recentlyActive: value }))
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.onMedia}
                  />
                ) : (
                  <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>

              {/* Minimum Photos */}
              <TouchableOpacity
                onPress={!isPremium ? handlePremiumFilterPress : undefined}
                activeOpacity={isPremium ? 1 : 0.7}
                style={[styles.premiumFilter, !isPremium && styles.premiumFilterLocked]}
              >
                <View style={styles.premiumFilterContent}>
                  <View style={styles.premiumFilterHeader}>
                    <Text style={styles.premiumFilterTitle}>Minimum photos</Text>
                    {!isPremium && <PremiumBadge />}
                  </View>
                  <Text style={styles.premiumFilterDescription}>
                    Require at least 2 photos
                  </Text>
                </View>
                {isPremium ? (
                  <Switch
                    value={filters.minPhotos > 0}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, minPhotos: value ? 2 : 0 }))
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.onMedia}
                  />
                ) : (
                  <MaterialIcons name="lock" size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
            <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Apply"
              onPress={handleApply}
              style={styles.applyButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  sliderValue: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  sliderContainer: {
    height: 40,
  },
  sliderSelected: {
    backgroundColor: colors.primary,
  },
  sliderUnselected: {
    backgroundColor: colors.border,
  },
  sliderMarker: {
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: colors.onMedia,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderMarkerPressed: {
    height: 28,
    width: 28,
    borderRadius: 14,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: 10,
  },
  segmentedButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentedButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  segmentedButtonTextActive: {
    color: colors.onMedia,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + "30",
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  chipTextActive: {
    color: colors.primary,
  },
  premiumFilter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  premiumFilterLocked: {
    opacity: 0.7,
  },
  premiumFilterContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  premiumFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  premiumFilterTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  premiumFilterDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  premiumBadge: {
    backgroundColor: colors.warning + "30",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumBadgeText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  resetText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  applyButton: {
    flex: 1,
  },
});
