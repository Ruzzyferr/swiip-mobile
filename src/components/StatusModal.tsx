import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from "react-native";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";

type StatusModalProps = {
    visible: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
};

export function StatusModal({
    visible,
    type,
    title,
    message,
    buttonText = "Tamam",
    onClose,
}: StatusModalProps) {
    const getIcon = () => {
        switch (type) {
            case "success":
                return "🎉";
            case "error":
                return "❌";
            case "info":
                return "ℹ️";
            default:
                return "✨";
        }
    };

    const getTitleColor = () => {
        switch (type) {
            case "success":
                return colors.success;
            case "error":
                return colors.error;
            default:
                return colors.text;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Card style={styles.modalCard}>
                    <Text style={styles.icon}>{getIcon()}</Text>
                    <Text style={[styles.title, { color: getTitleColor() }]}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <PrimaryButton
                        title={buttonText}
                        onPress={onClose}
                        style={styles.button}
                    />
                </Card>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlayStrong,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.lg,
    },
    modalCard: {
        width: "100%",
        maxWidth: 340,
        padding: spacing.xl,
        alignItems: "center",
    },
    icon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        textAlign: "center",
        marginBottom: spacing.sm,
    },
    message: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: spacing.xl,
        lineHeight: 24,
    },
    button: {
        width: "100%",
    },
});
