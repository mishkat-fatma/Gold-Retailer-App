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
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Platform, Dimensions } from "react-native";
import { getAuth } from "firebase/auth";
import RateDisplay from "./index";

const { width } = Dimensions.get("window");

/* ================= TYPES ================= */
type MetalKey = "gold999" | "gold916" | "silver999" | "silver925";
type TabKey = "profile" | "rates" | "theme";

type NotificationItem = {
  text: string;
  enabled: boolean;
};

type Config = {
  shopName: string;
  logoUrl: string;
  labels: Record<MetalKey, string>;
  margins: Record<MetalKey, number>;
  making: Record<
    MetalKey,
    { enabled: boolean; type: "percent" | "perGram"; value: number }
  >;
  makingLabels: Record<MetalKey, string>;
  displayColors: {
    background: string;
    text: string;
    price: string;
    cardBorder: string;
  };
  notifications: NotificationItem[];
  contact: {
    address: string;
    phones: string[];
    email: string;
  };
  frozen: boolean;
  frozenAt: any | null;
};

/* ================= HELPERS ================= */
const normalizeMaking = (making: any) => ({
  gold999: making?.gold999 ?? { enabled: false, type: "percent", value: 0 },
  gold916: making?.gold916 ?? { enabled: false, type: "percent", value: 0 },
  silver999: making?.silver999 ?? { enabled: false, type: "perGram", value: 0 },
  silver925: making?.silver925 ?? { enabled: false, type: "perGram", value: 0 },
});

/* ================= CONSTANTS ================= */
const METALS: MetalKey[] = ["gold999", "gold916", "silver999", "silver925"];

const MARGIN_UNIT: Record<MetalKey, string> = {
  gold999: "₹ / 10g",
  gold916: "₹ / 10g",
  silver999: "₹ / g",
  silver925: "₹ / g",
};

const MARGIN_STEP: Record<MetalKey, number> = {
  gold999: 50,
  gold916: 50,
  silver999: 10,
  silver925: 10,
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
  margins: { gold999: 0, gold916: 0, silver999: 0, silver925: 0 },
  making: {
    gold999: { enabled: false, type: "percent", value: 0 },
    gold916: { enabled: false, type: "percent", value: 0 },
    silver999: { enabled: false, type: "perGram", value: 0 },
    silver925: { enabled: false, type: "perGram", value: 0 },
  },
  makingLabels: {
    gold999: "Making Charges",
    gold916: "Making Charges",
    silver999: "Making Charges",
    silver925: "Making Charges",
  },
  notifications: [
    { text: "", enabled: false },
    { text: "", enabled: false },
    { text: "", enabled: false },
  ],
  displayColors: {
    background: "#FFFFFF",
    text: "#111827",
    price: "#C9A227",
    cardBorder: "#E5E7EB",
  },
  contact: { address: "", phones: [""], email: "" },
  frozen: false,
  frozenAt: null,
};

export default function Setup() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  

  const COLOR_PRESETS = [
  {
    name: "Warm Pearl",
    background: "#918f8e68",   // warm off-white (very visible)
    text: "#111111",
    price: "#C89B3C",
    cardBorder: "#7a797690",
  },
  {
    name: "Soft Sky",
    background: "#9ed1e2ff",   // light blue tint
    text: "#0F172A",
    price: "#2563EB",
    cardBorder: "#9eb0c7ff",
  },
  {
    name: "Mint Cream",
    background: "#a4eecbff",   // fresh green tint
    text: "#064E3B",
    price: "#059669",
    cardBorder: "#0cd477ff",
  },
  {
    name: "Sand Beige",
    background: "#FBF3E6",   // jewellery-showroom beige
    text: "#3A2E1F",
    price: "#B45309",
    cardBorder: "#E7D3B1",
  },
  {
    name: "Rose Linen",
    background: "#cda9bdff",   // soft pink tint
    text: "#4A044E",
    price: "#BE185D",
    cardBorder: "#FBCFE8",
  },
];



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
    base64: true,
  });

  if (result.canceled) return;
  const asset = result.assets[0];

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


  if (snap.exists()) {
    const data = snap.data() as Partial<Config>;

    setConfig({
  ...DEFAULT_CONFIG,
  ...data,

  notifications: data.notifications ?? DEFAULT_CONFIG.notifications,

  making: normalizeMaking(data.making),

  // preserve saved making labels
  makingLabels:
    data.makingLabels ?? DEFAULT_CONFIG.makingLabels,
});

  } else {
    setConfig(DEFAULT_CONFIG);
  }

  setLoading(false);
});


  // ✅ CLEANUP MUST BE HERE
  return () => unsub();
}, []);


 /* ================= SAVE ================= */
const save = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  // 🔓 Unlock UI immediately
  setSaving(false);

  // 🚀 Navigate immediately
  router.replace("/dashboard");

  // 🔄 Save in background (DO NOT await)
  setDoc(
    doc(db, "users", user.uid, "config", "shop"),
    {
      ...config,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  ).catch(() => {
    Alert.alert("Error", "Failed to save settings");
  });
};

 /* ================= RANDOM COLORS ================= */
const randomHex = () =>
  "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");

const applyRandomTheme = () => {
  setConfig({
    ...config,
    displayColors: {
      background: randomHex(),
      text: randomHex(),
      price: randomHex(),
      cardBorder: randomHex(),
    },
  });
};



  return (
    <View style={styles.page}>

      {/* ================= LEFT ================= */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ================= LIVE PREVIEW ================= */}
<View style={styles.previewWrap}>
  <Text style={styles.previewTitle}>Live Preview</Text>

  <View style={styles.previewCard}>
  <View style={{ maxHeight: 420 }}>
    <RateDisplay previewConfig={config} />
  </View>
</View>

</View>

        {/* ================= TABS ================= */}
        <View style={styles.tabs}>
          {["profile", "rates", "theme"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t as TabKey)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "profile" && (
  <>
    {/* ================= SHOP BRANDING ================= */}
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

      <TouchableOpacity
  style={styles.uploadBtn}
  onPress={pickLogo}
>
  <Text style={styles.uploadText}>Upload Shop Logo</Text>
</TouchableOpacity>


      {config.logoUrl ? (
        <>
          <Image source={{ uri: config.logoUrl }} style={styles.logo} />
          <TouchableOpacity
            onPress={() =>
              setConfig({ ...config, logoUrl: "" })
            }
          >
            <Text style={styles.removeText}>Remove Logo</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>

    {/* ================= FREEZE CONTROL ================= */}
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

    {/* ================= CONTACT DETAILS ================= */}
    <View style={styles.card}>
      <Text style={styles.section}>Contact Details (Footer)</Text>

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        multiline
        placeholder="Shop address"
        value={config.contact.address}
        onChangeText={(v) =>
          setConfig({
            ...config,
            contact: { ...config.contact, address: v },
          })
        }
      />

      <Text style={styles.label}>Phone Numbers</Text>
      {config.contact.phones.map((p, i) => (
        <TextInput
          key={i}
          style={styles.input}
          placeholder={`Phone ${i + 1}`}
          keyboardType="phone-pad"
          value={p}
          onChangeText={(v) => {
            const copy = [...config.contact.phones];
            copy[i] = v;
            setConfig({
              ...config,
              contact: { ...config.contact, phones: copy },
            });
          }}
        />
      ))}

      <TouchableOpacity
        onPress={() =>
          setConfig({
            ...config,
            contact: {
              ...config.contact,
              phones: [...config.contact.phones, ""],
            },
          })
        }
      >
        <Text style={{ color: "#6c4ef6", marginBottom: 10 }}>
          + Add phone
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={config.contact.email}
        onChangeText={(v) =>
          setConfig({
            ...config,
            contact: { ...config.contact, email: v },
          })
        }
      />
    </View>

    {/* ================= SAVE ================= */}
    <TouchableOpacity style={styles.saveBtn} onPress={save}>
      <Text style={styles.saveText}>Save & Go to Dashboard</Text>
    </TouchableOpacity>
  </>
)}

        {activeTab === "rates" && (
  <>
    {/* ================= PURITY LABELS ================= */}
    <View style={styles.card}>
      <Text style={styles.section}>Purity Labels</Text>

      {METALS.map((key) => (
        <TextInput
          key={key}
          style={styles.input}
          placeholder={key}
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

    {/* ================= MARGIN INPUTS ================= */}
    <View style={styles.card}>
      <Text style={styles.section}>Margin Inputs</Text>
      <Text style={styles.helper}>
        Gold → ₹ / 10g | Silver → ₹ / g
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
                    [key]: Math.max(
                      0,
                      config.margins[key] - MARGIN_STEP[key]
                    ),
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
                    [key]:
                      config.margins[key] + MARGIN_STEP[key],
                  },
                })
              }
            >
              <Text style={styles.btnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>

    {/* ================= MAKING CHARGES ================= */}
    <View style={styles.card}>
      <Text style={styles.section}>Making Charges</Text>

      {METALS.map((key) => {
        const item = config.making[key];

        return (
          <View key={key} style={{ marginBottom: 18 }}>
            <TextInput
              style={styles.input}
              placeholder="Making charge label (eg: Labour)"
              value={config.makingLabels[key]}
              onChangeText={(v) =>
                setConfig({
                  ...config,
                  makingLabels: {
                    ...config.makingLabels,
                    [key]: v,
                  },
                })
              }
            />

            <View style={styles.row}>
              <Text style={styles.label}>
                {config.labels[key]}
              </Text>
              <Switch
                value={item.enabled}
                onValueChange={(v) =>
                  setConfig({
                    ...config,
                    making: {
                      ...config.making,
                      [key]: { ...item, enabled: v },
                    },
                  })
                }
              />
            </View>

            {item.enabled && (
              <>
                <View style={[styles.row, { marginTop: 8 }]}>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      item.type === "percent" &&
                        styles.active,
                    ]}
                    onPress={() =>
                      setConfig({
                        ...config,
                        making: {
                          ...config.making,
                          [key]: {
                            ...item,
                            type: "percent",
                          },
                        },
                      })
                    }
                  >
                    <Text style={styles.toggleText}>%</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      item.type === "perGram" &&
                        styles.active,
                    ]}
                    onPress={() =>
                      setConfig({
                        ...config,
                        making: {
                          ...config.making,
                          [key]: {
                            ...item,
                            type: "perGram",
                          },
                        },
                      })
                    }
                  >
                    <Text style={styles.toggleText}>₹/g</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Enter making charge"
                  value={String(item.value)}
                  onChangeText={(v) =>
                    setConfig({
                      ...config,
                      making: {
                        ...config.making,
                        [key]: {
                          ...item,
                          value: Number(v) || 0,
                        },
                      },
                    })
                  }
                />
              </>
            )}
          </View>
        );
      })}
    </View>

    {/* ================= NOTIFICATIONS ================= */}
    <View style={styles.card}>
      <Text style={styles.section}>Notifications</Text>

      {config.notifications.map((item, index) => (
        <View key={index} style={styles.notificationBox}>
          <TextInput
            style={styles.input}
            placeholder={`Notification ${index + 1}`}
            maxLength={100}
            value={item.text}
            onChangeText={(v) => {
              const copy = [...config.notifications];
              copy[index].text = v;
              setConfig({
                ...config,
                notifications: copy,
              });
            }}
          />

          <View style={styles.row}>
            <Text style={styles.label}>Enable</Text>
            <Switch
              value={item.enabled}
              onValueChange={(v) => {
                const copy = [...config.notifications];
                copy[index].enabled = v;
                setConfig({
                  ...config,
                  notifications: copy,
                });
              }}
            />
          </View>
        </View>
      ))}
    </View>

    {/* ================= SAVE ================= */}
    <TouchableOpacity style={styles.saveBtn} onPress={save}>
      <Text style={styles.saveText}>
        Save & Go to Dashboard
      </Text>
    </TouchableOpacity>
  </>
)}

        {activeTab === "theme" && (
  <>
    {/* ================= THEME : DISPLAY COLORS ================= */}
    <View style={styles.card}>
      <Text style={styles.section}>Display Colors</Text>

      <Text style={styles.label}>Background Color</Text>
      <TextInput
        style={styles.input}
        value={config.displayColors.background}
        onChangeText={(v) =>
          setConfig({
            ...config,
            displayColors: {
              ...config.displayColors,
              background: v,
            },
          })
        }
      />

      <Text style={styles.label}>Text Color</Text>
      <TextInput
        style={styles.input}
        value={config.displayColors.text}
        onChangeText={(v) =>
          setConfig({
            ...config,
            displayColors: {
              ...config.displayColors,
              text: v,
            },
          })
        }
      />

      <Text style={styles.label}>Price Color</Text>
      <TextInput
        style={styles.input}
        value={config.displayColors.price}
        onChangeText={(v) =>
          setConfig({
            ...config,
            displayColors: {
              ...config.displayColors,
              price: v,
            },
          })
        }
      />

      <Text style={styles.label}>Card Border Color</Text>
      <TextInput
        style={styles.input}
        value={config.displayColors.cardBorder}
        onChangeText={(v) =>
          setConfig({
            ...config,
            displayColors: {
              ...config.displayColors,
              cardBorder: v,
            },
          })
        }
      />

      {/* ================= PRESETS ================= */}
      <Text style={[styles.label, { marginTop: 12 }]}>
        Quick Presets
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {COLOR_PRESETS.map((p) => (
          <TouchableOpacity
            key={p.name}
            style={styles.presetBtn}
            onPress={() =>
              setConfig({
                ...config,
                displayColors: {
                  background: p.background,
                  text: p.text,
                  price: p.price,
                  cardBorder: p.cardBorder,
                },
              })
            }
          >
            <Text style={styles.presetText}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ================= RANDOM ================= */}
      <TouchableOpacity
        style={[
          styles.presetBtn,
          { borderColor: "#D4AF37" },
        ]}
        onPress={applyRandomTheme}
      >
        <Text style={styles.presetText}>
          🎨 Random Theme
        </Text>
      </TouchableOpacity>
    </View>

    {/* ================= SAVE ================= */}
    <TouchableOpacity
      style={styles.saveBtn}
      onPress={save}
    >
      <Text style={styles.saveText}>
        Save & Go to Dashboard
      </Text>
    </TouchableOpacity>
  </>
)}

      </ScrollView>

      
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F9FAFB", padding: 20 },
  card: {
    backgroundColor: "#FBF3E6",
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "black",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  section: { color: "#111827", fontSize: 17, fontWeight: "800", marginBottom: 12 },
input: {
  backgroundColor: "#FFFFFF",
  color: "#111827",
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#000000",
  marginTop: 8,
  marginBottom: 12,
},

  saveBtn: {
    backgroundColor: "#6c4ef6",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveText: { color: "#fff", fontWeight: "700" },
  tabs: { flexDirection: "row", gap: 12, marginBottom: 24 },
  tabBtn: {
  paddingVertical: 10,
  paddingHorizontal: 18,
  borderRadius: 999,
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#D1D5DB",
},
tabActive: {
  backgroundColor: "#EEF2FF",
  borderColor: "#6366F1",
},

  tabText: { color: "#374151", fontWeight: "700" },
  tabTextActive: { color: "#4338CA" },


  uploadBtn: {
  backgroundColor: "#1c1f26",
  borderWidth: 1,
  borderColor: "#2a2d35",
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: "center",
  marginBottom: 14,
},

uploadText: {
  color: "#fff",
  fontWeight: "700",
},


logo: {
  width: "100%",
  maxWidth: Math.min(140, width * 0.4),
  height: 70,
  resizeMode: "contain",
  marginTop: 6,
},

removeText: {
  color: "#ff6b6b",
  fontSize: 13,
  fontWeight: "600",
},

row: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginVertical: 10,
},

label: {
  color: "black",
  fontSize: 14,
  fontWeight: "600",
  marginTop: 16,
  marginBottom: 6,
},


helper: {
  color: "#000000",
  fontSize: 12,
  marginBottom: 12,
},

marginRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginVertical: 14,
},

unit: {
  color: "#000000",
  fontSize: 12,
},

btn: {
  width: 36,
  height: 36,
  backgroundColor: "#111827", // solid black
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
},

btnText: {
  color: "#fff",
  fontSize: 20,
  fontWeight: "700",
},

marginInput: {
  width: 60,
  height: 36,
  backgroundColor: "#FFFFFF",
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#000000",
  color: "#111827",
  textAlign: "center",
  marginHorizontal: 8,
},


toggle: {
  paddingVertical: 10,
  paddingHorizontal: 18,
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  marginRight: 10,
  borderWidth: 1,
  borderColor: "#000000",
},

active: {
  backgroundColor: "#6c4ef6",
},

toggleText: {
  color: "black",
  fontWeight: "600",
},

notificationBox: {
  backgroundColor: "white",
  padding: 16,
  borderColor: "black",
  borderRadius: 8,
  borderWidth: 1,
  marginBottom: 16,
},

presetBtn: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 10,
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#000000",
  marginRight: 8,
  marginTop: 8,
},

presetText: {
  color: "#111827",
  fontSize: 13,
  fontWeight: "700",
},

previewWrap: {
  marginBottom: 28,
},

previewTitle: {
  fontSize: 12,
  fontWeight: "900",
  color: "#C9A227",
  letterSpacing: 1.5,
  textAlign: "center",
  marginBottom: 10,
},



previewCard: {
  borderRadius: 16,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  backgroundColor: "#FFFFFF",

  
},




});