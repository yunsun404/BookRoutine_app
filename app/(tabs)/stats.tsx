import { Text, View } from "react-native";
import Header from "../../components/Header";
export default function StatsScreen() {
  return (
    <>
      <Header />
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>통계</Text>
      </View>
    </>
  );
}
