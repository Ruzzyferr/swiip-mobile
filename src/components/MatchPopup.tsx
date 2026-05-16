import React, { useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withDelay,
    withTiming,
    runOnJS,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { colors } from "@/src/theme/colors";
import { NewMatchEvent } from "@/src/state/socket";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface MatchPopupProps {
    visible: boolean;
    match: NewMatchEvent | null;
    onClose: () => void;
    onSendMessage: () => void;
}

export function MatchPopup({ visible, match, onClose, onSendMessage }: MatchPopupProps) {
    const router = useRouter();
    const { t } = useTranslation();
    const reducedMotion = useReducedMotion();
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const heartScale = useSharedValue(0);

    useEffect(() => {
        if (visible && match) {
            opacity.value = withTiming(1, { duration: 300 });
            if (reducedMotion) {
                // Skip the bouncy spring; just fade/scale linearly.
                scale.value = withTiming(1, { duration: 200 });
                heartScale.value = withTiming(1, { duration: 200 });
            } else {
                scale.value = withSpring(1, { damping: 12, stiffness: 180 });
                heartScale.value = withDelay(200, withSequence(
                    withSpring(1.3, { damping: 8, stiffness: 200 }),
                    withSpring(1, { damping: 15, stiffness: 200 })
                ));
            }
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            scale.value = withTiming(0, { duration: 200 });
            heartScale.value = 0;
        }
    }, [visible, match, reducedMotion]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const heartStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    const handleSendMessage = (prefill?: string) => {
        if (match) {
            onClose();
            const route = prefill
                ? `/conversation/${match.conversationId}?prefill=${encodeURIComponent(prefill)}`
                : `/conversation/${match.conversationId}`;
            router.push(route as any);
        }
    };

    if (!match) return null;

    const photo = match.otherUser.photos?.[0];

    // i18next array-returning syntax. Fallback to empty array if missing locale.
    const rawIcebreakers = t("home.match.icebreakers", {
        returnObjects: true,
        name: match.otherUser.displayName,
    }) as unknown;
    const icebreakers: string[] = Array.isArray(rawIcebreakers)
        ? (rawIcebreakers as string[])
        : [];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

                <Animated.View style={[styles.container, containerStyle]}>
                    {/* Gradient Background */}
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradient}
                    >
                        {/* Close button */}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel={t("common.close")}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close" size={24} color={colors.onMediaMuted} />
                        </TouchableOpacity>

                        {/* Heart icon */}
                        <Animated.View style={[styles.heartContainer, heartStyle]}>
                            <LinearGradient
                                colors={[colors.accent, colors.accentDark]}
                                style={styles.heartGradient}
                            >
                                <Ionicons name="heart" size={32} color={colors.onMedia} />
                            </LinearGradient>
                        </Animated.View>

                        {/* It's a Match! */}
                        <Text style={styles.title}>{t("home.match.title")}</Text>
                        <Text style={styles.subtitle}>
                            {t("home.match.subtitle", { name: match.otherUser.displayName })}
                        </Text>

                        {/* Profile Photo */}
                        <View style={styles.photoContainer}>
                            {photo ? (
                                <Image source={{ uri: photo }} style={styles.photo} />
                            ) : (
                                <View style={[styles.photo, styles.placeholderPhoto]}>
                                    <Ionicons name="person" size={48} color={colors.onMediaSubtle} />
                                </View>
                            )}
                        </View>

                        <Text style={styles.name}>{match.otherUser.displayName}</Text>

                        {/* Icebreaker Suggestions */}
                        {icebreakers.length > 0 && (
                            <View style={styles.icebreakerSection}>
                                <Text style={styles.icebreakerLabel}>
                                    {t("home.match.icebreaker_label")}
                                </Text>
                                <View style={styles.icebreakerChips}>
                                    {icebreakers.map((message, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={styles.icebreakerChip}
                                            onPress={() => handleSendMessage(message)}
                                            activeOpacity={0.7}
                                            accessibilityRole="button"
                                            accessibilityLabel={message}
                                        >
                                            <Text style={styles.icebreakerChipText} numberOfLines={2}>
                                                {message}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.buttonsContainer}>
                            <TouchableOpacity
                                style={styles.messageButton}
                                onPress={() => handleSendMessage()}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel={t("home.match.say_hi")}
                            >
                                <LinearGradient
                                    colors={[colors.onMedia, colors.surfaceHover]}
                                    style={styles.messageButtonGradient}
                                >
                                    <Ionicons name="chatbubble" size={20} color={colors.primary} />
                                    <Text style={styles.messageButtonText}>{t("home.match.say_hi")}</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.laterButton}
                                onPress={onClose}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={t("home.match.continue")}
                            >
                                <Text style={styles.laterButtonText}>{t("home.match.continue")}</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.overlay,
    },
    container: {
        width: SCREEN_WIDTH * 0.85,
        maxWidth: 360,
        borderRadius: 28,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 25,
    },
    gradient: {
        padding: 24,
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.1)",
        justifyContent: "center",
        alignItems: "center",
    },
    heartContainer: {
        marginTop: 16,
        marginBottom: 8,
    },
    heartGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: colors.onMedia,
        marginTop: 12,
        textShadowColor: "rgba(0,0,0,0.2)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.8)",
        marginTop: 4,
        textAlign: "center",
    },
    photoContainer: {
        marginTop: 24,
        marginBottom: 12,
    },
    photo: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: colors.onMedia,
    },
    placeholderPhoto: {
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    name: {
        fontSize: 22,
        fontWeight: "700",
        color: colors.onMedia,
        marginBottom: 16,
    },
    icebreakerSection: {
        width: "100%",
        marginBottom: 16,
    },
    icebreakerLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.onMediaMuted,
        textTransform: "uppercase",
        letterSpacing: 1,
        textAlign: "center",
        marginBottom: 8,
    },
    icebreakerChips: {
        gap: 8,
    },
    icebreakerChip: {
        backgroundColor: colors.surfaceTintStrong,
        borderWidth: 1,
        borderColor: colors.surfaceTintBorder,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 44, // accessibility touch target
    },
    icebreakerChipText: {
        color: colors.onMedia,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "left",
    },
    buttonsContainer: {
        width: "100%",
        gap: 12,
    },
    messageButton: {
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
    },
    messageButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        paddingHorizontal: 24,
        gap: 8,
    },
    messageButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.primary,
    },
    laterButton: {
        paddingVertical: 12,
        alignItems: "center",
    },
    laterButtonText: {
        fontSize: 14,
        color: "rgba(255,255,255,0.7)",
        fontWeight: "500",
    },
});
