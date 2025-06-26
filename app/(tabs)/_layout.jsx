import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { MenuProvider } from 'react-native-popup-menu';
import { View, StyleSheet } from 'react-native';
import colors from '../../constant/colors';
import { Octicons } from '@expo/vector-icons';

// Create this simple utility file first (utils/scrollManager.js)
import { scrollToTop } from '../../utils/scrollManager';

export default function TabLayout() {
  const router = useRouter();

  const handleHomePress = (e) => {
    // Check if we're already on the home screen
    if (router.canGoBack()) {
      // We're not on home screen, proceed with normal navigation
      return;
    }
    
    // Already on home screen - scroll to top
    e.preventDefault();
    scrollToTop();
  };

  return (
    <MenuProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <Octicons
                name="home"
                size={22}
                color={focused ? colors.BLUE : colors.LIGHTGRAY}
                style={focused ? styles.activeIcon : styles.inactiveIcon}
              />
            ),
          }}
          listeners={{
            tabPress: handleHomePress,
          }}
        />

        <Tabs.Screen
          name="AddNew"
          options={{
            tabBarIcon: () => (
              <View style={styles.addButtonContainer}>
                <View style={styles.addButtonBackground}>
                  <Octicons
                    name="plus"
                    size={22}
                    color="white"
                  />
                </View>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <Octicons
                name="person"
                size={22}
                color={focused ? colors.BLUE : colors.LIGHTGRAY}
                style={focused ? styles.activeIcon : styles.inactiveIcon}
              />
            ),
          }}
        />
      </Tabs>
    </MenuProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    height: 63,
    paddingBottom: 0,
    paddingTop: 12,
    borderTopWidth: 0,
    elevation: 10,
    paddingHorizontal: 20
  },
  addButtonBackground: {
    width: 40,
    height: 40,
    borderRadius: 30,
    backgroundColor: colors.BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  activeIcon: {
    shadowColor: colors.BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  inactiveIcon: {
    opacity: 0.7,
  },
});