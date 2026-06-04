import { Text, View } from "react-native";
import Header from "../../components/Header";

export default function GroupScreen() {
  return (
    <>
      <Header />
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>그룹</Text>
      </View>
    </>
  );
}
