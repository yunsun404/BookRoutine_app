import { Text, View } from "react-native";
import Header from "../../components/Header";

export default function RecommendScreen() {
  return (
    <>
      <Header />
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>추천</Text>
      </View>
    </>
  );
}
