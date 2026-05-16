import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Pressable, GestureResponderEvent } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { useFocusEffect } from "expo-router";
import { generateWaveform } from "@/src/utils/audioUtils";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing
} from "react-native-reanimated";

type AudioPlayerProps = {
    audioUrl: string;
    isMyMessage: boolean;
};

const WAVEFORM_BARS = 28; // Slightly fewer bars for cleaner look

// Animated Waveform Bar Component
const WaveformBar = ({
    heightScale,
    index,
    progress,
    isMyMessage
}: {
    heightScale: number;
    index: number;
    progress: Animated.SharedValue<number>;
    isMyMessage: boolean;
}) => {
    const barPosition = index / WAVEFORM_BARS;

    const animatedStyle = useAnimatedStyle(() => {
        const isPlayed = barPosition < progress.value;

        // Custom colors for better contrast
        const activeColor = isMyMessage ? colors.onMedia : colors.primary;
        const inactiveColor = isMyMessage ? colors.onMediaFaint : colors.primaryFaint;

        return {
            backgroundColor: isPlayed ? activeColor : inactiveColor,
        };
    });

    return (
        <Animated.View
            style={[
                styles.waveBar,
                { height: Math.max(4, heightScale * 24) },
                animatedStyle
            ]}
        />
    );
};

export const AudioPlayer = ({ audioUrl, isMyMessage }: AudioPlayerProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [positionMs, setPositionMs] = useState(0);
    const playerRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);
    const waveformRef = useRef<View>(null);
    const hasFinishedRef = useRef(false);
    const isSeekingRef = useRef(false);

    const progress = useSharedValue(0);

    const waveform = useMemo(() =>
        generateWaveform(audioUrl, WAVEFORM_BARS),
        [audioUrl]);

    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
    const fullUrl = audioUrl.startsWith("http")
        ? audioUrl
        : `${baseUrl}${audioUrl}`;

    useFocusEffect(
        useCallback(() => {
            return () => {
                if (playerRef.current) {
                    playerRef.current.pause();
                    setIsPlaying(false);
                }
            };
        }, [])
    );

    useEffect(() => {
        let mounted = true;

        const initPlayer = async () => {
            try {
                const { createAudioPlayer, AudioModule } = await import("expo-audio");

                await AudioModule.setAudioModeAsync({
                    playsInSilentMode: true,
                    allowsRecording: false,
                });

                const player = createAudioPlayer({ uri: fullUrl });

                if (mounted) {
                    playerRef.current = player;

                    const checkLoaded = setInterval(() => {
                        if (player.isLoaded) {
                            setDuration(player.duration * 1000);
                            clearInterval(checkLoaded);
                        }
                    }, 100);

                    setTimeout(() => clearInterval(checkLoaded), 5000);
                }
            } catch (error) {
                console.error("Failed to init audio player:", error);
            }
        };

        initPlayer();

        return () => {
            mounted = false;
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (playerRef.current) {
                try {
                    playerRef.current.remove();
                } catch (e) { }
                playerRef.current = null;
            }
        };
    }, [fullUrl]);

    useEffect(() => {
        if (isPlaying && playerRef.current) {
            intervalRef.current = setInterval(() => {
                // Skip state sync if we're in the middle of a seek operation
                if (isSeekingRef.current) return;

                if (playerRef.current) {
                    const currentMs = playerRef.current.currentTime * 1000;
                    const isActuallyPlaying = playerRef.current.playing;

                    setPositionMs(currentMs);

                    const newProgress = duration > 0 ? currentMs / duration : 0;
                    progress.value = withTiming(newProgress, {
                        duration: 80,
                        easing: Easing.linear
                    });

                    // Check if audio finished playing (must have progressed past start)
                    if (!isActuallyPlaying && currentMs > 100 && currentMs >= (duration - 100)) {
                        // Audio finished - just stop, don't auto-restart
                        setIsPlaying(false);
                        hasFinishedRef.current = true;
                        // Reset UI to beginning
                        setPositionMs(0);
                        progress.value = withTiming(0, { duration: 200 });
                    }
                    // Removed the else-if that was causing issues during seek
                }
            }, 50);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPlaying, duration]);

    const playPause = async () => {
        const player = playerRef.current;
        if (!player) return;

        try {
            if (player.playing) {
                player.pause();
                setIsPlaying(false);
            } else {
                // If audio finished or at the end, seek to beginning first
                if (hasFinishedRef.current || player.currentTime >= player.duration - 0.2) {
                    player.seekTo(0);
                    setPositionMs(0);
                    progress.value = 0;
                    hasFinishedRef.current = false;
                    // Small delay to ensure seek completes before playing
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                player.volume = 1;
                player.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error("Playback error:", error);
        }
    };

    const handleSeekToPosition = async (evt: GestureResponderEvent) => {
        if (!playerRef.current || !duration) return;

        waveformRef.current?.measure(async (x, y, width, height, pageX, pageY) => {
            if (width > 0) {
                const touchX = evt.nativeEvent.pageX;
                const localX = touchX - pageX;
                const percentage = Math.max(0, Math.min(1, localX / width));
                const time = (percentage * duration) / 1000;

                // Mark that we're seeking - interval will ignore state changes
                isSeekingRef.current = true;

                // Update UI immediately
                progress.value = percentage;
                setPositionMs(time * 1000);
                hasFinishedRef.current = false;

                try {
                    // Use React state to determine if we should continue playing
                    const wasPlaying = isPlaying;

                    playerRef.current.seekTo(time);

                    // Small delay to let seek complete
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Only continue playing if it was already playing
                    if (wasPlaying) {
                        playerRef.current.play();
                        setIsPlaying(true);
                    }
                    // If it wasn't playing, just seek and stay paused
                } catch (e) {
                    console.error(e);
                } finally {
                    // Clear seeking flag after operation completes
                    isSeekingRef.current = false;
                }
            }
        });
    };

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, "0")}`;
    };

    const content = (
        <View style={styles.innerContainer}>
            <TouchableOpacity
                onPress={playPause}
                style={[styles.playButton, isMyMessage ? styles.playButtonMy : styles.playButtonOther]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <MaterialIcons
                    name={isPlaying ? "pause" : "play-arrow"}
                    size={20}
                    color={isMyMessage ? colors.primary : colors.surface}
                />
            </TouchableOpacity>

            <View style={styles.visualizationContainer}>
                <Pressable
                    ref={waveformRef}
                    style={styles.waveformContainer}
                    onPress={handleSeekToPosition}
                >
                    {waveform.map((heightScale, index) => (
                        <WaveformBar
                            key={index}
                            heightScale={heightScale}
                            index={index}
                            progress={progress}
                            isMyMessage={isMyMessage}
                        />
                    ))}
                </Pressable>

                <Text style={[styles.timeText, isMyMessage ? styles.timeTextMy : styles.timeTextOther]}>
                    {formatTime(positionMs || duration)}
                </Text>
            </View>
        </View>
    );

    if (isMyMessage) {
        return (
            <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.container, styles.containerMy]}
            >
                {content}
            </LinearGradient>
        );
    }

    return (
        <View style={[styles.container, styles.containerOther]}>
            {content}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 18,
        overflow: 'hidden',
        width: 170, // Fixed width for consistent look
    },
    containerMy: {
        // Gradient background handles styling
    },
    containerOther: {
        backgroundColor: colors.backgroundSecondaryDark,
        borderWidth: 1,
        borderColor: colors.borderDark,
    },
    innerContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    playButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    playButtonMy: {
        backgroundColor: colors.onMedia,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
        elevation: 5,
    },
    playButtonOther: {
        backgroundColor: colors.primary,
    },
    visualizationContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 4,
    },
    waveformContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 24,
        marginBottom: 4,
    },
    waveBar: {
        width: 3,
        borderRadius: 1.5,
        minHeight: 3,
    },
    timeText: {
        fontSize: 10,
        fontWeight: "600",
        textAlign: 'right',
        marginTop: 2,
    },
    timeTextMy: {
        color: colors.onMediaSubtle,
    },
    timeTextOther: {
        color: colors.textSecondary,
    },
});
