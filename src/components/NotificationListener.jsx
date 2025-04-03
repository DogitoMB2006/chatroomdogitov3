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
  const lastTimestampRef = useRef(Date.now()); // ⏱️ Marca cuando se montó
  const location = useLocation();
  const [processedMsgIds] = useState(new Set()); // Para evitar mostrar notificaciones duplicadas

  useEffect(() => {
    if (!userData) return;

    // Consulta más específica: solo mensajes no leídos y dirigidos a mí
    const q = query(
      collection(db, "messages"),
      where("to", "==", userData.username),
      where("read", "==", false),
      orderBy("timestamp", "desc"),
      limitToLast(10) // Limitar para optimizar rendimiento
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      // Solo procesamos mensajes que se acaban de añadir
      const latest = snapshot.docChanges().filter(change => change.type === "added");

      for (const change of latest) {
        const msgId = change.doc.id;
        const msg = change.doc.data();

        // Verificar si ya procesamos este mensaje (evitar duplicados)
        if (processedMsgIds.has(msgId)) continue;
        processedMsgIds.add(msgId);

        // ❌ Ignorar mensajes anteriores al login
        if (
          !msg.timestamp ||
          msg.timestamp.toMillis() < lastTimestampRef.current
        ) continue;

        // Verificar si ya estamos en el chat con esta persona
        const currentPath = location.pathname;
        const senderPath = `/chat/${msg.from}`;
        
        // Si estamos en el chat con esta persona, no mostrar notificación
        if (currentPath === senderPath) continue;

        // Obtener datos del remitente para mostrar avatar
        const q = query(
          collection(db, "users"),
          where("username", "==", msg.from)
        );
        const snap = await getDocs(q);
        const sender = !snap.empty ? snap.docs[0].data() : null;

        // Mostrar la notificación toast
        showToast({
          username: msg.from,
          text: msg.text || (msg.image ? "📷 Imagen" : ""),
          photoURL: sender?.photoURL,
          type: "private", // Indicar que es un chat privado
          from: msg.from, // Nombre de usuario del remitente para la navegación
        });
      }
    });

    return () => unsub();
  }, [userData, location.pathname, processedMsgIds]); 

  return null;
}