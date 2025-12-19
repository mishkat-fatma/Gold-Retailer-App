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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLiveRates } from "../hooks/useLiveRates";
import { useTheme } from "../hooks/useTheme";

const { width } = Dimensions.get("window");

/* ================= TYPES ================= */
type MetalKey = "gold999" | "gold916" | "silver999" | "silver925";

/* ================= CONSTANTS ================= */
const METALS: MetalKey[] = [
  "gold999",
  "gold916",
  "silver999",
  "silver925",
];

const DEFAULT_LABELS: Record<MetalKey, string> = {
  gold999: "24K Gold",
  gold916: "22K Gold",
  silver999: "Pure Silver",
  silver925: "925 Silver",
};

export default function RateDisplay() {
  const auth = getAuth();
  if (!auth.currentUser) return <Redirect href="/login" />;

  const { rates, config } = useLiveRates();
  const { color } = useTheme();
  const prevRates = useRef<any>(null);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (rates) prevRates.current = rates;
  }, [rates]);

  const onShare = async () => {
    if (!rates) return;

    let text = `Live Bullion Rates\n\n`;
    METALS.forEach((k) => {
      text += `${config?.labels?.[k] || DEFAULT_LABELS[k]}: ₹${rates[k].toFixed(
        2
      )}\n`;
    });

    if (config?.making) {
      text += `\nMaking Charges: ${
        config.making.type === "percent"
          ? `${config.making.value}%`
          : `₹${config.making.value}/g`
      }`;
    }

    await Share.share({ message: text });
  };

  if (!rates) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Loading live rates…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: "#070a12" }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color }]}>
            Live Bullion Rates
          </Text>
          <Text style={styles.time}>
            Updated: {now.toLocaleTimeString()}
          </Text>
        </View>

        <TouchableOpacity onPress={onShare}>
          <Ionicons name="share-social" size={24} color={color} />
        </TouchableOpacity>
      </View>

      {/* ================= BRANDING ================= */}
      {(config?.shopName || config?.logoUrl) && (
        <View style={styles.branding}>
          {config?.logoUrl && (
            <Image source={{ uri: config.logoUrl }} style={styles.logo} />
          )}
          <Text style={[styles.shopName, { textShadowColor: color }]}>
            {config?.shopName || "Jewellery Store"}
          </Text>
        </View>
      )}

      {/* ================= RATE GRID ================= */}
      <View style={styles.grid}>
        {METALS.map((key) => {
          const current = rates[key];
          const prev = prevRates.current?.[key];
          const diff = prev !== undefined ? current - prev : 0;

          return (
            <View
              key={key}
              style={[
                styles.card,
                {
                  borderColor: color,
                  shadowColor: color,
                },
              ]}
            >
              <Text style={styles.metal}>
                {config?.labels?.[key] || DEFAULT_LABELS[key]}
              </Text>

              <Text style={[styles.price, { color }]}>
                ₹{current.toFixed(2)}
              </Text>

              {diff !== 0 && (
                <Text
                  style={[
                    styles.change,
                    diff > 0 ? styles.up : styles.down,
                  ]}
                >
                  {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(2)}
                </Text>
              )}

              {config?.making && (
                <Text style={styles.making}>
                  Making:{" "}
                  {config.making.type === "percent"
                    ? `${config.making.value}%`
                    : `₹${config.making.value}/g`}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* ================= NOTIFICATIONS ================= */}
      {config?.notifications
        ?.filter((n: any) => n.enabled && n.text)
        .map((n: any, i: number) => (
          <View
            key={i}
            style={[styles.notice, { borderLeftColor: color }]}
          >
            <Ionicons
              name="notifications"
              size={16}
              color={color}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.noticeText}>{n.text}</Text>
          </View>
        ))}

      {/* ================= FREEZE ================= */}
      {config?.frozen && (
        <View style={styles.freeze}>
          <Ionicons name="snow" size={16} color={color} />
          <Text style={{ color, fontWeight: "800" }}>
            Rates Frozen
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
  center: {
    flex: 1,
    backgroundColor: "#070a12",
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  time: {
    color: "#9aa0aa",
    fontSize: 12,
    marginTop: 4,
  },

  /* BRANDING */
  branding: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 28,
  },

  logo: {
    width: 110,
    height: 110,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#222",
  },

  shopName: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },

  /* GRID */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: width > 700 ? "48%" : "100%",
    backgroundColor: "#111622",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },

  metal: {
    color: "#9aa0aa",
    fontSize: 14,
    fontWeight: "600",
  },

  price: {
    fontSize: 34,
    fontWeight: "900",
    marginTop: 12,
  },

  change: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
  },

  up: { color: "#2ecc71" },
  down: { color: "#e74c3c" },

  making: {
    color: "#9aa0aa",
    fontSize: 12,
    marginTop: 8,
  },

  notice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1f26",
    padding: 14,
    borderRadius: 14,
    marginTop: 12,
    borderLeftWidth: 4,
  },

  noticeText: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
  },

  freeze: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
});
