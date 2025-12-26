import { Redirect } from "expo-router";
import { getAuth } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Image,
  Dimensions,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLiveRates } from "../hooks/useLiveRates";


const { width } = Dimensions.get("window");



type MetalKey = "gold999" | "gold916" | "silver999" | "silver925";

const METALS: MetalKey[] = [
  "gold999",
  "gold916",
  "silver999",
  "silver925",
];

const DEFAULT_LABELS: Record<MetalKey, string> = {
  gold999: "24K Gold (999)",
  gold916: "22K Gold (916)",
  silver999: "Silver (999)",
  silver925: "Silver (925)",
};

export default function RateDisplay({
  previewConfig,
  publicShopId,
}: {
  previewConfig?: any;
  publicShopId?: string;
}) {


  const auth = getAuth();
if (!auth.currentUser && !previewConfig && !publicShopId) {
  return <Redirect href="/login" />;
}


const isPreview = !!previewConfig;
const live = useLiveRates(publicShopId);

const config = isPreview
  ? previewConfig
  : live.savedConfig;




const computeRatesFromConfig = (base: any, cfg: any) => {
  if (!base || !cfg) return null;

  const applyMaking = (price: number, key: MetalKey) => {
    const m = cfg.making?.[key];
    if (!m || !m.enabled) return price;

    return m.type === "percent"
      ? price + price * (m.value / 100)
      : price + m.value;
  };

  return {
    gold999: applyMaking(base.gold999 + (cfg.margins?.gold999 || 0), "gold999"),
    gold916: applyMaking(base.gold916 + (cfg.margins?.gold916 || 0), "gold916"),
    silver999: applyMaking(base.silver999 + (cfg.margins?.silver999 || 0), "silver999"),
    silver925: applyMaking(base.silver925 + (cfg.margins?.silver925 || 0), "silver925"),
  };
};




const rates = isPreview
  ? computeRatesFromConfig(live.baseRates, previewConfig)
  : live.rates;

const effectiveConfig = {
  // defaults (NEVER disappear)
  shopName: "",
  logoUrl: "",
  contact: {
    address: "",
    phones: [],
    email: "",
  },
  displayColors: {
    background: "#FFFFFF",
    text: "#111827",
    price: "#C9A227",
    cardBorder: "#E5E7EB",
  },

  // saved / preview data overrides defaults
  ...(config || {}),

  // preview should never freeze
  frozen: isPreview ? false : config?.frozen,
};








const prevRates = useRef<any>(null);




  useEffect(() => {
    if (rates) prevRates.current = rates;
  }, [rates]);

  if (!live.configLoaded || !rates) {
  return (
    <View style={styles.center}>
      <Text style={{ color: "#111827" }}>
        Loading rates…
      </Text>
    </View>
  );
}



  const enabledNotifications =
  Array.isArray(effectiveConfig.notifications)
    ? effectiveConfig.notifications.filter(
        (n: any) => n.enabled && n.text?.trim()
      )
    : [];



  /* ================= CONFIG ================= */
  const d = effectiveConfig.display || {};
  const c = effectiveConfig.displayColors || {};
  const card = effectiveConfig.card || {};


  const precision = d.precision ?? 2;


const getMakingText = (key: MetalKey) => {
  if (!effectiveConfig || !effectiveConfig.making) return null;

  const m = effectiveConfig.making[key];
  if (!m || !m.enabled || m.value <= 0) return null;

  const label =
    effectiveConfig.makingLabels?.[key]?.trim() || "Making Charges";

  return m.type === "percent"
    ? `+ ${label}: ${m.value}%`
    : `+ ${label}: ₹${m.value}/g`;
};






  const densityGap =
    d.density === "compact" ? 10 : d.density === "spacious" ? 26 : 18;

  const alignItems =
    d.align === "left"
      ? "flex-start"
      : d.align === "right"
      ? "flex-end"
      : "center";

  const font =
    d.font === "serif"
      ? "serif"
      : d.font === "classic"
      ? "sans-serif"
      : "default";

  /* ================= SHARE ================= */
 const onShare = async () => {
  const shopId =
    publicShopId || getAuth().currentUser?.uid;

  if (!shopId) {
    Alert.alert("Error", "Unable to generate share link");
    return;
  }

  const url = `https://gold-retailer-app.vercel.app/view?shopId=${shopId}`;

  await Share.share({
    message: `Check live gold & silver rates:\n${url}`,
  });
};



  return (
    <ScrollView
      style={[
        styles.page,
        { backgroundColor: c.background || "white" },
      ]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >

     

      {/* ================= HEADER ================= */}
      <View
        style={[
          styles.header,
          { alignItems, marginBottom: densityGap },
        ]}
      >
        <View>
          

         
        </View>

        <TouchableOpacity onPress={onShare}>
          <Ionicons
            name="share-social"
            size={22}
            color={c.text || "#D4AF37"}
          />
        </TouchableOpacity>
      </View>

      {/* ================= BRANDING ================= */}
      {d.showShopName !== false && (effectiveConfig.shopName || effectiveConfig.logoUrl) && (
        <View
          style={[
            styles.branding,
            { justifyContent: alignItems },
          ]}
        >
          {effectiveConfig.logoUrl && (
            <Image
              source={{ uri: effectiveConfig.logoUrl }}
              style={styles.logo}
            />
          )}
          <Text
            style={[
              styles.shopName,
              {
                color: c.text || "#fff",
                fontFamily: font,
                textAlign: d.align || "center",
              },
            ]}
          >
            {effectiveConfig.shopName}
          </Text>
        </View>
      )}

      {/* ================= RATE CARDS ================= */}
<View style={{ gap: densityGap }}>
  {METALS.map((key) => {
    if (d.rows?.[key] === false) return null;

    const current = rates?.[key];
    if (current == null) return null;

    const prev = prevRates.current?.[key];
    const diff = prev !== undefined ? current - prev : 0;

    return (
      <View
        key={key}
        style={[
          styles.card,
          {
            backgroundColor:
              d.layout === "minimal" ? "transparent" : "#FFFFFF",
            borderRadius: card.radius ?? 20,
            borderColor: c.cardBorder || "transparent",
            borderWidth: c.cardBorder ? 1 : 0,
            padding: Math.max(10, densityGap - 6),
          },
        ]}
      >
        <Text
          style={[
            styles.metal,
            { color: c.text || "#aaa", fontFamily: font },
          ]}
        >
          {effectiveConfig.labels?.[key] || DEFAULT_LABELS[key]}
        </Text>

        <Text
          style={[
            styles.price,
            { color: c.price || "#D4AF37", fontFamily: font },
          ]}
        >
          ₹{current.toFixed(precision)}
        </Text>

        {getMakingText(key) && (
          <Text style={styles.making}>
            {getMakingText(key)}
          </Text>
        )}

        {diff !== 0 && (
          <Text
            style={[
              styles.change,
              { color: diff > 0 ? "#2ecc71" : "#e74c3c" },
            ]}
          >
            {diff > 0 ? "▲" : "▼"}{" "}
            {Math.abs(diff).toFixed(precision)}
          </Text>
        )}
      </View>
    );
  })}
</View>



      {/* ================= NOTIFICATIONS ================= */}
{enabledNotifications.length > 0 && (
  <View style={styles.notificationsWrap}>
    {enabledNotifications.map((item: any, index: number) => (
      <View
        key={index}
        style={[
          styles.notificationCard,
          { borderColor: c.cardBorder || "#E5E7EB" },
        ]}
      >
        <Ionicons
          name="notifications"
          size={16}
          color={c.text || "#111827"}
        />

        <Text
          style={[
            styles.notificationText,
            { color: c.text || "#111827" },
          ]}
        >
          {item.text}
        </Text>
      </View>
    ))}
  </View>
)}


      {/* ================= FREEZE ================= */}
      {effectiveConfig.frozen && (
        <View style={styles.freeze}>
          <Ionicons
            name="snow"
            size={16}
            color={c.price || "#D4AF37"}
          />
          <Text
            style={{
              color: c.price || "#D4AF37",
              fontWeight: "800",
            }}
          >
            Rates Frozen
          </Text>
        </View>
      )}

{/* ================= FOOTER CONTACT ================= */}
{effectiveConfig.contact &&
  (effectiveConfig.contact.address ||
    effectiveConfig.contact.email ||
    effectiveConfig.contact.phones?.some(Boolean)) && (
    <View
      style={[
        styles.footer,
        {
          borderColor: c.cardBorder || "#E5E7EB",
          alignItems: "center",
        },
      ]}
    >
      {effectiveConfig.contact.address ? (
        <Text style={[styles.footerLine, { color: c.text }]}>
          📍 {effectiveConfig.contact.address}
        </Text>
      ) : null}

      {effectiveConfig.contact.phones
        ?.filter(Boolean)
        .map((p: string, i: number) => (
          <Text
            key={i}
            style={[styles.footerLine, { color: c.text }]}
          >
            📞 {p}
          </Text>
        ))}

      {effectiveConfig.contact.email ? (
        <Text style={[styles.footerLine, { color: c.text }]}>
          ✉️ {effectiveConfig.contact.email}
        </Text>
      ) : null}

      {/* Powered by */}
      <Text style={styles.poweredBy}>
        Powered by <Text style={{ fontWeight: "800" }}>KaratPay</Text>
      </Text>
    </View>
)}

    </ScrollView>
  );
}


/* ================= STYLES ================= */

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 18,
  },
  notificationsWrap: {
  marginTop: 14,
  gap: 8,
},

notificationCard: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 14,
  borderWidth: 1,
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
},

notificationText: {
  flex: 1,
  fontSize: 14,
  fontWeight: "600",
},

  making: {
  marginTop: 4,
  fontSize: 13,
  fontWeight: "600",
  color: "black",
},

  center: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  branding: {
    alignItems: "center",
    marginBottom:10,
  },
  logo: {
  width: "100%",
  maxWidth: 520,        
  height: 150,          
  resizeMode: "contain",
  alignSelf: "center",
  marginBottom: 8,
},


  shopName: {
    fontSize: 30,
    fontWeight: "900",
  },
  card: {
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
  borderRadius: 18,
  paddingVertical: 10,     
},

  metal: {
  fontSize: 13,
  fontWeight: "700",
  letterSpacing: 0.5,
  marginBottom: 2,
},
  price: {
    fontSize: 25,
    fontWeight: "900",
    marginTop: 6,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  change: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
  },
  freeze: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  footer: {
  marginTop: 16,
  paddingTop: 5,
  borderTopWidth: 1,
  gap: 10,
},

footerLine: {
  fontSize: 14,
  fontWeight: "500",
  textAlign: "center",
  lineHeight: 22,
},

poweredBy: {
  marginTop: 10,
  fontSize: 12,
  color: "rgba(60, 60, 60, 1)",
  textAlign: "center",
},








});
