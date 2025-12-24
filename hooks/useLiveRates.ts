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

export function useLiveRates(publicShopId?: string) {

  const [baseRates, setBaseRates] = useState<any>(null);

  const [savedConfig, setSavedConfig] = useState<any>(null);

  const [rates, setRates] = useState<any>(null);
  const [configLoaded, setConfigLoaded] = useState(false);


  const auth = getAuth();
  const user = publicShopId
  ? { uid: publicShopId }
  : auth.currentUser;

  
  const { data } = useWebSocket(
    "live.karatpay.in",
    true
  );

  /* 🔐 USER CONFIG LISTENER */
  useEffect(() => {
    if (!user) {
  setSavedConfig(null);
  setConfigLoaded(true);
  return;
}



    const ref = doc(db, "users", user.uid, "config", "shop");

    return onSnapshot(ref, (snap) => {
  if (!snap.exists()) {
    setSavedConfig({});

    setConfigLoaded(true);
    return;
  }

  const data = snap.data();

  setSavedConfig({
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
    if (!data?.sell_price_999 || !savedConfig) return;


    if (savedConfig.frozen) return;


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
    gold999 + (savedConfig.margins?.gold999 || 0),
    "gold999",
    savedConfig
  ),
  gold916: applyMaking(
    gold916 + (savedConfig.margins?.gold916 || 0),
    "gold916",
    savedConfig
  ),
  silver999: applyMaking(
    silver999 + (savedConfig.margins?.silver999 || 0),
    "silver999",
    savedConfig
  ),
  silver925: applyMaking(
    silver925 + (savedConfig.margins?.silver925 || 0),
    "silver925",
    savedConfig
  ),
  timestamp: Date.now(),
};

;

    setRates(computed);



  }, [data, savedConfig, user]);

  return {
  rates: savedConfig?.frozen ? savedConfig?.frozenRates : rates,
  baseRates,
  savedConfig,
  configLoaded,
};


}