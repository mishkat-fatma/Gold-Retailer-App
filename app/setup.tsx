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
import { Dimensions } from "react-native";
import RateDisplay from "./index"; 
import { Modal } from "react-native";


const { width } = Dimensions.get("window");


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
  making: Record<
  MetalKey,
  {
    enabled: boolean;
    type: "percent" | "perGram";
    value: number;
  }
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

//  Normalize making (handles old Firestore data)
const normalizeMaking = (making: any) => {
  return {
    gold999: making?.gold999 ?? { enabled: false, type: "percent", value: 0 },
    gold916: making?.gold916 ?? { enabled: false, type: "percent", value: 0 },
    silver999: making?.silver999 ?? { enabled: false, type: "perGram", value: 0 },
    silver925: making?.silver925 ?? { enabled: false, type: "perGram", value: 0 },
  };
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

  margins: {
    gold999: 0,
    gold916: 0,
    silver999: 0,
    silver925: 0,
  },

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
  background: "#000000",
  text: "#FFFFFF",
  price: "#D4AF37",
  cardBorder: "#2a2d35",
},
    contact: {
    address: "",
    phones: [""],
    email: "",
  },


  frozen: false,
  frozenAt: null,

};


export default function Setup() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const COLOR_PRESETS = [
  {
    name: "Elegant Dark",
    background: "#0B0B0B",
    text: "#FFFFFF",
    price: "#D4AF37",
    cardBorder: "#2A2A2A",
  },
  {
    name: "Royal Blue",
    background: "#0A1A2F",
    text: "#EAF0FF",
    price: "#4DA3FF",
    cardBorder: "#1F3A5F",
  },
  {
    name: "Deep Purple",
    background: "#120018",
    text: "#F5E9FF",
    price: "#B388FF",
    cardBorder: "#3B145F",
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
    <>
    <ScrollView 
     style={styles.page} 
     contentContainerStyle={{ paddingBottom: 40 }}
    >
    
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
                          [key]: Math.max(0, config.margins[key] - MARGIN_STEP[key]),
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
                          [key]: config.margins[key] + MARGIN_STEP[key],
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

      {/* ================= MAKING (PER METAL) ================= */}
<View style={styles.card}>
  <Text style={styles.section}>Making Charges (Per Metal)</Text>

  {METALS.map((key) => {
  const item = config.making[key];

  return (
    <View key={key} style={{ marginBottom: 16 }}>

      {/* ✅ MAKING LABEL INPUT — MUST BE INSIDE RETURN */}
      <TextInput
        style={styles.input}
        placeholder="Making charge label (eg: Labour / Wastage)"
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
        <Text style={styles.label}>{config.labels[key]}</Text>
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
                item.type === "percent" && styles.active,
              ]}
              onPress={() =>
                setConfig({
                  ...config,
                  making: {
                    ...config.making,
                    [key]: { ...item, type: "percent" },
                  },
                })
              }
            >
              <Text style={styles.toggleText}>%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggle,
                item.type === "perGram" && styles.active,
              ]}
              onPress={() =>
                setConfig({
                  ...config,
                  making: {
                    ...config.making,
                    [key]: { ...item, type: "perGram" },
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
      {/* ================= RANDOM COLOR ================= */}
      <View style={styles.card}>
  <Text style={styles.section}>Display Colors</Text>

  <Text style={styles.label}>Background Color</Text>
  <TextInput
    style={styles.input}
    value={config.displayColors.background}
    onChangeText={(v) =>
      setConfig({
        ...config,
        displayColors: { ...config.displayColors, background: v },
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
        displayColors: { ...config.displayColors, text: v },
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
        displayColors: { ...config.displayColors, price: v },
      })
    }
  />

  <Text style={[styles.label, { marginTop: 12 }]}>Quick Presets</Text>

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

  <TouchableOpacity
    style={[styles.presetBtn, { borderColor: "#D4AF37" }]}
    onPress={applyRandomTheme}
  >
    <Text style={styles.presetText}>Random Theme</Text>
  </TouchableOpacity>
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


      {/* ================= PREVIEW ================= */}
      <TouchableOpacity
  style={[
    styles.saveBtn,
    { backgroundColor: "#1c1f26", marginBottom: 12 },
  ]}
  onPress={() => setPreviewOpen(true)}
>
  <Text style={styles.saveText}>Live Preview</Text>
</TouchableOpacity>

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

      {/* ================= MODAL ================= */}
      <Modal visible={previewOpen} animationType="slide">
        <RateDisplay previewConfig={config} />

        <TouchableOpacity
          style={[
           styles.saveBtn,
           { margin: 16, backgroundColor: "#e74c3c" },
          ]}
          onPress={() => setPreviewOpen(false)}
      >
          <Text style={styles.saveText}>Close Preview</Text>
        </TouchableOpacity>
      </Modal>
  </>
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
  width: "100%",
  maxWidth: Math.min(140, width * 0.4),
  height: 70,
  resizeMode: "contain",
  alignSelf: "flex-start",
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

presetBtn: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 10,
  backgroundColor: "#1c1f26",
  borderWidth: 1,
  borderColor: "#2a2d35",
  marginRight: 8,
  marginTop: 8,
},

presetText: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "600",
},


});