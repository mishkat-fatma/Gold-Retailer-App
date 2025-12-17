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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLiveRates } from "../hooks/useLiveRates";
import { useTheme } from "../hooks/useTheme";

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
  gold999: "24K Gold (999)",
  gold916: "22K Gold (916)",
  silver999: "Silver Pure",
  silver925: "Silver Jewellery",
};

export default function RateDisplay() {
  const auth = getAuth();

  if (!auth.currentUser) {
    return <Redirect href="/login" />;
  }
  const { rates, config } = useLiveRates();
  const { color} = useTheme();
  const prevRates = useRef<any>(null);

  const [now, setNow] = useState(new Date());
  const [, forceRefresh] = useState(0); // 🔑 for 10-sec refresh

  /* ================= CLOCK ================= */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ================= 10s REFRESH ================= */
  useEffect(() => {
    if (config?.frozen) return;

    const interval = setInterval(() => {
      forceRefresh((v) => v + 1);
    }, 10000); // 🔥 10 seconds

    return () => clearInterval(interval);
  }, [config?.frozen]);

  /* ================= TRACK PREVIOUS ================= */
  useEffect(() => {
    if (rates) prevRates.current = rates;
  }, [rates]);

  /* ================= SHARE ================= */
  const onShare = async () => {
    if (!rates) return;

    let text = `Live Bullion Rates\n\n`;

    METALS.forEach((k) => {
      text += `${config?.labels?.[k] || DEFAULT_LABELS[k]}: ₹${rates[k]}\n`;
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
        <Text style={{ color: "#fff" }}>Loading live rates...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page}>
      {/* ================= HEADER ================= */}
      <View style={[styles.header, { borderColor: color }]}>
        <View>
          <Text style={[styles.title, { color }]}>Live Bullion Rates</Text>
          <Text style={styles.time}>{now.toLocaleTimeString()}</Text>
        </View>

        <TouchableOpacity onPress={onShare}>
          <Ionicons name="share-social" size={22} color={color} />
        </TouchableOpacity>
      </View>

      {/* ================= BRANDING ================= */}
      {config?.shopName ? (
        <View style={styles.branding}>
          {config.logoUrl ? (
            <Image source={{ uri: config.logoUrl }} style={styles.logo} />
          ) : null}
          <Text style={styles.shopName}>{config.shopName}</Text>
        </View>
      ) : null}

      {/* ================= NOTIFICATIONS ================= */}
      {config?.notifications
        ?.filter((n: any) => n.enabled && n.text)
        .map((n: any, i: number) => (
          <View key={i} style={styles.notice}>
            <Text style={styles.noticeText}>{n.text}</Text>
          </View>
        ))}

      {/* ================= RATES ================= */}
      {METALS.map((key) => {
        const current = rates[key];
        const prev = prevRates.current?.[key];
        const diff = prev !== undefined ? current - prev : 0;

        return (
          <View key={key} style={styles.card}>
            <Text style={styles.metal}>
              {config?.labels?.[key] || DEFAULT_LABELS[key]}
            </Text>

            <View style={styles.row}>
              <Text style={styles.price}>₹{current.toFixed(2)}</Text>

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
            </View>

            {config?.making && (
              <Text style={styles.making}>
                Making Charges:{" "}
                {config.making.type === "percent"
                  ? `${config.making.value}%`
                  : `₹${config.making.value}/g`}
              </Text>
            )}
          </View>
        );
      })}

      {/* ================= FREEZE TAG ================= */}
      {config?.frozen && (
        <View style={styles.freeze}>
          <Ionicons name="snow" size={16} color={color} />
          <Text style={{ color, fontWeight: "600" }}>Rates Frozen</Text>
        </View>
      )}
    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0f1115",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f1115",
  },
  header: {
    backgroundColor: "#161922",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#f5c16c",
    fontSize: 18,
    fontWeight: "700",
  },
  time: {
    color: "#9aa0aa",
    fontSize: 12,
    marginTop: 4,
  },
  branding: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  shopName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  notice: {
    backgroundColor: "#1c1f26",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#f5c16c",
  },
  noticeText: {
    color: "#fff",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#161922",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242836",
  },
  metal: {
    color: "#9aa0aa",
    fontSize: 13,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  change: {
    fontSize: 13,
    fontWeight: "600",
  },
  up: { color: "#2ecc71" },
  down: { color: "#e74c3c" },
  making: {
    color: "#9aa0aa",
    fontSize: 12,
    marginTop: 6,
  },
  freeze: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
  },
  freezeText: {
    color: "#6c9cff",
    fontSize: 13,
    fontWeight: "600",
  },
});
