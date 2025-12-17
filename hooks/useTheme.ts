import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";

export function useTheme() {
  const [color, setColor] = useState("#f5c16c");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = getAuth();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setReady(true);
        return;
      }

      const ref = doc(db, "users", user.uid, "preferences", "theme");

      const unsubSnap = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          setColor(snap.data().color);
        } else {
          setDoc(ref, { color: "#f5c16c" });
        }
        setReady(true);
      });

      return () => unsubSnap();
    });

    return () => unsubAuth();
  }, []);

  const updateColor = async (newColor: string) => {
    const user = getAuth().currentUser;
    if (!user) return;

    setColor(newColor);

    await setDoc(
      doc(db, "users", user.uid, "preferences", "theme"),
      { color: newColor },
      { merge: true }
    );
  };

  return { color, setColor: updateColor, ready };
}
