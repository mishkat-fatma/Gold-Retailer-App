import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut, getAuth } from "firebase/auth";
import { useEffect, useRef, useState } from "react";

const { width, height } = Dimensions.get("window");
const ACCENT = "#D4AF37";

export default function Dashboard() {
  const router = useRouter();

  /* ================= INTRO ================= */
  const [showIntro, setShowIntro] = useState(true);

  const goldWave = useRef(new Animated.Value(-width)).current;
  const silverWave = useRef(new Animated.Value(width)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const introOpacity = useRef(new Animated.Value(1)).current;

  const dashOpacity = useRef(new Animated.Value(0)).current;
  const dashY = useRef(new Animated.Value(40)).current;

  /* ================= ICON FLOAT ================= */
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 6,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  /* ================= INTRO ANIMATION ================= */
  useEffect(() => {
    Animated.parallel([
      Animated.timing(goldWave, {
        toValue: -width * 0.15,
        duration: 900,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(silverWave, {
        toValue: width * 0.15,
        duration: 900,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(introOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowIntro(false);
          Animated.parallel([
            Animated.timing(dashOpacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(dashY, {
              toValue: 0,
              duration: 600,
              easing: Easing.out(Easing.exp),
              useNativeDriver: true,
            }),
          ]).start();
        });
      });
    });
  }, []);

  /* ================= INTRO SCREEN ================= */
  if (showIntro) {
    return (
      <Animated.View style={[styles.intro, { opacity: introOpacity }]}>
        <Animated.View
          style={[
            styles.wave,
            styles.gold,
            { transform: [{ translateX: goldWave }] },
          ]}
        />
        <Animated.View
          style={[
            styles.wave,
            styles.silver,
            { transform: [{ translateX: silverWave }] },
          ]}
        />
        <Animated.Text
          style={[
            styles.introText,
            { transform: [{ scale: logoScale }] },
          ]}
        >
          KARATPAY
        </Animated.Text>
      </Animated.View>
    );
  }

  /* ================= DASHBOARD ================= */
  return (
    <Animated.View
      style={[
        styles.page,
        {
          opacity: dashOpacity,
          transform: [{ translateY: dashY }],
        },
      ]}
    >
      {/* NEON BACK WASH */}
      <View
        pointerEvents="none"
        style={[styles.neonWash, { backgroundColor: ACCENT }]}
      />

      <Text style={[styles.title, { color: ACCENT }]}>KaratPay</Text>

      {/* RATE DISPLAY */}
      <NeonCard color={ACCENT} onPress={() => router.push("/")}>
        <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
          <Ionicons name="stats-chart" size={78} color={ACCENT} />
        </Animated.View>
        <Text style={styles.cardTitle}>Rate Display</Text>
        <Text style={styles.cardDesc}>Live bullion prices</Text>
      </NeonCard>

      {/* RATE SETUP */}
      <NeonCard color={ACCENT} onPress={() => router.push("/setup")}>
        <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
          <Ionicons name="settings" size={78} color={ACCENT} />
        </Animated.View>
        <Text style={styles.cardTitle}>Rate Setup</Text>
        <Text style={styles.cardDesc}>Display, theme & margins</Text>
      </NeonCard>

      {/* LOGOUT */}
      <TouchableOpacity
        style={[styles.logout, { backgroundColor: ACCENT }]}
        onPress={async () => {
          await signOut(getAuth());
          router.replace("/login");
        }}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ================= CARD ================= */
function NeonCard({ children, onPress, color }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
      }
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale }],
            shadowColor: color,
            borderColor: color,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  intro: {
    flex: 1,
    backgroundColor: "#05070c",
    justifyContent: "center",
    alignItems: "center",
  },
  wave: {
    position: "absolute",
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width,
    opacity: 0.35,
  },
  gold: { backgroundColor: "#f5c16c" },
  silver: { backgroundColor: "#cfd6df" },

  introText: {
    color: "#f5c16c",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 3,
  },

  page: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#070a12",
  },

  neonWash: {
    position: "absolute",
    top: -200,
    left: -200,
    right: -200,
    bottom: -200,
    opacity: 0.07,
  },

  title: {
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 36,
  },

  card: {
    height: height * 0.28,
    backgroundColor: "#141824",
    borderRadius: 34,
    marginBottom: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 18,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 16,
  },

  cardDesc: {
    color: "#9aa0aa",
    marginTop: 6,
  },

  logout: {
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
  },

  logoutText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
  },
});
