import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

type Props = {
  value: number;
  max: number;
  style?: object;
};

export default function ProgressBar({ value, max, style }: Props) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percentage,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  return (
    <View style={[styles.track, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 5,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 9999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#c8a84b",
    borderRadius: 9999,
  },
});
