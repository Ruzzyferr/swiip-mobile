import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Tabs, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services/api';
import { getToken } from '@/src/services/authStore';
import { badgeUpdater } from '@/src/utils/badgeUpdater';
import { useDeviceType } from '@/src/hooks/useDeviceType';
import { useSocket } from '@/src/state/socket';
import { MatchPopup } from '@/src/components/MatchPopup';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const TAB_COUNT = 4;

// Custom Tab Bar with sliding indicator
function CustomTabBar({ state, navigation, incomingRequestsCount, unreadMessagesCount, bottomMargin, isTablet }: any) {
  const [tabWidth, setTabWidth] = useState(0);

  // Animated indicator position
  const indicatorPosition = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      indicatorPosition.value = withSpring(state.index * tabWidth, {
        damping: 20,
        stiffness: 200,
      });
    }
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
    width: tabWidth,
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTabWidth(width / TAB_COUNT);
  };

  const tabs = [
    { name: 'home', icon: 'home', outlineIcon: 'home-outline', label: 'Home' },
    { name: 'chat', icon: 'chatbubbles', outlineIcon: 'chatbubbles-outline', label: 'Chat' },
    { name: 'likes', icon: 'heart', outlineIcon: 'heart-outline', label: 'Likes' },
    { name: 'profile', icon: 'person', outlineIcon: 'person-outline', label: 'Profile' },
  ];

  // On tablets, center the tab bar with a max width
  const tabBarStyle = isTablet
    ? [styles.tabBarContainer, styles.tabBarTablet, { bottom: bottomMargin }]
    : [styles.tabBarContainer, { bottom: bottomMargin }];

  return (
    <View style={tabBarStyle} onLayout={handleLayout}>
      {/* Sliding Indicator */}
      {tabWidth > 0 && (
        <Animated.View style={[styles.indicatorWrapper, indicatorStyle]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.indicator}
          />
        </Animated.View>
      )}

      {/* Tab Buttons */}
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = tabs[index];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={isFocused ? tab.icon as any : tab.outlineIcon as any}
                  size={22}
                  color={isFocused ? colors.onMedia : 'rgba(255, 255, 255, 0.5)'}
                />
                {tab.name === 'likes' && incomingRequestsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {incomingRequestsCount > 99 ? '99+' : incomingRequestsCount}
                    </Text>
                  </View>
                )}
                {tab.name === 'chat' && unreadMessagesCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.label,
                { color: isFocused ? colors.onMedia : 'rgba(255, 255, 255, 0.5)' }
              ]}>
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isTablet } = useDeviceType();
  const { likesCount: realtimeLikesCount, newMatches, clearNewMatches } = useSocket();
  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const bottomMargin = Math.max(insets.bottom, 16);

  // Combine API count with real-time socket updates
  const totalLikesCount = incomingRequestsCount + realtimeLikesCount;

  // Show match popup when new match arrives
  useEffect(() => {
    if (newMatches.length > 0) {
      setShowMatchPopup(true);
    }
  }, [newMatches]);

  const handleCloseMatchPopup = () => {
    setShowMatchPopup(false);
    clearNewMatches();
  };

  const loadIncomingRequestsCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const incoming = await api.getIncomingRequests();
      setIncomingRequestsCount(incoming.length);
    } catch (error) {
      setIncomingRequestsCount(0);
    }
  };

  const loadUnreadMessagesCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const result = await api.getUnreadMessageCount();
      setUnreadMessagesCount(result.unreadCount);
    } catch (error) {
      setUnreadMessagesCount(0);
    }
  };

  const loadAllCounts = async () => {
    await Promise.all([
      loadIncomingRequestsCount(),
      loadUnreadMessagesCount(),
    ]);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadAllCounts();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(loadAllCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = badgeUpdater.subscribe(loadAllCounts);
    return unsubscribe;
  }, []);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            incomingRequestsCount={totalLikesCount}
            unreadMessagesCount={unreadMessagesCount}
            bottomMargin={bottomMargin}
            isTablet={isTablet}
          />
        )}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
        <Tabs.Screen name="likes" options={{ title: 'Likes' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>

      {/* Match Popup */}
      <MatchPopup
        visible={showMatchPopup}
        match={newMatches[0] || null}
        onClose={handleCloseMatchPopup}
        onSendMessage={handleCloseMatchPopup}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    backgroundColor: 'rgba(25, 25, 40, 0.98)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarTablet: {
    maxWidth: 500,
    left: 'auto' as const,
    right: 'auto' as const,
    alignSelf: 'center',
    width: '60%',
  },
  indicatorWrapper: {
    position: 'absolute',
    top: 8,
    left: 0,
    height: 48,
    paddingHorizontal: 8,
  },
  indicator: {
    flex: 1,
    borderRadius: 24,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.accentDark,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.onMedia,
    fontSize: 9,
    fontWeight: 'bold',
  },
});
