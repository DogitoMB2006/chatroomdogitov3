import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MdCheck, 
  MdClose, 
  MdPersonAdd
} from "react-icons/md";
import { db } from "../firebase/config";
import {
  getDocs, query, collection, where, updateDoc, doc, deleteDoc
} from "firebase/firestore";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  const showToast = (toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000); // 5 segundos
  };

  const handleToastClick = (toast) => {
    // Si es una solicitud de amistad, no navegamos, se maneja con los botones
    if (toast.type === "friendRequest") return;
    
    // Eliminar el toast cuando se hace clic
    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    
    // Navegar al chat correspondiente
    if (toast.type === "group") {
      navigate(`/chat/group/${toast.chatId}`);
    } else {
      // Chat privado, navegar al chat con el usuario
      navigate(`/chat/${toast.from}`);
    }
  };

  const handleAcceptFriendRequest = async (toast) => {
    try {
      const ref = doc(db, "friendRequests", toast.requestId);

      // 1. Marcar como aceptado
      await updateDoc(ref, { status: "accepted" });

      // 2. Agregar a ambos en sus listas de amigos
      const usersRef = collection(db, "users");

      const q1 = query(usersRef, where("username", "==", toast.to));
      const q2 = query(usersRef, where("username", "==", toast.from));

      const [meSnap, senderSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);

      if (!meSnap.empty && !senderSnap.empty) {
        const meDoc = meSnap.docs[0];
        const senderDoc = senderSnap.docs[0];

        const meFriends = meDoc.data().friends || [];
        const senderFriends = senderDoc.data().friends || [];

        await updateDoc(doc(db, "users", meDoc.id), {
          friends: [...new Set([...meFriends, toast.from])]
        });

        await updateDoc(doc(db, "users", senderDoc.id), {
          friends: [...new Set([...senderFriends, toast.to])]
        });
      }

      // Eliminar la notificación
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      
      // Mostrar notificación de confirmación
      showToast({
        type: "info",
        text: `Solicitud de ${toast.from} aceptada`,
        username: "Sistema"
      });
    } catch (error) {
      console.error("Error al aceptar solicitud:", error);
    }
  };

  const handleRejectFriendRequest = async (toast) => {
    try {
      await deleteDoc(doc(db, "friendRequests", toast.requestId));
      
      // Eliminar la notificación
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      
      // Mostrar notificación de confirmación
      showToast({
        type: "info",
        text: `Solicitud de ${toast.from} rechazada`,
        username: "Sistema"
      });
    } catch (error) {
      console.error("Error al rechazar solicitud:", error);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-gray-800 border border-gray-700 shadow-lg rounded-lg overflow-hidden animate-fade-in-down ${
              t.type !== "friendRequest" ? "cursor-pointer hover:bg-gray-750" : ""
            }`}
            onClick={t.type !== "friendRequest" ? () => handleToastClick(t) : undefined}
          >
            {/* Contenido de la notificación */}
            <div className="p-3 flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                {t.photoURL ? (
                  <img src={t.photoURL} alt="pfp" className="w-full h-full object-cover" />
                ) : (
                  t.type === "friendRequest" ? (
                    <div className="w-full h-full flex items-center justify-center text-indigo-400 bg-indigo-900">
                      <MdPersonAdd size={20} />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">😶</div>
                  )
                )}
              </div>
              
              {/* Texto */}
              <div className="flex flex-col flex-1">
                <span className="font-semibold text-sm text-gray-200">{t.username}</span>
                <span className="text-xs text-gray-400">
                  {t.text || "📷 Imagen"}
                </span>
              </div>
            </div>
            
            {/* Botones para solicitudes de amistad */}
            {t.type === "friendRequest" && (
              <div className="flex border-t border-gray-700">
                <button
                  onClick={() => handleAcceptFriendRequest(t)}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1 transition-colors"
                >
                  <MdCheck size={16} />
                  <span className="text-xs">Aceptar</span>
                </button>
                <button
                  onClick={() => handleRejectFriendRequest(t)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 flex items-center justify-center gap-1 transition-colors"
                >
                  <MdClose size={16} />
                  <span className="text-xs">Rechazar</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}