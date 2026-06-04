import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

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
  { name: "index", title: "홈", icon: "home-outline", iconActive: "home" },
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
        tabBarActiveTintColor: "#1a1a1a",
        tabBarInactiveTintColor: "#a0a0a0",
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: "rgba(0,0,0,0.14)",
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginBottom: 2,
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
    </Tabs>
  );
}
