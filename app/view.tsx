import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import RateDisplay from "./index";

export default function PublicRateView() {
  const { shopId } = useLocalSearchParams<{ shopId?: string }>();
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (!shopId) return;

    const ref = doc(db, "users", shopId, "config", "shop");

    const unsub = onSnapshot(ref, (snap) => {
      setExists(snap.exists());
    });

    return () => unsub();
  }, [shopId]);

  if (!shopId || exists === false) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Invalid link</Text>
      </View>
    );
  }

  if (exists === null) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>Loading live rates…</Text>
      </View>
    );
  }

  
  return <RateDisplay publicShopId={shopId} />;
}
