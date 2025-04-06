import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  writeBatch,
  doc,
  getDocs,
  getDoc,
  onSnapshot
} from "firebase/firestore";
import { format } from "date-fns";
import { MdBlock } from "react-icons/md";

// Componentes
import {
  MessageInput,
  MessageGroup,
  ReplyPreview,
  BlockedBanner,
  ImagePreview,
  BlockedMessageInput,
  CantSendMessage
} from "../components/messages";

export default function MessageHandler({ receiver, isBlocked }) {
  const { userData } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [receiverData, setReceiverData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const messagesEndRef = useRef(null);
  const isMountedRef = useRef(true);
  const navigate = useNavigate();
  const [hasBlockedMe, setHasBlockedMe] = useState(false);
  const [iHaveBlocked, setIHaveBlocked] = useState(false);
  const [showCantSendMessage, setShowCantSendMessage] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  // Verificar el estado de bloqueo
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!userData || !receiver) return;
      
      try {
        // Verificar si yo he bloqueado al receptor
        const myBlockDocRef = doc(db, "blockedUsers", `${userData.username}_${receiver}`);
        const myBlockDoc = await getDoc(myBlockDocRef);
        const blocked = myBlockDoc.exists();
        setIHaveBlocked(blocked);
        
        // Verificar si el receptor me ha bloqueado
        const theirBlockDocRef = doc(db, "blockedUsers", `${receiver}_${userData.username}`);
        const theirBlockDoc = await getDoc(theirBlockDocRef);
        setHasBlockedMe(theirBlockDoc.exists());
      } catch (error) {
        console.error("Error al verificar estado de bloqueo:", error);
      }
    };
    
    checkBlockStatus();
  }, [userData, receiver, isBlocked]);

  useEffect(() => {
    const getReceiverData = async () => {
      const q = query(collection(db, "users"), where("username", "==", receiver));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setReceiverData(snap.docs[0].data());
      }
    };
    getReceiverData();
  }, [receiver]);

  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!userData || !receiver || iHaveBlocked) return;

      try {
        const messagesRef = collection(db, "messages");
        const q = query(
          messagesRef,
          where("from", "==", receiver),
          where("to", "==", userData.username),
          where("read", "==", false)
        );

        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          
          snapshot.docs.forEach((docSnapshot) => {
            batch.update(doc(db, "messages", docSnapshot.id), { read: true });
          });
          
          await batch.commit();
          console.log(`Marcados ${snapshot.docs.length} mensajes como leídos al entrar al chat`);
        }
      } catch (error) {
        console.error("Error al marcar mensajes como leídos:", error);
      }
    };

    markMessagesAsRead();
  }, [userData, receiver, iHaveBlocked]);

  useEffect(() => {
    if (!userData) return;

    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("participants", "array-contains", userData.username),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const filtered = [];
      const unreadMessages = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        const isBetween =
          (data.from === userData.username && data.to === receiver) ||
          (data.from === receiver && data.to === userData.username);

        if (isBetween) {
          if (data.to === userData.username && !data.read && !iHaveBlocked) {
            unreadMessages.push(docSnap.id);
          }

          filtered.push({ ...data, id: docSnap.id });
        }
      }

      setMessages(filtered);
      
      // Marcar mensajes como leídos (en segundo plano), pero solo si no hay bloqueo
      if (unreadMessages.length > 0 && !iHaveBlocked) {
        const batch = writeBatch(db);
        
        unreadMessages.forEach((msgId) => {
          batch.update(doc(db, "messages", msgId), { read: true });
        });
        
        batch.commit().catch(err => console.error("Error al marcar mensajes como leídos:", err));
      }
      
      scrollToBottom();
    });

    return () => {
      unsub();
      isMountedRef.current = false;
    };
  }, [userData, receiver, iHaveBlocked]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Agrupar mensajes por fecha
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(msg => {
      if (!msg.timestamp?.toDate) return;
      
      const date = format(msg.timestamp.toDate(), 'PP'); // Formato: Apr 3, 2025
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(msg);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate();
  
  // Determinar si hay algún tipo de bloqueo
  const isAnyBlockActive = isBlocked || iHaveBlocked || hasBlockedMe;

  const handleCantSendMessage = () => {
    setShowCantSendMessage(true);
    setTimeout(() => setShowCantSendMessage(false), 3000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Notificación de bloqueo */}
      {isAnyBlockActive && (
        <BlockedBanner 
          iHaveBlocked={iHaveBlocked} 
          hasBlockedMe={hasBlockedMe} 
        />
      )}

      {/* Overlay de imagen previa */}
      {previewImage && (
        <ImagePreview 
          imageUrl={previewImage} 
          onClose={() => setPreviewImage(null)} 
        />
      )}

      {/* Mostrar mensaje de no poder enviar */}
      {showCantSendMessage && (
        <CantSendMessage />
      )}

      {/* Área de mensajes */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isAnyBlockActive ? 'opacity-75' : ''}`}>
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date} className="space-y-2">
            {/* Divisor de fecha */}
            <div className="flex items-center justify-center my-3">
              <div className="bg-gray-700 text-gray-300 text-xs font-medium px-3 py-1 rounded-full">
                {date}
              </div>
            </div>
            
            {/* Mensajes del día */}
            <MessageGroup 
              messages={msgs} 
              userData={userData} 
              receiverData={receiverData}
              onReplyClick={setReplyTo}
              onImageClick={setPreviewImage}
              isAnyBlockActive={isAnyBlockActive}
              navigate={navigate}
            />
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Área de respuesta */}
      {replyTo && !isAnyBlockActive && (
        <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} />
      )}

      {/* Formulario de entrada */}
      {isAnyBlockActive ? (
        <BlockedMessageInput 
          iHaveBlocked={iHaveBlocked} 
          hasBlockedMe={hasBlockedMe} 
        />
      ) : (
        <MessageInput 
          receiver={receiver} 
          userData={userData} 
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          onCantSendMessage={handleCantSendMessage}
          scrollToBottom={scrollToBottom}
        />
      )}
    </div>
  );
}