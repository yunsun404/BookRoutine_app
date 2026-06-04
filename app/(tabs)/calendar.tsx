import { Text, View } from "react-native";
import Header from "../../components/Header";

export default function CalendarScreen() {
  return (
    <>
      <Header />
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>달력</Text>
      </View>
    </>
  );
}
