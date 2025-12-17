import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  Image,
} from "react-native";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { getAuth } from "firebase/auth";



/* ================= TYPES ================= */
type MetalKey = "gold999" | "gold916" | "silver999" | "silver925";

type NotificationItem = {
  text: string;
  enabled: boolean;
};

type Config = {
  shopName: string;
  logoUrl: string;
  labels: Record<MetalKey, string>;
  margins: Record<MetalKey, number>;
  making: null | { type: "percent" | "perGram"; value: number };
  notifications: NotificationItem[];
  frozen: boolean;
  frozenAt: any | null;
};

/* ================= CONSTANTS ================= */
const METALS: MetalKey[] = [
  "gold999",
  "gold916",
  "silver999",
  "silver925",
];

const MARGIN_UNIT: Record<MetalKey, string> = {
  gold999: "₹ / 10g",
  gold916: "₹ / 10g",
  silver999: "₹ / g",
  silver925: "₹ / g",
};

/* ================= DEFAULT CONFIG ================= */
const DEFAULT_CONFIG: Config = {
  shopName: "",
  logoUrl: "",
  labels: {
    gold999: "24K Gold (999)",
    gold916: "22K Gold (916)",
    silver999: "Silver Pure",
    silver925: "Silver Jewellery",
  },
  margins: {
    gold999: 0,
    gold916: 0,
    silver999: 0,
    silver925: 0,
  },
  making: null,
  notifications: [
    { text: "", enabled: false },
    { text: "", enabled: false },
    { text: "", enabled: false },
  ],
  frozen: false,
  frozenAt: null,
};

export default function Setup() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  /* ===== COLLAPSE STATE (UI ONLY) ===== */
  const [open, setOpen] = useState({
    branding: true,
    freeze: true,
    labels: true,
    margins: true,
    making: true,
    notifications: true,
  });

  const toggle = (key: keyof typeof open) =>
    setOpen({ ...open, [key]: !open[key] });

   /* ================= IMAGE PICKER ================= */
   const pickLogo = async () => {
    if (Platform.OS !== "web") {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Platform.OS !== "web",
      aspect: [1, 1],
      quality: 0.8,
      base64: Platform.OS !== "web",
    });

    if (result.canceled) return;
    const asset = result.assets[0];

    // WEB → use URI
    if (Platform.OS === "web") {
      setConfig({ ...config, logoUrl: asset.uri });
      return;
    }

    // MOBILE → base64
    if (!asset.base64) {
      Alert.alert("Failed to read image");
      return;
    }

    const sizeKB = (asset.base64.length * 0.75) / 1024;
    if (sizeKB > 500) {
      Alert.alert("Logo must be under 500 KB");
      return;
    }

    const mime = asset.mimeType || "image/jpeg";
    setConfig({
      ...config,
      logoUrl: `data:${mime};base64,${asset.base64}`,
    });
  };

  /* ================= SNAPSHOT ================= */
useEffect(() => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid, "config", "shop");

  const unsub = onSnapshot(ref, (snap) => {
    if (saving) return; // 🔥 THIS IS THE KEY LINE

    if (snap.exists()) {
      setConfig({ ...DEFAULT_CONFIG, ...(snap.data() as Config) });
    } else {
      setConfig(DEFAULT_CONFIG);
    }

    setLoading(false);
  });

  return () => unsub();
}, [saving]);



  /* ================= SAVE ================= */
const save = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  try {
    setSaving(true);

    // 🚀 Navigate FIRST (instant UX)
    router.replace("/dashboard");

    // 🔄 Save in background
    await setDoc(
      doc(db, "users", user.uid, "config", "shop"),
      {
        ...config,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    Alert.alert("Error", "Failed to save settings");
    setSaving(false);
  }
};



  /* ===== CARD HEADER ===== */
  const CardHeader = ({
    title,
    section,
  }: {
    title: string;
    section: keyof typeof open;
  }) => (
    <TouchableOpacity
      style={styles.cardHeader}
      onPress={() => toggle(section)}
    >
      <Text style={styles.section}>{title}</Text>
      <Text style={styles.chevron}>
        {open[section] ? "▲" : "▼"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* ================= BRANDING ================= */}
 <View style={styles.card}>
        <Text style={styles.section}>Shop Branding</Text>

        <TextInput
          style={styles.input}
          placeholder="Shop Name"
          placeholderTextColor="#888"
          value={config.shopName}
          onChangeText={(v) =>
            setConfig({ ...config, shopName: v })
          }
        />

        <TouchableOpacity style={styles.uploadBtn} onPress={pickLogo}>
          <Text style={styles.uploadText}>Upload Shop Logo</Text>
        </TouchableOpacity>

        {config.logoUrl ? (
          <>
            <Image source={{ uri: config.logoUrl }} style={styles.logo} />
            <TouchableOpacity
              onPress={() => setConfig({ ...config, logoUrl: "" })}
            >
              <Text style={styles.removeText}>Remove Logo</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      {/* ================= FREEZE ================= */}
 <View style={styles.card}>
        <Text style={styles.section}>Freeze Control</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Freeze Rates</Text>
          <Switch
            value={config.frozen}
            onValueChange={(v) =>
              setConfig({
                ...config,
                frozen: v,
                frozenAt: v ? serverTimestamp() : null,
              })
            }
          />
        </View>
      </View>


      {/* ================= PURITY LABELS ================= */}
      <View style={styles.card}>
        <CardHeader title="Purity Labels" section="labels" />
        {open.labels &&
          METALS.map((key) => (
            <TextInput
              key={key}
              style={styles.input}
              value={config.labels[key]}
              onChangeText={(v) =>
                setConfig({
                  ...config,
                  labels: { ...config.labels, [key]: v },
                })
              }
            />
          ))}
      </View>

      {/* ================= MARGINS ================= */}
      <View style={styles.card}>
        <CardHeader title="Margin Inputs" section="margins" />
        {open.margins && (
          <>
            <Text style={styles.helper}>
              Gold → ₹/10g | Silver → ₹/g
            </Text>

            {METALS.map((key) => (
              <View key={key} style={styles.marginRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{config.labels[key]}</Text>
                  <Text style={styles.unit}>{MARGIN_UNIT[key]}</Text>
                </View>

                <View style={styles.row}>
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() =>
                      setConfig({
                        ...config,
                        margins: {
                          ...config.margins,
                          [key]: Math.max(0, config.margins[key] - 1),
                        },
                      })
                    }
                  >
                    <Text style={styles.btnText}>−</Text>
                  </TouchableOpacity>

                  <TextInput
                    style={styles.marginInput}
                    keyboardType="numeric"
                    value={String(config.margins[key])}
                    onChangeText={(v) =>
                      setConfig({
                        ...config,
                        margins: {
                          ...config.margins,
                          [key]: Number(v) || 0,
                        },
                      })
                    }
                  />

                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() =>
                      setConfig({
                        ...config,
                        margins: {
                          ...config.margins,
                          [key]: config.margins[key] + 1,
                        },
                      })
                    }
                  >
                    <Text style={styles.btnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </View>

      {/* ================= MAKING ================= */}
      <View style={styles.card}>
        <CardHeader title="Making Charges" section="making" />
        {open.making && (
          <>
            <View style={styles.row}>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  config.making?.type === "percent" && styles.active,
                ]}
                onPress={() =>
                  setConfig({
                    ...config,
                    making: { type: "percent", value: 0 },
                  })
                }
              >
                <Text style={styles.toggleText}>%</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggle,
                  config.making?.type === "perGram" && styles.active,
                ]}
                onPress={() =>
                  setConfig({
                    ...config,
                    making: { type: "perGram", value: 0 },
                  })
                }
              >
                <Text style={styles.toggleText}>₹/g</Text>
              </TouchableOpacity>
            </View>

            {config.making && (
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(config.making.value)}
                onChangeText={(v) =>
                  setConfig({
                    ...config,
                    making: {
                      ...config.making!,
                      value: Number(v) || 0,
                    },
                  })
                }
              />
            )}
          </>
        )}
      </View>

      {/* ================= NOTIFICATIONS ================= */}
      <View style={styles.card}>
        <CardHeader title="Notifications" section="notifications" />
        {open.notifications &&
          config.notifications.map((item, index) => (
            <View key={index} style={styles.notificationBox}>
              <TextInput
                style={styles.input}
                placeholder={`Notification ${index + 1}`}
                placeholderTextColor="#888"
                maxLength={100}
                value={item.text}
                onChangeText={(v) => {
                  const copy = [...config.notifications];
                  copy[index].text = v;
                  setConfig({ ...config, notifications: copy });
                }}
              />

              <View style={styles.row}>
                <Text style={styles.label}>Enable</Text>
                <Switch
                  value={item.enabled}
                  onValueChange={(v) => {
                    const copy = [...config.notifications];
                    copy[index].enabled = v;
                    setConfig({ ...config, notifications: copy });
                  }}
                />
              </View>
            </View>
          ))}
      </View>

      {/* ================= SAVE ================= */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
      >
        <Text style={styles.saveText}>
          {saving ? "Saving..." : "Save & Go to Dashboard"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  page: { padding: 20, backgroundColor: "#0f1115" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: "#161922",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#242836",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  chevron: {
    color: "#9aa0aa",
    fontSize: 14,
  },

  section: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },

  helper: {
    color: "#9aa0aa",
    fontSize: 12,
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#1c1f26",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2a2d35",
    marginBottom: 10,
  },

  uploadBtn: {
  backgroundColor: "#1c1f26",
  borderWidth: 1,
  borderColor: "#2a2d35",
  borderRadius: 10,
  paddingVertical: 14,
  alignItems: "center",
  marginBottom: 10,
},

uploadText: {
  color: "#9aa0aa",
  fontWeight: "600",
},


  logo: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginTop: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  marginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },

  label: { color: "#ccc", fontSize: 14 },
  unit: { color: "#9aa0aa", fontSize: 12 },

  btn: {
    width: 36,
    height: 36,
    backgroundColor: "#222636",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: { color: "#fff", fontSize: 20 },

  marginInput: {
    width: 60,
    height: 36,
    backgroundColor: "#1c1f26",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2d35",
    color: "#fff",
    textAlign: "center",
    marginHorizontal: 8,
  },

  toggle: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "#1c1f26",
    borderRadius: 12,
    marginRight: 10,
  },

  active: { backgroundColor: "#6c4ef6" },

  toggleText: { color: "#fff", fontWeight: "600" },

  notificationBox: {
    backgroundColor: "#1c1f26",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  saveBtn: {
    backgroundColor: "#6c4ef6",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#6c4ef6",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  removeBtn: {
  marginTop: 8,
  alignSelf: "flex-start",
},

removeText: {
  color: "#ff6b6b",
  fontSize: 13,
  fontWeight: "600",
},

});
