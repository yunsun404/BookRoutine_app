import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_CONFIG: {
  name: string;
  title: string;
  icon: IoniconsName;
  iconActive: IoniconsName;
}[] = [
  {
    name: "stats",
    title: "통계",
    icon: "bar-chart-outline",
    iconActive: "bar-chart",
  },
  {
    name: "calendar",
    title: "달력",
    icon: "calendar-outline",
    iconActive: "calendar",
  },
  {
    name: "homescreen",
    title: "홈",
    icon: "home-outline",
    iconActive: "home",
  },
  {
    name: "group",
    title: "그룹",
    icon: "people-outline",
    iconActive: "people",
  },
  {
    name: "recommend",
    title: "추천",
    icon: "sparkles-outline",
    iconActive: "sparkles",
  },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4A3B32",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0.5,
          borderTopColor: "#E0E0E0",
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
      ))}

      <Tabs.Screen
        name="goals"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}