import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { api } from "@/src/services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { OptimizedImage } from "./ui/OptimizedImage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type ProfileData = {
    id: string;
    userId: string;
    displayName: string;
    birthYear: number | null;
    city: string | null;
    languagesNative: string[];
    languagesPractice: string[];
    purpose: "CONVERSATION" | "PRACTICE" | "COFFEE" | "DATING" | "FRIENDSHIP";
    bio: string | null;
    photos: string[];
};

type ProfileModalProps = {
    visible: boolean;
    onClose: () => void;
    userId: string | null;
    // Optional: Action buttons for likes screen
    showActions?: boolean;
    onAccept?: () => void;
    onDecline?: () => void;
    // Optional: First message for FAVORITE requests
    firstMessage?: { text: string } | null;
};

export function ProfileModal({
    visible,
    onClose,
    userId,
    showActions = false,
    onAccept,
    onDecline,
    firstMessage,
}: ProfileModalProps) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);

    useEffect(() => {
        if (visible && userId) {
            loadProfile();
        } else {
            setProfileData(null);
            setLoading(true);
        }
    }, [visible, userId]);

    const loadProfile = async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const profile = await api.getUserProfile(userId);
            setProfileData(profile);
        } catch (error) {
            console.error("Failed to load profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setProfileData(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="slide"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            {loading ? (
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingSpinner}>
                        <Ionicons name="reload" size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.loadingText}>{t('profile.loading')}</Text>
                </View>
            ) : profileData ? (
                <View style={styles.container}>
                    <ScrollView
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: showActions ? 120 : 40 }}
                    >
                        {/* Photo Carousel */}
                        <View style={styles.carouselContainer}>
                            <ScrollView
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                decelerationRate="fast"
                            >
                                {profileData.photos && profileData.photos.length > 0 ? (
                                    profileData.photos.map((photo, index) => (
                                        <OptimizedImage
                                            key={index}
                                            source={{ uri: photo }}
                                            style={styles.carouselPhoto}
                                            containerStyle={styles.carouselPhoto}
                                            resizeMode="cover"
                                            fallbackIconSize={64}
                                        />
                                    ))
                                ) : (
                                    <View style={[styles.carouselPhoto, styles.carouselPlaceholder]}>
                                        <Text style={styles.carouselPlaceholderText}>
                                            {profileData.displayName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>

                            {/* Gradient Overlay */}
                            <LinearGradient
                                colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.9)"]}
                                style={styles.carouselGradient}
                            />

                            {/* Close Button */}
                            <TouchableOpacity
                                style={styles.floatingCloseButton}
                                onPress={handleClose}
                            >
                                <Ionicons name="close" size={28} color={colors.onMedia} />
                            </TouchableOpacity>

                            {/* Pagination Dots */}
                            {profileData.photos && profileData.photos.length > 1 && (
                                <View style={styles.paginationContainer}>
                                    {profileData.photos.map((_, index) => (
                                        <View key={index} style={[styles.paginationDot, { opacity: 0.8 }]} />
                                    ))}
                                </View>
                            )}

                            {/* Name & Basic Info Overlay */}
                            <View style={styles.headerInfoOverlay}>
                                <Text style={styles.headerName}>
                                    {profileData.displayName}
                                    {profileData.birthYear ? `, ${new Date().getFullYear() - profileData.birthYear}` : ""}
                                </Text>
                                <View style={styles.headerLocation}>
                                    <Ionicons name="location" size={16} color={colors.primary} />
                                    <Text style={styles.headerLocationText}>
                                        {profileData.city || t('profile.location.unknown')}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Profile Details Content */}
                        <View style={styles.profileDetailsContent}>
                            {/* Bio Section */}
                            {profileData.bio && (
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailTitle}>{t('profile.about')}</Text>
                                    <Text style={styles.bioText}>{profileData.bio}</Text>
                                </View>
                            )}

                            {/* First Message (for FAVORITE requests) */}
                            {firstMessage && (
                                <View style={styles.favoriteMessageHighlight}>
                                    <LinearGradient
                                        colors={[colors.accent + "20", colors.primary + "10"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.favoriteMessageContent}
                                    >
                                        <View style={styles.favoriteHeader}>
                                            <Ionicons name="star" size={16} color={colors.accent} />
                                            <Text style={styles.favoriteLabel}>{t('profile.special_message')}</Text>
                                        </View>
                                        <Text style={styles.favoriteText}>"{firstMessage.text}"</Text>
                                    </LinearGradient>
                                </View>
                            )}

                            {/* Purpose Chip */}
                            <View style={styles.detailSection}>
                                <Text style={styles.detailTitle}>{t('profile.seeking')}</Text>
                                <View style={styles.chipContainer}>
                                    <View style={styles.purposeChip}>
                                        <Text style={styles.purposeText}>
                                            {t(`profile.purposes.${profileData.purpose.toLowerCase()}`, profileData.purpose)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Languages */}
                            <View style={styles.detailSection}>
                                <Text style={styles.detailTitle}>{t('profile.languages')}</Text>
                                <View style={styles.languageTags}>
                                    {profileData.languagesNative.map((lang, index) => (
                                        <View key={`native-${index}`} style={[styles.langTag, styles.nativeTag]}>
                                            <Text style={styles.langText}>{lang}</Text>
                                        </View>
                                    ))}
                                    {profileData.languagesPractice.map((lang, index) => (
                                        <View key={`practice-${index}`} style={[styles.langTag, styles.practiceTag]}>
                                            <Text style={styles.langText}>{lang}</Text>
                                            <Ionicons
                                                name="school-outline"
                                                size={12}
                                                color={colors.textSecondaryDark}
                                                style={{ marginLeft: 4 }}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Floating Action Buttons */}
                    {showActions && onAccept && onDecline && (
                        <LinearGradient
                            colors={["transparent", "rgba(10, 10, 20, 0.95)", "rgba(10, 10, 20, 1)"]}
                            style={[
                                styles.floatingActionsOverlay,
                                {
                                    paddingBottom: 20 + insets.bottom,
                                    height: 120 + insets.bottom,
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={[styles.floatingActionBtn, styles.declineFab]}
                                onPress={() => {
                                    handleClose();
                                    onDecline();
                                }}
                            >
                                <Ionicons name="close" size={32} color={colors.passRed} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.floatingActionBtn, styles.acceptFab]}
                                onPress={() => {
                                    handleClose();
                                    onAccept();
                                }}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.primaryLight]}
                                    style={styles.acceptFabGradient}
                                >
                                    <Ionicons name="heart" size={32} color={colors.onMedia} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </LinearGradient>
                    )}
                </View>
            ) : (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{t('profile.load_error')}</Text>
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <Text style={styles.closeText}>{t('common.close')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.backgroundDark,
    },
    loadingSpinner: {
        marginBottom: spacing.md,
    },
    loadingText: {
        color: colors.textSecondaryDark,
        fontSize: 16,
    },
    container: {
        flex: 1,
        backgroundColor: colors.backgroundDark,
    },
    carouselContainer: {
        height: SCREEN_HEIGHT * 0.65,
        position: "relative",
    },
    carouselPhoto: {
        width: SCREEN_WIDTH,
        height: "100%",
    },
    carouselPlaceholder: {
        backgroundColor: colors.primaryDark,
        justifyContent: "center",
        alignItems: "center",
    },
    carouselPlaceholderText: {
        fontSize: 80,
        fontWeight: "bold",
        color: "rgba(255,255,255,0.3)",
    },
    carouselGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    floatingCloseButton: {
        position: "absolute",
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.overlayLight,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
        borderWidth: 1,
        borderColor: colors.surfaceTintBorder,
    },
    paginationContainer: {
        position: "absolute",
        top: 50,
        left: 20,
        flexDirection: "row",
        gap: 6,
    },
    paginationDot: {
        width: 30,
        height: 4,
        backgroundColor: "rgba(255,255,255,0.5)",
        borderRadius: 2,
    },
    headerInfoOverlay: {
        position: "absolute",
        bottom: 30,
        left: 20,
        right: 20,
    },
    headerName: {
        fontSize: 32,
        fontWeight: "800",
        color: colors.onMedia,
        textShadowColor: colors.shadowStrong,
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        marginBottom: 4,
    },
    headerLocation: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    headerLocationText: {
        fontSize: 16,
        color: colors.onMediaSubtle,
        fontWeight: "500",
    },
    profileDetailsContent: {
        padding: spacing.lg,
        paddingTop: spacing.md,
    },
    detailSection: {
        marginBottom: spacing.xl,
    },
    detailTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.textSecondaryDark,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    bioText: {
        fontSize: 16,
        color: colors.textDark,
        lineHeight: 24,
        fontWeight: "400",
    },
    chipContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    purposeChip: {
        backgroundColor: colors.backgroundSecondaryDark,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary + "40",
    },
    purposeText: {
        color: colors.primary,
        fontWeight: "600",
        fontSize: 14,
    },
    languageTags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    langTag: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    nativeTag: {
        backgroundColor: colors.surfaceTint,
        borderColor: colors.surfaceTintBorder,
    },
    practiceTag: {
        backgroundColor: "transparent",
        borderColor: colors.surfaceTintBorder,
        borderStyle: "dashed",
        flexDirection: "row",
        alignItems: "center",
    },
    langText: {
        color: colors.textDark,
        fontSize: 14,
    },
    favoriteMessageHighlight: {
        marginBottom: spacing.xl,
    },
    favoriteMessageContent: {
        padding: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.accent + "50",
    },
    favoriteHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    favoriteLabel: {
        color: colors.accent,
        fontWeight: "700",
        fontSize: 12,
        textTransform: "uppercase",
    },
    favoriteText: {
        color: colors.onMedia,
        fontSize: 16,
        fontStyle: "italic",
        lineHeight: 22,
    },
    floatingActionsOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 30,
        paddingBottom: 20,
    },
    floatingActionBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    declineFab: {
        backgroundColor: colors.surfaceDark,
        borderWidth: 1,
        borderColor: colors.passRedBorder,
    },
    acceptFab: {
        overflow: "hidden",
    },
    acceptFabGradient: {
        width: "100%",
        height: "100%",
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.backgroundDark,
    },
    errorText: {
        color: colors.textSecondaryDark,
        fontSize: 16,
        marginBottom: spacing.lg,
    },
    closeButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    closeText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: "600",
    },
});
