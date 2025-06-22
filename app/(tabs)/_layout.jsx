import React from 'react';
import { Tabs } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { MenuProvider } from 'react-native-popup-menu';

export default function TabLayout() {
  return (
    <MenuProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: { backgroundColor: '#fff', paddingBottom: 5 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => <AntDesign name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="AddNew"
          options={{
            tabBarLabel: 'My Polls', // Updated label
            tabBarIcon: ({ color, size }) => <AntDesign name="pluscircleo" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            tabBarLabel: 'Notifications',
            tabBarIcon: ({ color, size }) => <AntDesign name="bells" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => <AntDesign name="user" size={size} color={color} />,
          }}
        />
      </Tabs>
    </MenuProvider>
  );
}
