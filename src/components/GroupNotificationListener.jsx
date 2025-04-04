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
import NotificationService from "../utils/NotificationService";

export default function GroupNotificationListener() {
  const { userData } = useContext(AuthContext);
  const { showToast } = useToast();
  const lastTimestampRef = useRef(Date.now());
  const location = useLocation();
  const navigate = useNavigate();
  const [processedMsgIds] = useState(new Set());

  useEffect(() => {
    if (!userData) return;

    // Obtener los grupos del usuario
    const fetchGroups = async () => {
      const q = query(
        collection(db, "groups"),
        where("miembros", "array-contains", userData.username)
      );

      const snap = await getDocs(q);
      const groups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Suscribirse a mensajes nuevos en cada grupo
      const unsubs = groups.map(group => {
        const q = query(
          collection(db, "groupMessages", group.id, "messages"),
          where("from", "!=", userData.username),
          orderBy("from"),
          orderBy("timestamp", "desc"),
          limitToLast(5)
        );

        return onSnapshot(q, async (snapshot) => {
          const latest = snapshot.docChanges()
            .filter(change => change.type === "added")
            .map(change => ({ id: change.doc.id, ...change.doc.data(), groupId: group.id }));

          for (const msg of latest) {
            if (processedMsgIds.has(msg.id)) continue;
            processedMsgIds.add(msg.id);

            if (!msg.timestamp || msg.timestamp.toMillis() < lastTimestampRef.current) continue;

            // Verificar si la página está activa o no
            const isPageVisible = document.visibilityState === 'visible';
            const currentPath = location.pathname;
            const groupPath = `/chat/group/${msg.groupId}`;

            // Si estamos en la página del grupo y la página está visible, no mostrar notificación
            if (currentPath === groupPath && isPageVisible) continue;

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
              type: "group",
              chatId: msg.groupId,
              groupName: group.name
            });

            // Si el usuario ha habilitado notificaciones y la página no está enfocada o estamos en otra sección
            try {
              if ((!isPageVisible || currentPath !== groupPath)) {
                if (Notification.permission === 'granted' && 
                    localStorage.getItem('notificationsEnabled') === 'true') {
                  
                  console.log('Enviando notificación de grupo:', `Mensaje de ${msg.from} en ${group.name}`);
                  
                  // Crear datos para la notificación
                  const messageText = msg.text || (msg.image ? "📷 Imagen" : "");
                  const notificationTitle = `${msg.from} (Grupo: ${group.name})`;
                  const notificationOptions = {
                    body: messageText,
                    icon: sender?.photoURL || '/default-avatar.png',
                    data: {
                      url: `/chat/group/${msg.groupId}`,
                      messageId: msg.id,
                      groupId: msg.groupId
                    },
                    requireInteraction: false
                  };
                  
                  // Intentar mostrar notificación a través del Service Worker primero
                  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                      type: 'SEND_NOTIFICATION',
                      payload: {
                        title: notificationTitle,
                        ...notificationOptions
                      }
                    });
                  } else {
                    // Fallback al método del servicio
                    await NotificationService.showNotification(
                      notificationTitle,
                      notificationOptions
                    );
                  }
                }
              }
            } catch (error) {
              console.error("Error al enviar notificación:", error);
            }
          }
        });
      });

      return () => unsubs.forEach(unsub => unsub());
    };

    fetchGroups();
  }, [userData, location.pathname, processedMsgIds, navigate, showToast]);

  return null;
}