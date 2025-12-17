import { useEffect, useState } from "react";
import useWebSocket from "./useWebSocket";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

export function useLiveRates() {
  const [config, setConfig] = useState<any>(null);
  const [rates, setRates] = useState<any>(null);

  const auth = getAuth();
  const user = auth.currentUser;

  const { data } = useWebSocket(
    "live.karatpay.in",
    !config?.frozen
  );

  /* 🔐 USER CONFIG LISTENER */
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid, "config", "shop");

    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setConfig(snap.data());
      else setConfig({});
    });
  }, [user]);

  /* 💰 COMPUTE RATES */
  useEffect(() => {
    if (!data?.sell_price_999 || !config || !user) return;
    if (config.frozen) return;

    const gold999 = data.sell_price_999;
    const gold916 = gold999 * 0.916;
    const silver999 = gold999 / 100;
    const silver925 = silver999 * 0.925;

    const computed = {
      gold999: gold999 + (config.margins?.gold999 || 0),
      gold916: gold916 + (config.margins?.gold916 || 0),
      silver999: silver999 + (config.margins?.silver999 || 0),
      silver925: silver925 + (config.margins?.silver925 || 0),
      timestamp: Date.now(),
    };

    setRates(computed);

    setDoc(
      doc(db, "users", user.uid, "config", "shop"),
      { ...config, frozenRates: computed },
      { merge: true }
    );
  }, [data, config, user]);

  return {
    rates: config?.frozen ? config?.frozenRates : rates,
    config,
  };
}
