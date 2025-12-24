import { useEffect, useState } from "react";
import useWebSocket from "./useWebSocket";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

type MetalKey = "gold999" | "gold916" | "silver999" | "silver925";


const DEFAULT_MAKING_LABELS = {
  gold999: "Making Charges",
  gold916: "Making Charges",
  silver999: "Making Charges",
  silver925: "Making Charges",
};

export function useLiveRates() {
  const [baseRates, setBaseRates] = useState<any>(null);

  const [config, setConfig] = useState<any>(null);
  const [rates, setRates] = useState<any>(null);
  const [configLoaded, setConfigLoaded] = useState(false);


  const auth = getAuth();
  const user = auth.currentUser;
  
  const { data } = useWebSocket(
    "live.karatpay.in",
    true
  );

  /* 🔐 USER CONFIG LISTENER */
  useEffect(() => {
    if (!user) {
  setConfig({});
  setConfigLoaded(true);
  return;
}


    const ref = doc(db, "users", user.uid, "config", "shop");

    return onSnapshot(ref, (snap) => {
  if (!snap.exists()) {
    setConfig({});
    setConfigLoaded(true);
    return;
  }

  const data = snap.data();

  setConfig({
    ...data,
    making:
      data.making && typeof data.making === "object"
        ? data.making
        : {
            gold999: { enabled: false, type: "percent", value: 0 },
            gold916: { enabled: false, type: "percent", value: 0 },
            silver999: { enabled: false, type: "perGram", value: 0 },
            silver925: { enabled: false, type: "perGram", value: 0 },
          },

    makingLabels:
    data.makingLabels && typeof data.makingLabels === "object"
      ? data.makingLabels
      : DEFAULT_MAKING_LABELS,
      
  });

  setConfigLoaded(true);
});


  }, [user]);


  const applyMaking = (
  price: number,
  metal: MetalKey,
  config: any
) => {
  const m = config?.making?.[metal];
  if (!m || !m.enabled) return price;

  if (m.type === "percent") {
    return price + price * (m.value / 100);
  }

  return price + m.value;
};


  /* 💰 COMPUTE RATES */
  useEffect(() => {
    if (!data?.sell_price_999 || !config) return;

    if (config.frozen) return;

    const gold999 = data.sell_price_999;
    const gold916 = gold999 * 0.916;
    const silver999 = gold999 / 100;
    const silver925 = silver999 * 0.925;


    setBaseRates({
  gold999,
  gold916,
  silver999,
  silver925,
});

    const computed = {
  gold999: applyMaking(
    gold999 + (config.margins?.gold999 || 0),
    "gold999",
    config
  ),
  gold916: applyMaking(
    gold916 + (config.margins?.gold916 || 0),
    "gold916",
    config
  ),
  silver999: applyMaking(
    silver999 + (config.margins?.silver999 || 0),
    "silver999",
    config
  ),
  silver925: applyMaking(
    silver925 + (config.margins?.silver925 || 0),
    "silver925",
    config
  ),
  timestamp: Date.now(),
};

;

    setRates(computed);



  }, [data, config, user]);

  return {
  rates: config?.frozen ? config?.frozenRates : rates,
  baseRates,
  config,
  configLoaded,
};

}