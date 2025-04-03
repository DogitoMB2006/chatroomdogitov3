import { useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { NotificationService } from "../utils/NotificationService";

export default function NotificationListener() {
  const { userData } = useContext(AuthContext);
  const { showToast } = useToast();
  const lastTimestampRef = useRef(Date.now()); 
  const location = useLocation();
  const navigate = useNavigate();
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

        // Verificar si la página está activa o no
        const isPageVisible = document.visibilityState === 'visible';
        const currentPath = location.pathname;
        const senderPath = `/chat/${msg.from}`;
        
        // Si estamos en la página del chat con este usuario y la página está visible, no mostrar notificación
        if (currentPath === senderPath && isPageVisible) continue;

        // Obtener información del remitente
        const q = query(
          collection(db, "users"),
          where("username", "==", msg.from)
        );
        const snap = await getDocs(q);
        const sender = !snap.empty ? snap.docs[0].data() : null;

        // Mostrar toast dentro de la app siempre
        showToast({
          username: msg.from,
          text: msg.text || (msg.image ? "📷 Imagen" : ""),
          photoURL: sender?.photoURL,
          type: "private", 
          from: msg.from, 
        });

        // Si el usuario ha habilitado notificaciones y la página no está enfocada o estamos en otra sección, mostrar notificación del sistema
        if (NotificationService.isEnabled() && (!isPageVisible || currentPath !== senderPath)) {
          const messageText = msg.text || (msg.image ? "📷 Imagen" : "");
          NotificationService.showNotification(
            `Mensaje de ${msg.from}`,
            {
              body: messageText,
              icon: sender?.photoURL || '/default-avatar.png', // Reemplaza con tu icono por defecto
              onClick: function() {
                window.focus();
                navigate(`/chat/${msg.from}`);
                this.close();
              }
            }
          );
        }
      }
    });

    return () => unsub();
  }, [userData, location.pathname, processedMsgIds, navigate, showToast]); 

  return null;
}