import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signOut, getAuth } from "firebase/auth";
import { useTheme } from "../hooks/useTheme";

export default function Dashboard() {
  const router = useRouter();
  const { color, setColor } = useTheme(); // 🔥 DO NOT BLOCK RENDER

  const COLORS = ["#f5c16c", "#6c9cff", "#2ecc71", "#e74c3c", "#9b59b6"];

  return (
    <View style={styles.page}>
      <Text style={[styles.title, { color }]}>Karatpay</Text>

      {/* THEME PICKER */}
      <View style={styles.colorRow}>
        {COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.dot,
              {
                backgroundColor: c,
                borderWidth: c === color ? 3 : 0,
              },
            ]}
            onPress={() => setColor(c)}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/")}>
        <Ionicons name="stats-chart" size={22} color={color} />
        <Text style={styles.cardText}>Rate Display</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/setup")}>
        <Ionicons name="settings" size={22} color={color} />
        <Text style={styles.cardText}>Rate Setup</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          await signOut(getAuth());
          router.replace("/login");
        }}
      >
        <Text style={styles.logout}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0f1115", padding: 24 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  colorRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  dot: { width: 34, height: 34, borderRadius: 17, borderColor: "#fff" },
  card: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#161922",
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  cardText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  logout: { color: "#ff6b6b", marginTop: 30, fontWeight: "600" },
});
