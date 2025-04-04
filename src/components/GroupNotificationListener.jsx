import { useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import NotificationService from "../utils/NotificationService";

export default function GroupNotificationListener() {
  const { userData } = useContext(AuthContext);
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) return;

    const notifKey = "group_last_notif";
    const lastSeen = JSON.parse(localStorage.getItem(notifKey) || "{}");

    const unsubMessageListeners = new Map(); 

    const q = query(
      collection(db, "groups"),
      where("miembros", "array-contains", userData.username)
    );

    const unsubGroups = onSnapshot(q, (groupSnap) => {
      const currentGroupIds = new Set();

      groupSnap.forEach((groupDoc) => {
        const groupId = groupDoc.id;
        currentGroupIds.add(groupId);

        if (unsubMessageListeners.has(groupId)) return; 

        const group = groupDoc.data();
        const msgsRef = collection(db, "groupMessages", groupId, "messages");
        const msgQuery = query(msgsRef, orderBy("timestamp", "desc"));

        const unsub = onSnapshot(msgQuery, (msgSnap) => {
          const last = msgSnap.docs[0];
          if (!last) return;

          const data = last.data();
          const msgId = last.id;

          // Verificar si ya estamos en el chat de este grupo
          const isPageVisible = document.visibilityState === 'visible';
          const currentPath = location.pathname;
          const groupPath = `/chat/group/${groupId}`;
          
          // Si estamos en el chat de este grupo y la página está visible, actualizar el último mensaje visto pero no mostrar notificación
          if (currentPath === groupPath && isPageVisible) {
            lastSeen[groupId] = msgId;
            localStorage.setItem(notifKey, JSON.stringify(lastSeen));
            return;
          }

          const lastNotif = lastSeen[groupId];
          if (
            data.from !== userData.username &&
            (!lastNotif || lastNotif !== msgId)
          ) {
            // Siempre mostrar el toast interno de la app
            showToast({
              username: `${data.from} • ${group.name}`,
              text: data.text || "📷 Imagen",
              photoURL: data.photoURL || null,
              type: "group", // Indicar que es un chat de grupo
              chatId: groupId, // ID del grupo para la navegación
              from: data.from // Usuario que envio el mensaje
            });

            // Si el usuario ha habilitado notificaciones y la página no está enfocada o no estamos en el chat del grupo
            if (NotificationService.isEnabled() && (!isPageVisible || currentPath !== groupPath)) {
              const messageText = data.text || (data.image ? "📷 Imagen" : "");
              
              // Preparar datos para la notificación
              const notificationTitle = `${data.from} en ${group.name}`;
              const notificationOptions = {
                body: messageText,
                icon: data.photoURL || '/default-group.png',
                data: {
                  url: `/chat/group/${groupId}`,
                  messageId: msgId,
                  groupId: groupId
                },
                requireInteraction: false
              };
              
              // Usar Service Worker si está disponible
              if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                console.log('Enviando notificación de grupo a través del Service Worker');
                navigator.serviceWorker.controller.postMessage({
                  type: 'SEND_NOTIFICATION',
                  payload: {
                    title: notificationTitle,
                    ...notificationOptions
                  }
                });
              } else {
                // Fallback a la API de notificaciones directamente
                console.log('Service Worker no disponible, usando notificación directa');
                try {
                  new Notification(notificationTitle, {
                    body: messageText,
                    icon: data.photoURL || '/default-group.png'
                  });
                } catch (error) {
                  console.error("Error al mostrar notificación de grupo:", error);
                }
              }
            }

            lastSeen[groupId] = msgId;
            localStorage.setItem(notifKey, JSON.stringify(lastSeen));
          }
        });

        unsubMessageListeners.set(groupId, unsub);
      });
      
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
  }, [userData, showToast, location.pathname, navigate]); 

  return null;
}