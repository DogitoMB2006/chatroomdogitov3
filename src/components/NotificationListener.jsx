import { useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  limitToLast
} from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function NotificationListener() {
  const { userData } = useContext(AuthContext);
  const { showToast } = useToast();
  const lastTimestampRef = useRef(Date.now()); 
  const location = useLocation();
  const [processedMsgIds] = useState(new Set()); 

  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, "messages"),
      where("to", "==", userData.username),
      where("read", "==", false),
      orderBy("timestamp", "desc"),
      limitToLast(10) 
    );

    const unsub = onSnapshot(q, async (snapshot) => {

      const latest = snapshot.docChanges().filter(change => change.type === "added");

      for (const change of latest) {
        const msgId = change.doc.id;
        const msg = change.doc.data();

        if (processedMsgIds.has(msgId)) continue;
        processedMsgIds.add(msgId);

        if (
          !msg.timestamp ||
          msg.timestamp.toMillis() < lastTimestampRef.current
        ) continue;

     
        const currentPath = location.pathname;
        const senderPath = `/chat/${msg.from}`;
        
        if (currentPath === senderPath) continue;

     
        const q = query(
          collection(db, "users"),
          where("username", "==", msg.from)
        );
        const snap = await getDocs(q);
        const sender = !snap.empty ? snap.docs[0].data() : null;

       
        showToast({
          username: msg.from,
          text: msg.text || (msg.image ? "📷 Imagen" : ""),
          photoURL: sender?.photoURL,
          type: "private", 
          from: msg.from, 
        });
      }
    });

    return () => unsub();
  }, [userData, location.pathname, processedMsgIds]); 

  return null;
}