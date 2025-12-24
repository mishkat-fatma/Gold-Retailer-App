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
}: {
  previewConfig?: any;
}) {

  const auth = getAuth();
  if (!auth.currentUser && !previewConfig){
  return <Redirect href="/login" />;
  }

const isPreview = !!previewConfig;
const live = useLiveRates();



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

const config = isPreview ? previewConfig : live.config;

const rates = isPreview
  ? computeRatesFromConfig(live.baseRates, previewConfig)
  : live.rates;

const effectiveConfig = isPreview
  ? { ...config, frozen: false }
  : config;







const prevRates = useRef<any>(null);
const [now, setNow] = useState(new Date());


  
  /* ================= CLOCK ================= */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (rates) prevRates.current = rates;
  }, [rates]);

  if (!config || !rates) {
  return (
    <View style={styles.center}>
      <Text style={{ color: "#fff" }}>
        {isPreview
          ? "Waiting for live price…"
          : "Loading rates…"}
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
  const user = getAuth().currentUser;
  if (!user) return;

  const url = `https://gold-retailer-app.vercel.app/view?shopId${user.uid}`;

  await Share.share({
    message: `Check live gold & silver rates:\n${url}`,
  });
};



  return (
    <ScrollView
      style={[
        styles.page,
        { backgroundColor: c.background || "#070a12" },
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
          <Text
            style={[
              styles.headerTitle,
              {
                color: c.text || "#fff",
                fontFamily: font,
              },
            ]}
          >
            Live Bullion Rates
          </Text>

          {d.showTime !== false && (
            <Text style={[styles.time, { color: c.text || "#aaa" }]}>
              Updated: {now.toLocaleTimeString()}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={onShare}>
          <Ionicons
            name="share-social"
            size={22}
            color={c.price || "#D4AF37"}
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
              style={[
                styles.card,
                {
                  backgroundColor:
                    d.layout === "minimal" ? "transparent" : "#111622",
                  borderRadius: card.radius ?? 20,
                  borderColor: c.cardBorder || "transparent",
                  borderWidth: c.cardBorder ? 1 : 0,
                  padding: densityGap,
                },
              ]}
            >
              <Text
                style={[
                  styles.metal,
                  {
                    color: c.text || "#aaa",
                    fontFamily: font,
                  },
                ]}
              >
                {effectiveConfig.labels?.[key] || DEFAULT_LABELS[key]}
              </Text>

              <Text
                style={[
                  styles.price,
                  {
                    color: c.price || "#D4AF37",
                    fontFamily: font,
                  },
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
      <View key={index} style={styles.notificationCard}>
        <Ionicons
          name="notifications"
          size={16}
          color={c.price || "#D4AF37"}
        />
        <Text
          style={[
            styles.notificationText,
            { color: c.text || "#fff" },
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
    <View style={styles.footer}>
      <View style={styles.footerBlock}>
        <Text style={styles.footerTitle}>Address</Text>
        <Text style={styles.footerText}>
          {effectiveConfig.contact.address}
        </Text>
      </View>

      <View style={styles.footerBlock}>
        <Text style={styles.footerTitle}>Phone</Text>
        {effectiveConfig.contact.phones
          ?.filter(Boolean)
          .map((p: string, i: number) => (
            <Text key={i} style={styles.footerText}>
              {p}
            </Text>
          ))}
      </View>

      <View style={styles.footerBlock}>
        <Text style={styles.footerTitle}>Email</Text>
        <Text style={styles.footerText}>
          {effectiveConfig.contact.email}
        </Text>
      </View>
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
  marginTop: 30,
  gap: 12,
},

notificationCard: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 14,
  backgroundColor: "#121620",
  borderWidth: 1,
  borderColor: "transparent",
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
  color: "#9aa0aa",
},

  center: {
    flex: 1,
    backgroundColor: "#070a12",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  time: {
    fontSize: 12,
    marginTop: 4,
  },
  branding: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
  width: "100%",
  maxWidth: 520,        
  height: 260,          
  resizeMode: "contain",
  alignSelf: "center",
  marginBottom: 16,
},


  shopName: {
    fontSize: 30,
    fontWeight: "900",
  },
  card: {
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  metal: {
    fontSize: 14,
    fontWeight: "600",
  },
  price: {
    fontSize: 34,
    fontWeight: "900",
    marginTop: 10,
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
  marginTop: 40,
  paddingTop: 20,
  borderTopWidth: 1,
  borderColor: "#1f2430",
  gap: 20,
},

footerBlock: {
  gap: 6,
},

footerTitle: {
  color: "#9aa0aa",
  fontSize: 13,
  fontWeight: "700",
},

footerText: {
  color: "#fff",
  fontSize: 14,
  lineHeight: 20,
},

});
