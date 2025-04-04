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
            orderBy("timestamp", "desc"),
            limitToLast(10)
          );

          return onSnapshot(q, async (snapshot) => {
            const latest = snapshot.docChanges()
              .filter(change => change.type === "added")
              .map(change => ({ id: change.doc.id, ...change.doc.data(), groupId: group.id }));

            for (const msg of latest) {
              // Verificar si ya se procesó
              if (processedMsgIds.has(msg.id)) continue;
              processedMsgIds.add(msg.id);
              
              // Verificar si el mensaje es reciente
              if (!msg.timestamp) continue;
              const msgTime = msg.timestamp.toMillis ? msg.timestamp.toMillis() : msg.timestamp;
              if (msgTime < lastTimestampRef.current) continue;

              // Verificar si estamos en la página del grupo
              const currentPath = location.pathname;
              const groupPath = `/chat/group/${msg.groupId}`;
              const isInGroupChat = currentPath === groupPath;
              
              // Si estamos en la página del grupo, no mostrar notificación
              if (isInGroupChat) continue;

              // Obtener información del remitente
              try {
                const q = query(
                  collection(db, "users"),
                  where("username", "==", msg.from)
                );
                const snap = await getDocs(q);
                const sender = !snap.empty ? snap.docs[0].data() : null;

                // Mostrar toast dentro de la app
                showToast({
                  username: msg.from,
                  text: msg.text || (msg.image ? "📷 Imagen" : ""),
                  photoURL: sender?.photoURL,
                  type: "group",
                  chatId: msg.groupId,
                  groupName: group.name
                });

                // Notificación del navegador (básica)
                if (Notification.permission === 'granted') {
                  const messageText = msg.text || (msg.image ? "📷 Imagen" : "");
                  
                  try {
                    new Notification(`${msg.from} (Grupo: ${group.name})`, {
                      body: messageText,
                      icon: sender?.photoURL || '/default-avatar.png'
                    });
                  } catch (error) {
                    console.error("Error al mostrar notificación:", error);
                  }
                }
              } catch (error) {
                console.error("Error al procesar mensaje:", error);
              }
            }
          });
        });

        return () => unsubs.forEach(unsub => unsub());
      } catch (error) {
        console.error("Error al configurar listeners:", error);
      }
    };

    fetchGroups();
  }, [userData, showToast, location.pathname]); 

  return null;
}