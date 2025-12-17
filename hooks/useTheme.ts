import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";

export function useTheme() {
  const [color, setColor] = useState("#f5c16c");

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid, "preferences", "theme");

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setColor(snap.data().color);
    });

    return () => unsub();
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

  return { color, setColor: updateColor };
}
