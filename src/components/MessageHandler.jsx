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
  const messagesContainerRef = useRef(null);
  const isMountedRef = useRef(true);
  const navigate = useNavigate();
  const [hasBlockedMe, setHasBlockedMe] = useState(false);
  const [iHaveBlocked, setIHaveBlocked] = useState(false);
  const [showCantSendMessage, setShowCantSendMessage] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [scrollBehavior, setScrollBehavior] = useState("smooth");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const prevMessagesLengthRef = useRef(0);

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

  // Detectar scroll y mostrar u ocultar botón para bajar
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
    
    // Resetear contador de mensajes nuevos si está al final
    if (atBottom && newMessagesCount > 0) {
      setNewMessagesCount(0);
    }
  };

  // Añadir event listener para el scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

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
      
      // Solo hacer scroll inicial cuando se cargan los mensajes por primera vez
      if (initialLoad && filtered.length > 0) {
        setTimeout(() => {
          scrollToBottom("auto");
          setInitialLoad(false);
        }, 300);
      } else if (filtered.length > prevMessagesLengthRef.current) {
        // Si hay mensajes nuevos
        const lastMsg = filtered[filtered.length - 1];
        const isMyMessage = lastMsg && lastMsg.from === userData.username;
        
        // Solo scroll automático si es mi mensaje o estoy al final
        if (isMyMessage || isAtBottom) {
          scrollToBottom();
        } else {
          // Si no, incrementar contador de mensajes nuevos
          setNewMessagesCount(prev => prev + 1);
        }
      }
      
      // Actualizar la referencia de la cantidad de mensajes
      prevMessagesLengthRef.current = filtered.length;
    });

    return () => {
      unsub();
      isMountedRef.current = false;
    };
  }, [userData, receiver, iHaveBlocked, isAtBottom, initialLoad]);

  const scrollToBottom = (behavior = scrollBehavior) => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior });
        setNewMessagesCount(0);
      }
    }, 100);
  };

  // Función para forzar scroll con animación suave
  const scrollToBottomSmooth = () => {
    setScrollBehavior('smooth');
    scrollToBottom('smooth');
    setTimeout(() => setScrollBehavior('auto'), 500);
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
      <div 
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto p-4 space-y-4 messages-container ${isAnyBlockActive ? 'opacity-75' : ''}`}
      >
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date} className="space-y-2">
            {/* Divisor de fecha */}
            <div className="message-day-divider">
              <span>{date}</span>
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

      {/* Botón para ir al final cuando hay mensajes no leídos */}
      {showScrollButton && (
        <button
          onClick={scrollToBottomSmooth}
          className="fixed bottom-20 right-4 bg-indigo-600 text-white rounded-full p-3 shadow-lg z-10 flex items-center justify-center"
          aria-label="Ir al final"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          {newMessagesCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {newMessagesCount}
            </span>
          )}
        </button>
      )}

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