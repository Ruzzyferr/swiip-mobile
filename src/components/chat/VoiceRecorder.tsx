import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Modal,
    Linking,
    Dimensions,
    Platform,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withTiming,
    withSequence,
    interpolate,
    Extrapolation,
    cancelAnimation,
    runOnJS,
    SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    useAudioRecorder,
    useAudioRecorderState,
    AudioModule,
    RecordingPresets,
    AudioPlayer,
} from "expo-audio";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CANCEL_THRESHOLD = -80;

type RecordingState = "idle" | "recording" | "preview";

type VoiceRecorderProps = {
    onSend: (uri: string) => Promise<void>;
    onCancel: () => void;
    onRecordingStateChange?: (isActive: boolean) => void;
    disabled?: boolean;
};

const NUM_BARS = 20;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const MAX_BAR_HEIGHT = 24;
const MIN_BAR_HEIGHT = 4;

type WaveformBarProps = {
    barHeight: SharedValue<number>;
    isRecording: boolean;
};

function WaveformBar({ barHeight, isRecording }: WaveformBarProps) {
    const animatedBarStyle = useAnimatedStyle(() => ({
        height: barHeight.value,
    }));

    return (
        <Animated.View
            style={[
                styles.bar,
                animatedBarStyle,
                isRecording && styles.barRecording,
            ]}
        />
    );
}

// Waveform bars component
function WaveformBars({
    isRecording,
    meteringValue,
}: {
    isRecording: boolean;
    meteringValue: number;
}) {
    const bar0 = useSharedValue(MIN_BAR_HEIGHT);
    const bar1 = useSharedValue(MIN_BAR_HEIGHT);
    const bar2 = useSharedValue(MIN_BAR_HEIGHT);
    const bar3 = useSharedValue(MIN_BAR_HEIGHT);
    const bar4 = useSharedValue(MIN_BAR_HEIGHT);
    const bar5 = useSharedValue(MIN_BAR_HEIGHT);
    const bar6 = useSharedValue(MIN_BAR_HEIGHT);
    const bar7 = useSharedValue(MIN_BAR_HEIGHT);
    const bar8 = useSharedValue(MIN_BAR_HEIGHT);
    const bar9 = useSharedValue(MIN_BAR_HEIGHT);
    const bar10 = useSharedValue(MIN_BAR_HEIGHT);
    const bar11 = useSharedValue(MIN_BAR_HEIGHT);
    const bar12 = useSharedValue(MIN_BAR_HEIGHT);
    const bar13 = useSharedValue(MIN_BAR_HEIGHT);
    const bar14 = useSharedValue(MIN_BAR_HEIGHT);
    const bar15 = useSharedValue(MIN_BAR_HEIGHT);
    const bar16 = useSharedValue(MIN_BAR_HEIGHT);
    const bar17 = useSharedValue(MIN_BAR_HEIGHT);
    const bar18 = useSharedValue(MIN_BAR_HEIGHT);
    const bar19 = useSharedValue(MIN_BAR_HEIGHT);

    const barHeights = useMemo(
        () => [
            bar0, bar1, bar2, bar3, bar4, bar5, bar6, bar7, bar8, bar9,
            bar10, bar11, bar12, bar13, bar14, bar15, bar16, bar17, bar18, bar19,
        ],
        [bar0, bar1, bar2, bar3, bar4, bar5, bar6, bar7, bar8, bar9,
            bar10, bar11, bar12, bar13, bar14, bar15, bar16, bar17, bar18, bar19]
    );

    useEffect(() => {
        if (isRecording && meteringValue !== 0) {
            const normalizedValue = Math.max(0, Math.min(1, (meteringValue + 60) / 60));
            const newBarHeight = MIN_BAR_HEIGHT + normalizedValue * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);

            for (let i = 0; i < NUM_BARS - 1; i++) {
                barHeights[i].value = barHeights[i + 1].value;
            }

            barHeights[NUM_BARS - 1].value = withSpring(newBarHeight, {
                damping: 15,
                stiffness: 300,
            });
        }
    }, [isRecording, meteringValue, barHeights]);

    useEffect(() => {
        if (!isRecording) {
            barHeights.forEach((bar) => {
                bar.value = withTiming(MIN_BAR_HEIGHT, { duration: 200 });
            });
        }
    }, [isRecording, barHeights]);

    return (
        <View style={styles.waveform}>
            {barHeights.map((barHeight, index) => (
                <WaveformBar
                    key={index}
                    barHeight={barHeight}
                    isRecording={isRecording}
                />
            ))}
        </View>
    );
}

export function VoiceRecorder({
    onSend,
    onCancel,
    onRecordingStateChange,
    disabled,
}: VoiceRecorderProps) {
    const insets = useSafeAreaInsets();
    const [recordingState, setRecordingState] = useState<RecordingState>("idle");
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sending, setSending] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [meteringValue, setMeteringValue] = useState(0);

    const isStoppingRef = useRef(false);
    const isTogglingRef = useRef(false);
    const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const playerRef = useRef<AudioPlayer | null>(null);

    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status: any) => {
        if (status.isRecording) {
            const metering = status.metering ?? -30;
            setMeteringValue(metering);
        }
    });

    const recorderState = useAudioRecorderState(audioRecorder, 100);

    // Animation values
    const pulseScale = useSharedValue(1);
    const micScale = useSharedValue(1);
    const translateX = useSharedValue(0);

    // Notify parent of recording state changes
    useEffect(() => {
        onRecordingStateChange?.(recordingState !== "idle");
    }, [recordingState, onRecordingStateChange]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    const cleanup = useCallback(async () => {
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }

        cancelAnimation(pulseScale);
        cancelAnimation(micScale);
        cancelAnimation(translateX);
        pulseScale.value = 1;
        micScale.value = 1;
        translateX.value = 0;

        try {
            if (recorderState.isRecording) {
                await audioRecorder.stop();
            }
        } catch (error) {
            console.warn("Cleanup: Failed to stop recorder:", error);
        }

        // Release player
        if (playerRef.current) {
            try {
                playerRef.current.remove();
            } catch (e) {
                console.warn("Failed to remove player:", e);
            }
            playerRef.current = null;
        }
    }, [audioRecorder, pulseScale, micScale, translateX, recorderState.isRecording]);

    const requestPermissions = async (): Promise<boolean> => {
        try {
            const currentStatus = await AudioModule.getRecordingPermissionsAsync();
            console.log("Current permission status:", currentStatus);

            if (currentStatus.granted) {
                return true;
            }

            if (currentStatus.canAskAgain) {
                const permissionResult = await AudioModule.requestRecordingPermissionsAsync();
                console.log("Permission request result:", permissionResult);

                if (permissionResult.granted) {
                    return true;
                }
            }

            console.log("Permission denied, showing modal");
            setShowPermissionModal(true);
            return false;
        } catch (error) {
            console.error("Permission request error:", error);
            setShowPermissionModal(true);
            return false;
        }
    };

    const startRecording = async () => {
        try {
            if (recorderState.isRecording) {
                console.log("Already recording, ignoring start request");
                return;
            }

            console.log("Starting recording process...");

            const hasPermission = await requestPermissions();
            if (!hasPermission) {
                console.log("No permission, aborting recording");
                return;
            }

            await AudioModule.setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
            });

            console.log("Preparing recorder...");
            await audioRecorder.prepareToRecordAsync();
            console.log("Recorder prepared");

            console.log("Starting recorder...");
            audioRecorder.record();
            console.log("Recorder started");

            setRecordingState("recording");
            setDuration(0);
            setMeteringValue(0);

            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.3, { duration: 500 }),
                    withTiming(1, { duration: 500 })
                ),
                -1,
                false
            );

            micScale.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 800 }),
                    withTiming(1, { duration: 800 })
                ),
                -1,
                false
            );

            durationInterval.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Start recording failed:", error);
            setShowPermissionModal(true);
        }
    };

    const stopRecording = async () => {
        console.log("stopRecording called", {
            recordingState,
            isRecording: recorderState.isRecording,
            isStopping: isStoppingRef.current,
        });

        if (recordingState !== "recording" || isStoppingRef.current) {
            console.log("Not in recording state or already stopping, ignoring");
            return;
        }

        isStoppingRef.current = true;

        try {
            cancelAnimation(pulseScale);
            cancelAnimation(micScale);
            pulseScale.value = 1;
            micScale.value = 1;

            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }

            console.log("Stopping recorder...");
            await audioRecorder.stop();
            console.log("Recorder stopped");

            const uri = audioRecorder.uri;
            console.log("Recording URI:", uri);

            if (!uri) {
                console.error("Recording URI is null");
                setRecordingState("idle");
                isStoppingRef.current = false;
                return;
            }

            console.log("Recording stopped successfully, URI:", uri);
            setAudioUri(uri);
            setRecordingState("preview");

            // Set audio mode for playback
            await AudioModule.setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: false,
            });

            // Create player using Audio.createAudioPlayer
            console.log("Creating audio player for:", uri);
            const { createAudioPlayer } = await import("expo-audio");

            // Release old player if exists
            if (playerRef.current) {
                try {
                    playerRef.current.remove();
                } catch (e) { }
            }

            playerRef.current = createAudioPlayer({ uri });
            console.log("Player created:", playerRef.current?.id);

        } catch (error) {
            console.error("Failed to stop recording:", error);
            setRecordingState("idle");
        } finally {
            isStoppingRef.current = false;
        }
    };

    const togglePlayback = async () => {
        // Debounce
        if (isTogglingRef.current) {
            console.log("togglePlayback debounced");
            return;
        }
        isTogglingRef.current = true;

        const player = playerRef.current;
        console.log("togglePlayback called", {
            hasPlayer: !!player,
            isLoaded: player?.isLoaded,
            playing: player?.playing,
            duration: player?.duration,
        });

        if (!player) {
            console.log("Player is null");
            isTogglingRef.current = false;
            return;
        }

        try {
            if (player.playing) {
                console.log("Pausing playback");
                player.pause();
                setIsPlaying(false);
            } else {
                console.log("Starting playback");
                player.volume = 1;
                player.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error("Playback error:", error);
        }

        setTimeout(() => {
            isTogglingRef.current = false;
        }, 300);
    };

    const handleDelete = async () => {
        cancelAnimation(pulseScale);
        cancelAnimation(micScale);
        translateX.value = 0;
        isStoppingRef.current = false;

        // Release player
        if (playerRef.current) {
            try {
                playerRef.current.remove();
            } catch (e) { }
            playerRef.current = null;
        }

        await cleanup();
        setRecordingState("idle");
        setAudioUri(null);
        setDuration(0);
        setMeteringValue(0);
        setIsPlaying(false);

        onCancel();
    };

    const handleSend = async () => {
        if (!audioUri) return;

        setSending(true);
        isStoppingRef.current = false;

        try {
            // Release player before sending
            if (playerRef.current) {
                try {
                    playerRef.current.remove();
                } catch (e) { }
                playerRef.current = null;
            }

            await onSend(audioUri);
            await cleanup();
            setRecordingState("idle");
            setAudioUri(null);
            setDuration(0);
            setMeteringValue(0);
            setIsPlaying(false);
        } catch (error) {
            console.error("Send error:", error);
        } finally {
            setSending(false);
        }
    };

    const openAppSettings = async () => {
        try {
            if (Platform.OS === "ios") {
                await Linking.openURL("app-settings:");
            } else {
                await Linking.openSettings();
            }
        } catch (error) {
            console.error("Failed to open settings:", error);
        }
        setShowPermissionModal(false);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Animated styles
    const pulseAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: interpolate(pulseScale.value, [1, 1.3], [1, 0.6]),
    }));

    const micAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: micScale.value },
            { translateX: translateX.value },
        ],
    }));

    const cancelOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [CANCEL_THRESHOLD, 0],
            [1, 0.5],
            Extrapolation.CLAMP
        ),
    }));

    // Gestures
    const tapGesture = Gesture.Tap().onEnd(() => {
        runOnJS(stopRecording)();
    });

    const panGesture = Gesture.Pan()
        .activeOffsetX([-20, 20])
        .onUpdate((event) => {
            if (event.translationX < 0) {
                translateX.value = Math.max(
                    event.translationX,
                    CANCEL_THRESHOLD - 20
                );
            }
        })
        .onEnd((event) => {
            if (event.translationX < CANCEL_THRESHOLD) {
                translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
                    runOnJS(handleDelete)();
                });
            } else {
                translateX.value = withSpring(0);
            }
        });

    const composedGesture = Gesture.Race(tapGesture, panGesture);

    // Permission Modal
    const renderPermissionModal = () => (
        <Modal
            visible={showPermissionModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPermissionModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalIconContainer}>
                        <MaterialIcons name="mic" size={48} color={colors.primary} />
                    </View>
                    <Text style={styles.modalTitle}>Mikrofon İzni Gerekli</Text>
                    <Text style={styles.modalText}>
                        Ses mesajı gönderebilmek için mikrofon erişimine ihtiyacımız var.
                        Lütfen ayarlardan izin verin.
                    </Text>
                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.modalButtonPrimary}
                            onPress={openAppSettings}
                        >
                            <Text style={styles.modalButtonPrimaryText}>Ayarları Aç</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalButtonSecondary}
                            onPress={() => setShowPermissionModal(false)}
                        >
                            <Text style={styles.modalButtonSecondaryText}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Idle state
    if (recordingState === "idle") {
        return (
            <>
                <Pressable
                    style={({ pressed }) => [
                        styles.micButton,
                        pressed && styles.micButtonPressed,
                        disabled && styles.micButtonDisabled,
                    ]}
                    onLongPress={startRecording}
                    delayLongPress={200}
                    disabled={disabled}
                >
                    <MaterialIcons
                        name="mic"
                        size={24}
                        color={disabled ? colors.textTertiary : colors.primary}
                    />
                </Pressable>
                {renderPermissionModal()}
            </>
        );
    }

    // Recording state
    if (recordingState === "recording") {
        return (
            <View style={styles.recordingContainer}>
                <View style={styles.recordingLeft}>
                    <Animated.View style={[styles.recordingDot, pulseAnimatedStyle]} />
                    <Text style={styles.durationText}>{formatTime(duration)}</Text>
                </View>

                <Animated.View style={[styles.cancelArea, cancelOpacityStyle]}>
                    <MaterialIcons
                        name="chevron-left"
                        size={18}
                        color={colors.textSecondary}
                    />
                    <Text style={styles.cancelText}>İptal için kaydır</Text>
                </Animated.View>

                <GestureDetector gesture={composedGesture}>
                    <Animated.View style={[styles.micCircle, micAnimatedStyle]}>
                        <View style={styles.micButtonInner}>
                            <MaterialIcons name="mic" size={22} color="#FFF" />
                        </View>
                    </Animated.View>
                </GestureDetector>
                {renderPermissionModal()}
            </View>
        );
    }

    // Preview state
    return (
        <View style={styles.previewContainer}>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={sending}
            >
                <MaterialIcons name="delete" size={22} color={colors.error} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayback}
                disabled={sending}
            >
                <MaterialIcons
                    name={isPlaying ? "pause" : "play-arrow"}
                    size={24}
                    color={colors.primary}
                />
            </TouchableOpacity>

            <View style={styles.waveformContainer}>
                <WaveformBars isRecording={false} meteringValue={meteringValue} />
            </View>

            <Text style={styles.previewDuration}>{formatTime(duration)}</Text>

            <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={sending}
            >
                <MaterialIcons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
            {renderPermissionModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    micButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
    },
    micButtonPressed: {
        backgroundColor: colors.primary + "30",
        transform: [{ scale: 1.1 }],
    },
    micButtonDisabled: {
        opacity: 0.5,
    },
    recordingContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.surfaceDark,
        borderRadius: 28,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.primary + "30",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    recordingLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.recordingRed,
        shadowColor: colors.recordingRed,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 2,
    },
    durationText: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.text,
        letterSpacing: 0.5,
    },
    cancelArea: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        opacity: 0.7,
    },
    cancelText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    micCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    micButtonInner: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    previewContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surfaceDark,
        borderRadius: 28,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.primary + "30",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    deleteButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.recordingRedSoft,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.recordingRedBorder,
    },
    playButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.primary + "20",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.primary + "30",
    },
    waveformContainer: {
        flex: 1,
        height: MAX_BAR_HEIGHT,
        justifyContent: "center",
    },
    waveform: {
        flexDirection: "row",
        alignItems: "center",
        height: MAX_BAR_HEIGHT,
        gap: BAR_GAP,
    },
    bar: {
        width: BAR_WIDTH,
        backgroundColor: colors.primary + "40",
        borderRadius: BAR_WIDTH / 2,
    },
    barRecording: {
        backgroundColor: colors.primary,
    },
    previewDuration: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        minWidth: 40,
        textAlign: "center",
        letterSpacing: 0.5,
    },
    sendButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 5,
    },
    sendButtonDisabled: {
        backgroundColor: colors.textTertiary + "50",
        shadowOpacity: 0,
        elevation: 0,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
    },
    modalCard: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 24,
        padding: spacing.xl,
        width: "100%",
        maxWidth: 340,
        alignItems: "center",
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary + "20",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
        marginBottom: spacing.sm,
    },
    modalText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: spacing.xl,
    },
    modalActions: {
        width: "100%",
        gap: spacing.sm,
    },
    modalButtonPrimary: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: "center",
    },
    modalButtonPrimaryText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
    },
    modalButtonSecondary: {
        backgroundColor: "transparent",
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: "center",
    },
    modalButtonSecondaryText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "500",
    },
});