import { useContext, useEffect } from "react";
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy
} from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function GroupNotificationListener() {
  const { userData } = useContext(AuthContext);
  const { showToast } = useToast();

  useEffect(() => {
    if (!userData) return;

    const notifKey = "group_last_notif";
    const lastSeen = JSON.parse(localStorage.getItem(notifKey) || "{}");

    const unsubMessageListeners = new Map(); // para evitar duplicados

    const q = query(
      collection(db, "groups"),
      where("miembros", "array-contains", userData.username)
    );

    const unsubGroups = onSnapshot(q, (groupSnap) => {
      const currentGroupIds = new Set();

      groupSnap.forEach((groupDoc) => {
        const groupId = groupDoc.id;
        currentGroupIds.add(groupId);

        if (unsubMessageListeners.has(groupId)) return; // ya estamos escuchando

        const group = groupDoc.data();
        const msgsRef = collection(db, "groupMessages", groupId, "messages");
        const msgQuery = query(msgsRef, orderBy("timestamp", "desc"));

        const unsub = onSnapshot(msgQuery, (msgSnap) => {
          const last = msgSnap.docs[0];
          if (!last) return;

          const data = last.data();
          const msgId = last.id;

          const lastNotif = lastSeen[groupId];
          if (
            data.from !== userData.username &&
            (!lastNotif || lastNotif !== msgId)
          ) {
            showToast({
              username: `${data.from} • ${group.name}`,
              text: data.text || "📷 Imagen",
              photoURL: data.photoURL || null
            });

            lastSeen[groupId] = msgId;
            localStorage.setItem(notifKey, JSON.stringify(lastSeen));
          }
        });

        unsubMessageListeners.set(groupId, unsub);
      });

      // 🔁 Eliminar listeners de grupos eliminados o abandonados
      unsubMessageListeners.forEach((unsub, id) => {
        if (!currentGroupIds.has(id)) {
          unsub();
          unsubMessageListeners.delete(id);
        }
      });
    });

    return () => {
      unsubGroups();
      unsubMessageListeners.forEach((unsub) => unsub());
    };
  }, [userData, showToast]);

  return null;
}
