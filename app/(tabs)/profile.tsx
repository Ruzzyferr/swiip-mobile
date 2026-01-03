import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Share, Modal, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { getToken, clearToken } from "@/src/services/authStore";
import { api } from "@/src/services/api";
import { usePremium } from "@/src/state/premium";
import {
  getOfferings,
  purchasePremium,
  PurchasesPackage
} from "@/src/services/purchases";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BannerAdComponent } from "@/src/components/BannerAdComponent";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{
    user: { id: string; email: string | null; phone: string | null; createdAt: string };
    profileExists: boolean;
  } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // Premium State
  const [premiumStatus, setPremiumStatus] = useState<{
    isPremium: boolean;
    premiumExpiresAt: string | null;
  } | null>(null);
  const { premiumEnabled } = usePremium();

  // Boost State
  const [boostStatus, setBoostStatus] = useState<{
    active: boolean;
    endsAt?: string;
    boostsRemaining: number;
    weeklyLimit: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [boostPackage, setBoostPackage] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    loadUserData();
    loadPremiumStatus();
    loadBoostStatus();
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await getOfferings();
      if (offerings?.availablePackages) {
        // Look for a package with "boost" in the identifier
        const foundPackage = offerings.availablePackages.find(
          pkg => pkg.identifier.includes("boost")
        );
        if (foundPackage) {
          setBoostPackage(foundPackage);
        }
      }
    } catch (error) {
      console.log("Failed to load offerings:", error);
    }
  };

  const loadBoostStatus = async () => {
    try {
      const status = await api.getBoostStatus();
      setBoostStatus(status);
    } catch (error) {
      console.error("Failed to load boost status:", error);
    }
  };

  const loadUserData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/welcome");
        return;
      }

      const me = await api.getMe();
      setUserInfo(me);

      if (me.profileExists) {
        try {
          const profileData = await api.getMyProfile();
          setProfile(profileData);
        } catch (error) {
          // Profile might not exist
        }
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      router.replace("/(auth)/welcome");
    } finally {
      setLoading(false);
    }
  };

  const loadPremiumStatus = async () => {
    try {
      const billing = await api.getBillingStatus();
      setPremiumStatus({
        isPremium: billing.isPremium,
        premiumExpiresAt: billing.premiumExpiresAt,
      });
    } catch (error) {
      console.error("Failed to load premium status:", error);
    }
  };

  const onRefresh = async () => { // Added as per instruction
    setRefreshing(true);
    await Promise.all([loadUserData(), loadPremiumStatus(), loadBoostStatus(), loadOfferings()]);
    setRefreshing(false);
  };

  const handleBoost = async () => {
    if (boostStatus?.active) {
      Alert.alert("Boost Aktif ⚡", `Profilin şu anda zaten öne çıkarılmış durumda!\nBitiş: ${getTimeRemaining(boostStatus.endsAt!)}`);
      return;
    }

    const hasBoosts = (boostStatus?.boostsRemaining || 0) > 0;

    if (hasBoosts) {
      Alert.alert(
        "Profile Boost 🚀",
        `Profilini 30 dakika boyunca öne çıkarmak istiyor musun?\n\nKalan Hakkın: ${boostStatus?.boostsRemaining || 0}`,
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Boostla!",
            onPress: async () => {
              try {
                const result = await api.activateBoost();
                setBoostStatus({
                  ...result,
                  weeklyLimit: boostStatus?.weeklyLimit || 2,
                });
                Alert.alert("Başarılı! 🚀", "Profilin 30 dakika boyunca öne çıkarılacak!");
              } catch (error: any) {
                const message = error.response?.data?.error?.message || "Bir hata oluştu";
                Alert.alert("Hata", message);
              }
            }
          }
        ]
      );
    } else {
      // No boosts remaining - Offer purchase or premium
      const priceString = boostPackage?.product.priceString || "$4.99";

      Alert.alert(
        "Boost Hakkın Kalmadı",
        `Profilini öne çıkarmak için yeni boost paketine ihtiyacın var.\n\n Paket: 2 Boost`, // Modified as per instruction
        [
          { text: "İptal", style: "cancel" },
          !premiumStatus?.isPremium ? {
            text: "Premium'a Geç ✨",
            onPress: () => router.push("/premium")
          } : null,
          {
            text: `2 Boost Al (${priceString})`, // Modified as per instruction
            onPress: handlePurchaseBoost
          }
        ].filter(Boolean) as any
      );
    }
  };

  const handlePurchaseBoost = async () => {
    try {
      setLoading(true);

      // If we found a real RevenueCat package, use it
      if (boostPackage) { // Added as per instruction
        await purchasePremium(boostPackage); // Added as per instruction
      } else {
        // Fallback for development/simulators if no package found
        // In real app, you might want to block this or show error
        console.warn("No boost package found in offerings. Falling back to mock."); // Added as per instruction
      }

      // After successful purchase (or mock fallback), sync with backend
      const result = await api.purchaseBoost();
      if (result.success) {
        await loadBoostStatus();
        Alert.alert("Satın Alma Başarılı! 🎉", "Hesabına 2 Boost eklendi. Şimdi profilini öne çıkarabilirsin!");
      }
    } catch (error: any) {
      if (error.message === "Purchase cancelled") { // Added as per instruction
        return; // User cancelled, do nothing
      }
      Alert.alert("Satın Alma Başarısız", "Bir hata oluştu. Lütfen tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return "Süresi dolmuş";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} gün ${hours} saat`;
    } else if (hours > 0) {
      return `${hours} saat ${minutes} dakika`;
    } else {
      return `${minutes} dakika`;
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await clearToken();
      router.replace("/(auth)/welcome");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[colors.primary + '20', colors.backgroundDark]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  const age = profile?.birthYear ? new Date().getFullYear() - profile.birthYear : null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>

          {/* Profile Photo with Glow */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarGlow} />
            {profile?.photos && profile.photos.length > 0 ? (
              <Image
                source={{ uri: profile.photos[0] }}
                style={[styles.avatar, boostStatus?.active && { borderColor: '#FFD700', borderWidth: 2 }]}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {profile?.displayName?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            )}
            {/* Boost Badge Logic */}
            {boostStatus?.active ? (
              <View style={[styles.premiumBadgeSmall, { backgroundColor: '#FFD700' }]}>
                <Ionicons name="flash" size={16} color="#000" />
              </View>
            ) : premiumStatus?.isPremium ? (
              <View style={styles.premiumBadgeSmall}>
                <Text style={styles.premiumBadgeSmallText}>✨</Text>
              </View>
            ) : null}
          </View>

          {/* Name and Location */}
          <Text style={styles.displayName}>
            {profile?.displayName || "Profil"}
            {age && <Text style={styles.age}>, {age}</Text>}
          </Text>
          {profile?.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.location}>{profile.city}</Text>
            </View>
          )}

          {/* Edit Button */}
          {userInfo?.profileExists && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push("/profile-edit")}
            >
              <Ionicons name="pencil" size={16} color="#FFF" />
              <Text style={styles.editButtonText}>Düzenle</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Stats */}
        {profile && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.languagesNative?.length || 0}</Text>
              <Text style={styles.statLabel}>Ana Dil</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.languagesPractice?.length || 0}</Text>
              <Text style={styles.statLabel}>Öğreniyor</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile.purpose === "CONVERSATION" ? "💬" : profile.purpose === "PRACTICE" ? "📚" : "☕"}
              </Text>
              <Text style={styles.statLabel}>Amaç</Text>
            </View>
          </View>
        )}

        {/* Languages Card */}
        {profile && (profile.languagesNative?.length > 0 || profile.languagesPractice?.length > 0) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="globe-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Diller</Text>
            </View>

            {profile.languagesNative?.length > 0 && (
              <View style={styles.languageSection}>
                <Text style={styles.languageSectionTitle}>Ana Diller</Text>
                <View style={styles.languageTags}>
                  {profile.languagesNative.map((lang: string, index: number) => (
                    <LinearGradient
                      key={index}
                      colors={[colors.primary + '30', colors.primary + '10']}
                      style={styles.languageTag}
                    >
                      <Text style={styles.languageTagText}>{lang}</Text>
                    </LinearGradient>
                  ))}
                </View>
              </View>
            )}

            {profile.languagesPractice?.length > 0 && (
              <View style={styles.languageSection}>
                <Text style={styles.languageSectionTitle}>Öğreniyor</Text>
                <View style={styles.languageTags}>
                  {profile.languagesPractice.map((lang: string, index: number) => (
                    <LinearGradient
                      key={index}
                      colors={[colors.accent + '30', colors.accent + '10']}
                      style={styles.languageTag}
                    >
                      <Text style={[styles.languageTagText, { color: colors.accent }]}>{lang}</Text>
                    </LinearGradient>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Bio Card */}
        {profile?.bio && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Hakkında</Text>
            </View>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Premium Card */}
        {premiumStatus && (
          <View style={styles.card}>
            {premiumStatus.isPremium ? (
              <>
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.premiumActiveBadge}
                >
                  <Text style={styles.premiumActiveIcon}>✨</Text>
                  <Text style={styles.premiumActiveText}>Premium Aktif</Text>
                </LinearGradient>

                {premiumStatus.premiumExpiresAt && (
                  <View style={styles.premiumExpiryRow}>
                    <Ionicons name="time-outline" size={18} color={colors.textSecondaryDark} />
                    <Text style={styles.premiumExpiryText}>
                      Kalan: {getTimeRemaining(premiumStatus.premiumExpiresAt)}
                    </Text>
                  </View>
                )}

                <View style={styles.premiumBenefits}>
                  {[
                    { icon: "infinite", text: "Sınırsız Mesaj" },
                    { icon: "eye", text: "Kim Beğendi" },
                    { icon: "rocket", text: "Boost" },
                    { icon: "diamond", text: "Direkt Mesaj" },
                  ].map((benefit, index) => (
                    <View key={index} style={styles.premiumBenefitItem}>
                      <Ionicons name={benefit.icon as any} size={16} color={colors.primary} />
                      <Text style={styles.premiumBenefitText}>{benefit.text}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.premiumUpgradeHeader}>
                  <Text style={styles.premiumUpgradeTitle}>✨ Premium'a Geç</Text>
                  <Text style={styles.premiumUpgradeSubtitle}>
                    Tüm özelliklerin kilidini aç
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.premiumUpgradeButton}
                  onPress={() => router.push("/premium")}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.premiumUpgradeButtonGradient}
                  >
                    <Text style={styles.premiumUpgradeButtonText}>Premium'a Yükselt</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          {/* Boost Button - Prominent placement */}
          <TouchableOpacity
            style={[styles.settingsItem, styles.boostItem, boostStatus?.active && { backgroundColor: '#FFD70015', borderBottomColor: '#FFD70030' }]}
            onPress={handleBoost}
          >
            <View style={styles.settingsItemLeft}>
              <LinearGradient
                colors={boostStatus?.active ? ["#FFD700", "#FFA500"] : [colors.primary, colors.primaryLight]}
                style={[styles.settingsIcon, { borderRadius: 10 }]}
              >
                <Ionicons name={boostStatus?.active ? "flash" : "rocket"} size={20} color={boostStatus?.active ? "#000" : "#FFF"} />
              </LinearGradient>
              <View>
                <Text style={[styles.settingsItemText, { fontWeight: 'bold' }, boostStatus?.active && { color: '#FFD700' }]}>
                  {boostStatus?.active ? "⚡ Boost Aktif!" : "⚡ Boost"}
                </Text>
                <Text style={[styles.boostSubtext, boostStatus?.active && { color: 'rgba(255, 215, 0, 0.7)' }]}>
                  {boostStatus?.active
                    ? `Bitiş: ${getTimeRemaining(boostStatus.endsAt!)}`
                    : premiumStatus?.isPremium
                      ? `Kalan Hakkın: ${boostStatus?.boostsRemaining || 0}`
                      : "Profilini öne çıkar"}
                </Text>
              </View>
            </View>
            <Ionicons
              name={boostStatus?.active ? "checkmark-circle" : "chevron-forward"}
              size={20}
              color={boostStatus?.active ? "#FFD700" : colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={() => router.push("/profile-edit")}>
            <View style={styles.settingsItemLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.settingsItemText}>Profili Düzenle</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondaryDark} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
            <View style={styles.settingsItemLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
              </View>
              <Text style={[styles.settingsItemText, { color: colors.error }]}>Çıkış Yap</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondaryDark} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Banner Ad for non-premium users */}
      <BannerAdComponent style={{ marginBottom: 8 }} />

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={32} color={colors.error} />
            </View>
            <Text style={styles.modalTitle}>Çıkış Yap</Text>
            <Text style={styles.modalMessage}>
              Hesabından çıkış yapmak istediğine emin misin?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmLogout}
              >
                <Text style={styles.modalButtonConfirmText}>Çıkış Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundDark,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
    position: "relative",
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: colors.backgroundDark,
    opacity: 0.5,
  },

  // Avatar
  avatarContainer: {
    position: "relative",
    marginBottom: spacing.md,
  },
  avatarGlow: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 70,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFF",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFF",
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFF",
  },
  premiumBadgeSmall: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.backgroundDark,
  },
  premiumBadgeSmallText: {
    fontSize: 14,
  },

  // Name & Location
  displayName: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.textDark,
    marginBottom: 4,
  },
  age: {
    fontWeight: "400",
    color: colors.textSecondaryDark,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.md,
  },
  location: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },

  // Edit Button
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  editButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    backgroundColor: colors.backgroundSecondaryDark,
    marginHorizontal: spacing.lg,
    marginTop: -15,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textDark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondaryDark,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderDark,
  },

  // Cards
  card: {
    backgroundColor: colors.backgroundSecondaryDark,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textDark,
  },

  // Languages
  languageSection: {
    marginTop: spacing.sm,
  },
  languageSectionTitle: {
    fontSize: 12,
    color: colors.textSecondaryDark,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  languageTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  languageTagText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.primary,
  },

  // Bio
  bioText: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 24,
  },

  // Premium Active
  premiumActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: spacing.md,
  },
  premiumActiveIcon: {
    fontSize: 14,
  },
  premiumActiveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  premiumExpiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.md,
  },
  premiumExpiryText: {
    fontSize: 14,
    color: colors.textSecondaryDark,
  },
  premiumBenefits: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  premiumBenefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumBenefitText: {
    fontSize: 12,
    color: colors.textDark,
  },

  // Premium Upgrade
  premiumUpgradeHeader: {
    marginBottom: spacing.md,
  },
  premiumUpgradeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textDark,
    marginBottom: 4,
  },
  premiumUpgradeSubtitle: {
    fontSize: 14,
    color: colors.textSecondaryDark,
  },
  premiumUpgradeButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  premiumUpgradeButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  premiumUpgradeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },

  // Settings Section
  settingsSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderDark,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsItemText: {
    fontSize: 15,
    color: colors.textDark,
  },
  boostItem: {
    backgroundColor: colors.primary + '08',
    borderBottomColor: colors.primary + '20',
  },
  boostSubtext: {
    fontSize: 12,
    color: colors.textSecondaryDark,
    marginTop: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 24,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error + '15',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondaryDark,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  modalButtonConfirm: {
    backgroundColor: colors.error,
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textDark,
  },
  modalButtonConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
});
