import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import RateDisplay from "../index";

export default function PublicRateView() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    if (!shopId) return;

    const ref = doc(db, "users", shopId, "config", "shop");

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setConfig(snap.data());
      }
    });

    return () => unsub();
  }, [shopId]);

  if (!config) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff" }}>Loading live rates…</Text>
      </View>
    );
  }

  return <RateDisplay previewConfig={config} />;
}
