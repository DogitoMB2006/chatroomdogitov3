import { useContext, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs
} from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function NotificationListener() {
  const { userData } = useContext(AuthContext);
  const { showToast } = useToast();
  const lastTimestampRef = useRef(Date.now()); // ⏱️ Marca cuando se montó

  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", userData.username),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const latest = snapshot.docChanges().filter(change => change.type === "added");

      for (const change of latest) {
        const msg = change.doc.data();

        // ❌ Ignorar mensajes anteriores al login
        if (
          !msg.timestamp ||
          msg.timestamp.toMillis() < lastTimestampRef.current
        ) continue;

        // ✅ Solo mostrar mensajes nuevos para mí
        if (msg.to === userData.username && msg.from !== userData.username) {
          const q = query(
            collection(db, "users"),
            where("username", "==", msg.from)
          );
          const snap = await getDocs(q);
          const sender = !snap.empty ? snap.docs[0].data() : null;

          showToast({
            username: msg.from,
            text: msg.text,
            photoURL: sender?.photoURL
          });
        }
      }
    });

    return () => unsub();
  }, [userData]);

  return null;
}
