import React from 'react';
import { Tabs } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { MenuProvider } from 'react-native-popup-menu';
import { View, StyleSheet } from 'react-native';
import colors from '../../constant/colors';
import { Octicons } from '@expo/vector-icons';

export default function TabLayout() {
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
/>

<Tabs.Screen
  name="AddNew"
  options={{
    tabBarIcon: ({ focused }) => (
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
tabBar: {  // Changed from tabBarStyle to tabBar
    backgroundColor: '#fff',
    height: 60,
    paddingBottom: 0,
    paddingTop: 10,
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