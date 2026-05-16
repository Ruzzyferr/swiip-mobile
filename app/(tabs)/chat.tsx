import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { OptimizedImage } from "@/src/components/ui/OptimizedImage";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ChatListItem } from "@/src/components/chat/ChatListItem";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { getToken } from "@/src/services/authStore";
import { api } from "@/src/services/api";
import { AxiosError } from "axios";
import { BannerAdComponent } from "@/src/components/BannerAdComponent";
import { useSocket } from "@/src/state/socket";

type Conversation = {
  conversationId: string | null;
  matchId: string;
  otherUser: {
    userId: string;
    displayName: string;
    photos: string[];
    city: string | null;
  };
  createdAt: string;
  lastMessage?: {
    text: string;
    audioUrl?: string | null;
    createdAt: string;
    senderUserId: string;
  } | null;
  unreadCount?: number;
};

type ChatRequest = {
  requestId: string;
  fromUserId: string;
  createdAt: string;
  fromUser: {
    userId: string;
    displayName: string;
    photos: string[];
    city: string | null;
  };
  firstMessage: {
    id: string;
    text: string;
    createdAt: string;
  } | null;
};

export default function ChatScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeConversations, setActiveConversations] = useState<Conversation[]>([]);
  const [newMatches, setNewMatches] = useState<any[]>([]);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingToRequestId, setReplyingToRequestId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { newMatches: socketNewMatches, chatRequests: socketChatRequests } = useSocket();

  // Add socket new matches to local state (real-time)
  React.useEffect(() => {
    if (socketNewMatches.length > 0) {
      const latestMatch = socketNewMatches[socketNewMatches.length - 1];
      // Add to newMatches if not already present
      setNewMatches(prev => {
        if (prev.some(m => m.matchId === latestMatch.matchId)) return prev;
        return [{
          matchId: latestMatch.matchId,
          conversationId: latestMatch.conversationId,
          otherUser: {
            userId: latestMatch.otherUser.userId,
            displayName: latestMatch.otherUser.displayName,
            photos: latestMatch.otherUser.photos,
            city: null,
          },
          createdAt: new Date().toISOString(),
        }, ...prev];
      });
    }
  }, [socketNewMatches]);

  // Add socket chat requests to local state (real-time)
  React.useEffect(() => {
    if (socketChatRequests.length > 0) {
      const latestRequest = socketChatRequests[socketChatRequests.length - 1];
      // Add to chatRequests if not already present
      setChatRequests(prev => {
        if (prev.some(r => r.requestId === latestRequest.requestId)) return prev;
        return [{
          requestId: latestRequest.requestId,
          fromUserId: latestRequest.fromUser.userId,
          createdAt: latestRequest.firstMessage.createdAt,
          fromUser: {
            userId: latestRequest.fromUser.userId,
            displayName: latestRequest.fromUser.displayName,
            photos: latestRequest.fromUser.photos,
            city: null,
          },
          firstMessage: {
            id: latestRequest.requestId,
            text: latestRequest.firstMessage.text,
            createdAt: latestRequest.firstMessage.createdAt,
          },
        }, ...prev];
      });
    }
  }, [socketChatRequests]);

  const loadConversations = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/welcome");
        return;
      }

      setLoading(true);
      const [conversationsData, requestsData, matchesData, meData] = await Promise.all([
        api.getConversations(),
        api.getChatRequests(),
        api.listMatches(),
        api.getMe(),
      ]);

      setCurrentUserId(meData.user.id);

      // 1. Separate Active Conversations (those with messages)
      const active = conversationsData.filter(c => c.lastMessage !== null && c.lastMessage !== undefined);

      // 2. Identify New Matches (matches without active conversations)
      // Start with all explicit matches
      let matches = [...matchesData];

      // Add conversations that have NO messages (technically just matches still)
      const emptyConversations = conversationsData.filter(c => !c.lastMessage);

      // Map empty conversations to match format if needed, or just treat duplicate logic
      // Ideally, simple Matches don't imply a conversation exists yet.
      // We want to show a unique list of people to start chatting with.

      const activeUserIds = new Set(active.map(c => c.otherUser.userId));

      // Filter out matches that are already in active conversations
      const uniqueNewMatches = matches.filter(m => !activeUserIds.has(m.otherUser.userId));

      // Also add empty conversations if they are not in uniqueNewMatches yet
      emptyConversations.forEach(c => {
        if (!activeUserIds.has(c.otherUser.userId) && !uniqueNewMatches.find(m => m.otherUser.userId === c.otherUser.userId)) {
          uniqueNewMatches.push({
            matchId: c.matchId || "unknown",
            conversationId: c.conversationId,
            otherUser: c.otherUser,
            createdAt: c.createdAt
          });
        }
      });

      setActiveConversations(active as Conversation[]);
      setNewMatches(uniqueNewMatches);
      setChatRequests(requestsData);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Reload conversations every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const handleConversationPress = (conversationId: string) => {
    router.push(`/conversation/${conversationId}`);
  };

  const handleMatchPress = async (match: any) => {
    if (match.conversationId) {
      router.push(`/conversation/${match.conversationId}`);
    } else {
      // Should create conversation or just navigate with matchId context?
      // Usually we need conversationId. If it's null, verify backend logic.
      // Assuming backend creates conversation on match or on first message.
      // If null, we might need an endpoint to "start" conversation or passing user ID.
      // For now, let's assume we can navigate to conversation/new?userId=... or similar.
      // Actually swiip usually has conversationId.
      console.warn("No conversation ID for match", match);
    }
  };

  const handleDiscoverPress = () => {
    router.push("/(tabs)/home");
  };

  const handleReply = async (requestId: string) => {
    if (replyText.trim().length === 0) {
      Alert.alert(t('chat.warning'), t('chat.write_message'));
      return;
    }

    try {
      const result = await api.replyToRequest(requestId, replyText.trim());
      setReplyingToRequestId(null);
      setReplyText("");

      // Navigate to conversation
      router.push(`/conversation/${result.conversationId}`);

      // Reload conversations
      await loadConversations();
    } catch (error: any) {
      let errorMessage = error instanceof Error ? error.message : t('chat.send_error');

      if (error instanceof AxiosError) {
        const errorData = error.response?.data?.error;
        const code = errorData?.code;
        const message = errorData?.message || errorMessage;

        if (code === "FIRST_MESSAGE_RESTRICTED" || code === "MALE_CANNOT_SEND_FIRST_MESSAGE" || message.toLowerCase().includes("kadın") || message.toLowerCase().includes("first message")) {
          errorMessage = t('chat.first_message_restriction');
        } else {
          errorMessage = message;
        }
      }

      Alert.alert(t('common.error'), errorMessage);
    }
  };

  const handleAcceptRequest = async (requestId: string, fromUserId: string) => {
    try {
      const result = await api.acceptRequest(fromUserId);

      if (result.conversationId) {
        router.push(`/conversation/${result.conversationId}`);
      }

      // Reload conversations
      await loadConversations();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : t('likes.accept_error');
      Alert.alert(t('common.error'), message);
    }
  };

  const handleDeclineRequest = async (requestId: string, fromUserId: string) => {
    try {
      await api.declineRequest(fromUserId);
      // Reload conversations/requests
      await loadConversations();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : t('likes.decline_error');
      Alert.alert(t('common.error'), message);
    }
  };

  const calculateAge = (birthYear?: number) => {
    if (!birthYear) return "";
    const currentYear = new Date().getFullYear();
    return `, ${currentYear - birthYear}`;
  };

  if (loading && activeConversations.length === 0 && newMatches.length === 0) {
    return (
      <SafeAreaView>
        <View style={styles.container}>
          <ScreenHeader title={t('chat.header')} />
          <View style={styles.loadingContainer}>
            <EmptyState icon="💬" title={t('chat.loading')} description="" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <ScreenHeader title={t('chat.header')} />

        <FlatList
          data={activeConversations}
          keyExtractor={(item) => item.conversationId || item.matchId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadConversations}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* Requests Section */}
              {chatRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('chat.requests_title')} ({chatRequests.length})</Text>
                  <FlatList
                    data={chatRequests}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.requestsList}
                    renderItem={({ item }) => (
                      <View style={styles.requestCard}>
                        <View style={styles.requestContent}>
                          <View style={styles.requestHeader}>
                            {item.fromUser.photos && item.fromUser.photos.length > 0 ? (
                              <OptimizedImage
                                source={{ uri: item.fromUser.photos[0] }}
                                style={styles.requestAvatar}
                                containerStyle={styles.requestAvatar}
                                resizeMode="cover"
                                fallbackIconSize={28}
                                showLoader={false}
                              />
                            ) : (
                              <View style={styles.requestAvatarPlaceholder}>
                                <Text style={styles.requestAvatarText}>
                                  {item.fromUser.displayName.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.requestUserInfo}>
                              <Text style={styles.requestUserName}>
                                {item.fromUser.displayName}{(item.fromUser as any).birthYear ? calculateAge((item.fromUser as any).birthYear) : ""}
                              </Text>
                              {item.fromUser.city && (
                                <Text style={styles.requestUserCity}>📍 {item.fromUser.city}</Text>
                              )}
                            </View>
                          </View>

                          {item.firstMessage && (
                            <View style={styles.messageBubble}>
                              <Text style={styles.requestMessage} numberOfLines={2}>
                                "{item.firstMessage.text}"
                              </Text>
                            </View>
                          )}

                          <View style={styles.requestActions}>
                            <TouchableOpacity
                              style={styles.declineButton}
                              onPress={() => handleDeclineRequest(item.requestId, item.fromUserId)}
                              accessibilityRole="button"
                              accessibilityLabel={t('likes.decline')}
                            >
                              <Text style={styles.declineButtonText}>{t('likes.decline')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.acceptButton}
                              onPress={() => handleAcceptRequest(item.requestId, item.fromUserId)}
                              accessibilityRole="button"
                              accessibilityLabel={t('likes.accept')}
                            >
                              <Text style={styles.acceptButtonText}>{t('likes.accept')}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                    keyExtractor={(item) => item.requestId}
                  />
                </View>
              )}

              {/* New Matches Section */}
              {newMatches.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('chat.new_matches')}</Text>
                  <FlatList
                    data={newMatches}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.matchItem}
                        onPress={() => item.conversationId && handleConversationPress(item.conversationId)}
                        accessibilityRole="button"
                        accessibilityLabel={t("chat.open_conversation_with", { name: item.otherUser.displayName })}
                      >
                        {item.otherUser.photos && item.otherUser.photos.length > 0 ? (
                          <OptimizedImage
                            source={{ uri: item.otherUser.photos[0] }}
                            style={styles.matchAvatar}
                            containerStyle={styles.matchAvatar}
                            resizeMode="cover"
                            fallbackIconSize={32}
                            showLoader={false}
                          />
                        ) : (
                          <View style={styles.matchAvatarPlaceholder}>
                            <Text style={styles.matchAvatarText}>
                              {item.otherUser.displayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.matchName} numberOfLines={1}>
                          {item.otherUser.displayName}
                        </Text>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.matchId}
                  />
                </View>
              )}

              {/* Messages Header */}
              <Text style={[styles.sectionTitle, { marginLeft: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs }]}>
                {t('chat.messages_title')}
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={{ marginTop: 50 }}>
              <EmptyState
                icon="💬"
                title={t('chat.no_messages')}
                description={t('chat.no_messages_desc')}
                ctaText={t('chat.discover')}
                onCtaPress={handleDiscoverPress}
              />
            </View>
          }
          renderItem={({ item }) => (
            <ChatListItem
              conversationId={item.conversationId!}
              otherUser={item.otherUser}
              lastMessage={item.lastMessage?.audioUrl ? t('chat.voice_message') : item.lastMessage?.text}
              time={item.lastMessage?.createdAt}
              isMyMessage={currentUserId ? item.lastMessage?.senderUserId === currentUserId : false}
              unread={(item.unreadCount || 0) > 0}
              unreadCount={item.unreadCount}
              onPress={handleConversationPress}
            />
          )}
        />

        {/* Banner Ad for non-premium users */}
        <BannerAdComponent style={{ marginBottom: 8 }} />

        {/* Reply Modal */}
        <Modal
          visible={replyingToRequestId !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setReplyingToRequestId(null);
            setReplyText("");
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('chat.reply')}</Text>
              <TextInput
                style={styles.replyInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder={t('chat.write_placeholder')}
                placeholderTextColor={colors.textSecondaryDark}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.charCount}>
                {replyText.length}/2000
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setReplyingToRequestId(null);
                    setReplyText("");
                  }}
                >
                  <Text style={styles.modalButtonCancelText}>{t('chat.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalButtonConfirm,
                    replyText.trim().length === 0 && styles.modalButtonDisabled,
                  ]}
                  onPress={() => replyingToRequestId && handleReply(replyingToRequestId)}
                  disabled={replyText.trim().length === 0}
                >
                  <Text style={styles.modalButtonConfirmText}>{t('chat.send')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondaryDark,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  horizontalList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  requestsList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  // New Matches Styles
  matchItem: {
    alignItems: "center",
    width: 70,
  },
  matchAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  matchAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.backgroundSecondaryDark,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  matchAvatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  matchName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
    textAlign: "center",
  },
  // Request Styles
  requestCard: {
    width: 280,
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderDark,
    overflow: "hidden",
  },
  requestContent: {
    padding: spacing.md,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  requestAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  requestAvatarText: {
    color: colors.onMedia,
    fontSize: typography.fontSize.lg,
    fontWeight: "bold",
  },
  requestUserInfo: {
    flex: 1,
  },
  requestUserName: {
    fontSize: typography.fontSize.base,
    fontWeight: "bold",
    color: colors.textDark,
  },
  requestUserCity: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
    marginTop: 2,
  },
  messageBubble: {
    backgroundColor: colors.backgroundDark,
    padding: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderTopLeftRadius: 2,
  },
  requestMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    fontStyle: "italic",
    lineHeight: 20,
  },
  requestActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: "transparent",
  },
  declineButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "bold",
    color: colors.textSecondaryDark,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "bold",
    color: colors.onMedia,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  replyInput: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    minHeight: 100,
    marginBottom: spacing.xs,
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
    textAlign: "right",
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonCancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  modalButtonConfirmText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.onMedia,
  },
});
