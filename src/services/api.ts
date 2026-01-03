import axios, { AxiosInstance, AxiosError } from "axios";
import { Platform } from "react-native";
import { getToken, clearToken } from "./authStore";
import { router } from "expo-router";

// Determine API URL based on platform and environment
function getApiUrl(): string {
  // If explicitly set, use it
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Default based on platform
  if (Platform.OS === "android") {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    // For physical device, use your computer's local IP (e.g., 192.168.1.100)
    return __DEV__ ? "http://10.0.2.2:4000" : "http://localhost:4000";
  } else if (Platform.OS === "ios") {
    // iOS simulator can use localhost
    return "http://localhost:4000";
  }

  // Web fallback
  return "http://localhost:4000";
}

const API_URL = getApiUrl();

// Flag to prevent multiple logout redirects
let isLoggingOut = false;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling - AUTO LOGOUT on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && !isLoggingOut) {
          // Invalid session token - auto logout
          const errorData = error.response.data as any;
          const errorCode = errorData?.error?.code;

          // Only logout on UNAUTHORIZED code (not on login failures)
          if (errorCode === "UNAUTHORIZED" || errorData?.code === "UNAUTHORIZED") {
            console.warn("[API] 401 UNAUTHORIZED - Logging out automatically");
            isLoggingOut = true;

            try {
              await clearToken();
              // Use setTimeout to ensure we're not in a render cycle
              setTimeout(() => {
                router.replace("/(auth)/welcome");
                isLoggingOut = false;
              }, 100);
            } catch (e) {
              console.error("[API] Error during auto-logout:", e);
              isLoggingOut = false;
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async getHealth(): Promise<{ ok: boolean; name: string; timestamp?: string }> {
    const response = await this.client.get("/health");
    return response.data;
  }

  async getV1Health(): Promise<{ ok: boolean; name: string; timestamp?: string }> {
    const response = await this.client.get("/api/v1/health");
    return response.data;
  }

  async loginEmail(email: string): Promise<{
    userId: string;
    token?: string;
    requiresCode?: boolean;
    message?: string;
  }> {
    const response = await this.client.post("/api/v1/auth/login", { email });
    return response.data;
  }

  async loginPhone(phone: string): Promise<{
    userId: string;
    token?: string;
    requiresCode?: boolean;
    message?: string;
  }> {
    const response = await this.client.post("/api/v1/auth/login", { phone });
    return response.data;
  }

  async sendCode(email?: string, phone?: string): Promise<{ message: string }> {
    const response = await this.client.post("/api/v1/auth/send-code", { email, phone });
    return response.data;
  }

  async verifyCode(
    code: string,
    email?: string,
    phone?: string
  ): Promise<{ userId: string; token: string }> {
    const response = await this.client.post("/api/v1/auth/verify-code", {
      code,
      email,
      phone,
    });
    return response.data;
  }

  async getMe(): Promise<{
    user: { id: string; email: string | null; phone: string | null; isPremium: boolean; createdAt: string };
    profileExists: boolean;
  }> {
    const response = await this.client.get("/api/v1/auth/me");
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post("/api/v1/auth/logout");
  }

  async getMyProfile(): Promise<{
    id: string;
    userId: string;
    displayName: string;
    birthYear: number | null;
    city: string | null;
    languagesNative: string[];
    languagesPractice: string[];
    purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
    bio: string | null;
    photos: string[];
    interests?: string[];
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.client.get("/api/v1/profiles/me");
    return response.data;
  }

  async getUserProfile(userId: string): Promise<{
    id: string;
    userId: string;
    displayName: string;
    birthYear: number | null;
    city: string | null;
    languagesNative: string[];
    languagesPractice: string[];
    purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
    bio: string | null;
    photos: string[];
    gender?: "MALE" | "FEMALE" | "OTHER" | null;
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.client.get(`/api/v1/profiles/${userId}`);
    return response.data;
  }

  async upsertMyProfile(payload: {
    displayName: string;
    birthYear?: number;
    city?: string;
    lat?: number;
    lng?: number;
    gender?: "MALE" | "FEMALE" | "OTHER";
    languagesNative?: string[];
    languagesPractice?: string[];
    purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
    bio?: string;
    photos?: string[];
    interests?: string[];
  }): Promise<{
    id: string;
    userId: string;
    displayName: string;
    birthYear: number | null;
    city: string | null;
    languagesNative: string[];
    languagesPractice: string[];
    purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
    bio: string | null;
    photos: string[];
    interests: string[];
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.client.put("/api/v1/profiles/me", payload);
    return response.data;
  }

  async getFeed(
    limit = 20,
    filters?: {
      maxDistanceKm?: number | null;
      languages?: string[];
      purpose?: "CONVERSATION" | "PRACTICE" | "COFFEE";
      culturalPreference?: "LOCAL" | "EUROPE" | "INTERNATIONAL";
      excludeCountries?: string[];
      verifiedOnly?: boolean;
      recentlyActive?: boolean;
      minPhotos?: number;
      // New filters
      nativeLanguages?: string[];
      targetLanguages?: string[];
      countries?: string[];
      gender?: "ALL" | "FEMALE" | "MALE";
      ageRange?: [number, number];
      forceReshuffle?: boolean;
    }
  ): Promise<
    Array<{
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
      };
    }>
  > {
    const params: any = { limit };

    // Only include filters that are explicitly set
    if (filters) {
      if (filters.maxDistanceKm !== undefined) {
        params.maxDistanceKm = filters.maxDistanceKm;
      }
      if (filters.languages && filters.languages.length > 0) {
        params.languages = filters.languages;
      }
      if (filters.purpose) {
        params.purpose = filters.purpose;
      }
      if (filters.culturalPreference) {
        params.culturalPreference = filters.culturalPreference;
      }
      if (filters.excludeCountries && filters.excludeCountries.length > 0) {
        params.excludeCountries = filters.excludeCountries;
      }
      if (filters.verifiedOnly !== undefined) {
        params.verifiedOnly = filters.verifiedOnly;
      }
      if (filters.recentlyActive !== undefined) {
        params.recentlyActive = filters.recentlyActive;
      }
      if (filters.minPhotos !== undefined) {
        params.minPhotos = filters.minPhotos;
      }
      // New filter params
      if (filters.nativeLanguages && filters.nativeLanguages.length > 0) {
        params.nativeLanguages = filters.nativeLanguages;
      }
      if (filters.targetLanguages && filters.targetLanguages.length > 0) {
        params.targetLanguages = filters.targetLanguages;
      }
      if (filters.countries && filters.countries.length > 0) {
        params.countries = filters.countries;
      }
      if (filters.gender && filters.gender !== "ALL") {
        params.gender = filters.gender;
      }
      if (filters.ageRange) {
        params.ageRange = filters.ageRange;
      }
      if (filters.forceReshuffle) {
        params.forceReshuffle = filters.forceReshuffle;
      }
    }

    const response = await this.client.get("/api/v1/discovery/feed", { params });
    return response.data;
  }

  async like(toUserId: string): Promise<{
    success: boolean;
    requestId: string;
    matched?: boolean;
    matchId?: string;
    conversationId?: string;
  }> {
    const response = await this.client.post("/api/v1/discovery/like", {
      toUserId,
    });
    return response.data;
  }

  async pass(toUserId: string): Promise<void> {
    await this.client.post("/api/v1/discovery/pass", { toUserId });
  }

  async favorite(toUserId: string, text: string): Promise<{
    success: boolean;
    requestId: string;
    messageId: string;
    directRemaining: number;
  }> {
    const response = await this.client.post("/api/v1/discovery/favorite", {
      toUserId,
      text,
    });
    return response.data;
  }

  async listMatches(): Promise<
    Array<{
      matchId: string;
      conversationId: string | null;
      otherUser: {
        userId: string;
        displayName: string;
        photos: string[];
        city: string | null;
      };
      createdAt: string;
    }>
  > {
    const response = await this.client.get("/api/v1/matches");
    // Backend returns paginated response { items: [], nextCursor: ... }
    return response.data.items || [];
  }

  async getConversations(): Promise<
    Array<{
      conversationId: string | null;
      matchId: string;
      otherUser: {
        userId: string;
        displayName: string;
        photos: string[];
        city: string | null;
      };
      created_at: string;
      lastMessage?: {
        text: string;
        audioUrl?: string | null;
        createdAt: string;
        senderUserId: string;
      } | null;
      createdAt: string;
    }>
  > {
    const response = await this.client.get("/api/v1/chat/conversations");
    return response.data;
  }

  async getConversationDetails(conversationId: string): Promise<{
    conversationId: string;
    matchId: string | null;
    otherUser: {
      userId: string;
      displayName: string;
      photos: string[];
      city: string | null;
      gender?: "MALE" | "FEMALE" | "OTHER" | null;
    };
    currentUserGender?: "MALE" | "FEMALE" | "OTHER" | null;
    firstMessage: {
      id: string;
      text: string;
      createdAt: string;
    } | null;
    hasMessages?: boolean;
    createdAt: string;
  }> {
    const response = await this.client.get(`/api/v1/chat/conversations/${conversationId}`);
    return response.data;
  }

  async getMessages(
    conversationId: string,
    limit = 50
  ): Promise<
    Array<{
      id: string;
      conversationId: string;
      senderUserId: string;
      text: string;
      createdAt: string;
    }>
  > {
    const response = await this.client.get(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      {
        params: { limit },
      }
    );
    return response.data;
  }

  async sendMessage(
    conversationId: string,
    text: string
  ): Promise<{
    id: string;
    conversationId: string;
    senderUserId: string;
    text: string;
    audioUrl?: string;
    createdAt: string;
  }> {
    const response = await this.client.post(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      { text }
    );
    return response.data;
  }

  async sendAudioMessage(
    conversationId: string,
    audioUri: string
  ): Promise<{
    id: string;
    conversationId: string;
    senderUserId: string;
    text?: string;
    audioUrl: string;
    createdAt: string;
  }> {
    // Use fetch instead of axios for reliable file uploads in React Native
    const token = await getToken();
    const formData = new FormData();

    // Ensure URI is correct for Android
    let uri = audioUri;
    if (Platform.OS === "android" && !uri.startsWith("file://")) {
      uri = `file://${uri}`;
    }

    formData.append("audio", {
      uri: uri,
      type: "audio/m4a",
      name: "audio.m4a",
    } as any);

    try {
      const response = await fetch(`${this.client.defaults.baseURL}/api/v1/chat/conversations/${conversationId}/messages/audio`, {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          // Do NOT set Content-Type header, let fetch handle the boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Audio upload error details:", error);
      throw error;
    }
  }

  async uploadPhoto(photoUri: string): Promise<string> {
    const token = await getToken();
    const formData = new FormData();

    let uri = photoUri;
    // Android fix for file:// prefix
    if (Platform.OS === "android" && !uri.startsWith("file://") && !uri.startsWith("http")) {
      uri = `file://${uri}`;
    }

    // Guess file type based on extension
    const match = /\.(\w+)$/.exec(uri);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append("photo", {
      uri: uri,
      type,
      name: `upload.${match ? match[1] : "jpg"}`,
    } as any);

    try {
      const response = await fetch(`${this.client.defaults.baseURL}/api/v1/storage/upload`, {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          // Do NOT set Content-Type header manually
        },
        body: formData,
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      return data.url;
    } catch (error) {
      console.error("Photo upload error:", error);
      throw error;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.client.delete(`/api/v1/chat/conversations/${conversationId}`);
  }

  async polishMessage(
    text: string,
    tone: "neutral" | "friendly" | "playful" = "neutral"
  ): Promise<{
    polishedText: string;
    usage: {
      aiCount: number;
      aiLimit: number;
      isPremium: boolean;
    };
  }> {
    const response = await this.client.post("/api/v1/ai/polish", { text, tone });
    return response.data;
  }

  async getUsage(): Promise<{
    usage: {
      aiCount: number;
      msgCount: number;
      aiLimit: number;
      msgLimit: number;
      isPremium: boolean;
      aiAllowed: boolean;
      msgAllowed: boolean;
      likesUsed?: number;
      likesRemaining?: number;
      likesLimit?: number;
      canLike?: boolean;
      favoritesUsed?: number;
      favoritesRemaining?: number;
      favoritesLimit?: number;
      canFavorite?: boolean;
    };
  }> {
    const response = await this.client.get("/api/v1/ai/usage");
    return response.data;
  }

  // Likes endpoints
  async getIncomingLikesCount(): Promise<{
    count: number;
    blurred?: boolean;
  }> {
    const response = await this.client.get("/api/v1/likes/incoming/count");
    return response.data;
  }

  async getIncomingLikes(): Promise<
    Array<{
      fromUserId: string;
      displayName: string;
      city: string | null;
      photos: string[];
      createdAt: string;
    }>
  > {
    const response = await this.client.get("/api/v1/likes/incoming");
    return response.data;
  }

  // Boost endpoints
  async getBoostStatus(): Promise<{
    active: boolean;
    endsAt?: string;
    boostsRemaining: number;
    weeklyLimit: number;
  }> {
    const response = await this.client.get("/api/v1/boost/status");
    return response.data;
  }

  async activateBoost(): Promise<{
    startsAt: string;
    endsAt: string;
    active: boolean;
    boostsRemaining: number;
  }> {
    const response = await this.client.post("/api/v1/boost/activate");
    return response.data;
  }

  // Safety endpoints
  async blockUser(userId: string): Promise<void> {
    await this.client.post("/api/v1/safety/block", { userId });
  }

  async reportUser(
    userId: string,
    reason: "SPAM" | "HARASSMENT" | "NUDITY" | "SCAM" | "OTHER",
    details?: string
  ): Promise<void> {
    await this.client.post("/api/v1/safety/report", {
      userId,
      reason,
      details,
    });
  }

  // Billing endpoints
  async syncBilling(data?: {
    customerInfo?: any; // Optional customer info for debugging
  }): Promise<{ isPremium: boolean }> {
    const response = await this.client.post("/api/v1/billing/sync", data || {});
    return response.data;
  }

  async getBillingStatus(): Promise<{
    isPremium: boolean;
    premiumSource: string | null;
    premiumUpdatedAt: string | null;
    premiumExpiresAt: string | null;
  }> {
    const response = await this.client.get("/api/v1/billing/status");
    return response.data;
  }

  async purchaseBoost(): Promise<{
    success: boolean;
    purchasedAmount: number;
    message: string;
  }> {
    const response = await this.client.post("/api/v1/billing/purchase-boost");
    return response.data;
  }

  // Notifications endpoints
  async registerPushToken(data: {
    token: string;
    platform: "IOS" | "ANDROID";
  }): Promise<void> {
    await this.client.post("/api/v1/notifications/register-token", data);
  }

  // Referral endpoints
  async getReferralCode(): Promise<{ referralCode: string | null }> {
    const response = await this.client.get("/api/v1/referral/me");
    return response.data;
  }

  async applyReferralCode(code: string): Promise<void> {
    await this.client.post("/api/v1/referral/apply", { code });
  }

  // Rewards endpoints
  async rewardAdLike(): Promise<{
    success: boolean;
    rewardAmount: number;
    likesInfo: {
      likesUsed: number;
      likesRemaining: number;
      likesLimit: number;
      extraLikesFromAds: number;
    };
  }> {
    const response = await this.client.post("/api/v1/rewards/ad-like");
    return response.data;
  }

  // Requests endpoints
  async getIncomingRequests(): Promise<
    Array<{
      requestId: string;
      fromUserId: string;
      kind: "LIKE" | "FAVORITE";
      status: "PENDING" | "ACCEPTED" | "DECLINED";
      createdAt: string;
      fromUser: {
        userId: string;
        displayName: string;
        photos: string[];
        city: string | null;
        languagesNative: string[];
        languagesPractice: string[];
        birthYear: number | null;
        bio: string | null;
      };
      firstMessage: {
        id: string;
        text: string;
        createdAt: string;
      } | null;
    }>
  > {
    const response = await this.client.get("/api/v1/requests/incoming?status=PENDING");
    return response.data;
  }

  async getOutgoingRequests(): Promise<
    Array<{
      requestId: string;
      toUserId: string;
      kind: "LIKE" | "FAVORITE";
      status: "PENDING" | "ACCEPTED" | "DECLINED";
      createdAt: string;
      toUser: {
        userId: string;
        displayName: string;
        photos: string[];
        city: string | null;
        languagesNative: string[];
        languagesPractice: string[];
        birthYear: number | null;
        bio: string | null;
      };
      firstMessage: {
        id: string;
        text: string;
        createdAt: string;
      } | null;
    }>
  > {
    const response = await this.client.get("/api/v1/requests/outgoing?status=PENDING");
    return response.data;
  }

  async acceptRequest(fromUserId: string): Promise<{
    success: boolean;
    requestId: string;
    matchId?: string;
    conversationId?: string;
  }> {
    const response = await this.client.post("/api/v1/requests/accept", {
      fromUserId,
    });
    return response.data;
  }

  async declineRequest(fromUserId: string): Promise<{
    success: boolean;
    requestId: string;
  }> {
    const response = await this.client.post("/api/v1/requests/decline", {
      fromUserId,
    });
    return response.data;
  }

  // Chat requests endpoints
  async getChatRequests(): Promise<
    Array<{
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
    }>
  > {
    const response = await this.client.get("/api/v1/chat/requests");
    return response.data;
  }

  async replyToRequest(requestId: string, text: string): Promise<{
    success: boolean;
    conversationId: string;
    message: {
      id: string;
      conversationId: string;
      senderUserId: string;
      text: string;
      createdAt: string;
    };
  }> {
    const response = await this.client.post(`/api/v1/chat/requests/${requestId}/reply`, {
      text,
    });
    return response.data;
  }
}

export const api = new ApiClient();
