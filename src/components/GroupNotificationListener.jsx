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

    console.log("GroupNotificationListener iniciado para:", userData.username);

    // Obtener los grupos del usuario
    const fetchGroups = async () => {
      try {
        const q = query(
          collection(db, "groups"),
          where("miembros", "array-contains", userData.username)
        );

        const snap = await getDocs(q);
        const groups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`El usuario es miembro de ${groups.length} grupos`);

        // Suscribirse a mensajes nuevos en cada grupo
        const unsubs = groups.map(group => {
          console.log(`Configurando listener para el grupo: ${group.name} (${group.id})`);
          
          const q = query(
            collection(db, "groupMessages", group.id, "messages"),
            where("from", "!=", userData.username),
            orderBy("from"),
            orderBy("timestamp", "desc"),
            limitToLast(5)
          );

          return onSnapshot(q, async (snapshot) => {
            // Procesar cambios
            const changes = snapshot.docChanges();
            console.log(`${changes.length} cambios en mensajes del grupo ${group.name}`);
            
            const latest = changes
              .filter(change => change.type === "added")
              .map(change => ({ id: change.doc.id, ...change.doc.data(), groupId: group.id, groupName: group.name }));

            for (const msg of latest) {
              // Verificar si ya se procesó
              if (processedMsgIds.has(msg.id)) {
                console.log(`Mensaje ${msg.id} ya procesado, omitiendo`);
                continue;
              }
              
              processedMsgIds.add(msg.id);
              
              // Verificar si el mensaje es reciente
              if (!msg.timestamp) {
                console.log(`Mensaje ${msg.id} sin timestamp, omitiendo`);
                continue;
              }
              
              const msgTime = msg.timestamp.toMillis ? msg.timestamp.toMillis() : msg.timestamp;
              if (msgTime < lastTimestampRef.current) {
                console.log(`Mensaje ${msg.id} anterior al inicio del listener, omitiendo`);
                continue;
              }

              console.log(`Procesando nuevo mensaje de ${msg.from} en grupo ${group.name}`);

              // Verificar si la página está activa o no
              const isPageVisible = document.visibilityState === 'visible';
              const currentPath = location.pathname;
              const groupPath = `/chat/group/${msg.groupId}`;
              
              // Si estamos en la página del grupo y la página está visible, no mostrar notificación
              const skipNotification = currentPath === groupPath && isPageVisible;
              
              if (skipNotification) {
                console.log(`Usuario ya está en ${groupPath} y la página está visible, omitiendo notificación`);
                continue;
              }

              // Obtener información del remitente
              try {
                const q = query(
                  collection(db, "users"),
                  where("username", "==", msg.from)
                );
                const snap = await getDocs(q);
                const sender = !snap.empty ? snap.docs[0].data() : null;

                // Mostrar toast dentro de la app siempre
                console.log(`Mostrando toast para mensaje de ${msg.from} en ${group.name}`);
                showToast({
                  username: msg.from,
                  text: msg.text || (msg.image ? "📷 Imagen" : ""),
                  photoURL: sender?.photoURL,
                  type: "group",
                  chatId: msg.groupId,
                  groupName: group.name
                });

                // Si el usuario ha habilitado notificaciones y la página no está enfocada o estamos en otra sección
                if (!isPageVisible || currentPath !== groupPath) {
                  if (Notification.permission === 'granted' && 
                      localStorage.getItem('notificationsEnabled') === 'true') {
                    
                    console.log('Enviando notificación del sistema para mensaje grupal');
                    
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
                      console.log('Enviando notificación a través del Service Worker');
                      navigator.serviceWorker.controller.postMessage({
                        type: 'SEND_NOTIFICATION',
                        payload: {
                          title: notificationTitle,
                          ...notificationOptions
                        }
                      });
                    } else {
                      // Fallback al método del servicio
                      console.log('Service Worker no disponible, usando fallback');
                      await NotificationService.showNotification(
                        notificationTitle,
                        notificationOptions
                      );
                    }
                  } else {
                    console.log('Notificaciones no están habilitadas o permitidas por el usuario');
                  }
                }
              } catch (error) {
                console.error("Error al procesar notificación de grupo:", error);
              }
            }
          }, error => {
            console.error(`Error en listener de grupo ${group.name}:`, error);
          });
        });

        return () => {
          console.log("Limpiando listeners de grupos");
          unsubs.forEach(unsub => unsub());
        };
      } catch (error) {
        console.error("Error al configurar listeners de grupo:", error);
      }
    };

    const cleanup = fetchGroups();
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [userData, showToast]); // Removimos location.pathname y navigate para evitar reconstruir listeners en navegación

  return null;
}