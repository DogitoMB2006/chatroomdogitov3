import React, { useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Register from './components/Register';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import Home from './pages/Home';
import Chats from "./pages/Chats";
import PrivateChat from "./pages/PrivateChat";
import EditProfile from "./pages/EditProfile";
import NotificationListener from './components/NotificationListener';
import { ToastProvider } from "./context/ToastContext";
import GroupChatPage from "./pages/groupchatpage";
import GroupNotificationListener from "./components/GroupNotificationListener";
import FriendRequestListener from './components/FriendRequestListener';
import { AuthContext } from "./context/AuthContext";
import { updateOnlineStatus } from "./utils/onlineStatus";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase/config";

export default function App() {
  /* useEffect(() => {
    const notifKey = "notificacionesAceptadas";
  
    if (Notification.permission === "granted" || localStorage.getItem(notifKey)) {
      return;
    }
  
    if (Notification.permission !== "denied") {
      const aceptar = confirm("¿Quieres habilitar notificaciones de mensajes?");
      if (aceptar) {
        Notification.requestPermission().then((permiso) => {
          if (permiso === "granted") {
            localStorage.setItem(notifKey, "true");
          }
        });
      } else {
        localStorage.setItem(notifKey, "rechazado");
      }
    }
  }, []); */

  // Componente interno para manejar el estado online/offline
  const OnlineStatusManager = () => {
    const { user, userData } = useContext(AuthContext);

    useEffect(() => {
      if (!user) return;
      
      const userId = user.uid;
      const username = userData?.username || user.email?.split('@')[0];
      
      // Verificar y actualizar estado inicial
      const updateInitialStatus = async () => {
        try {
          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const lastSeen = userData.lastSeen?.toDate();
            
            // Si el usuario estaba marcado como online pero no ha estado activo recientemente
            if (userData.online === true && lastSeen && 
                (new Date() - lastSeen) > (2 * 60 * 1000)) {
              // Limpiar estado obsoleto
              await updateDoc(userRef, { online: false });
            }
          }
          
          // Establecer como online si la página está visible
          if (document.visibilityState === 'visible') {
            updateOnlineStatus(userId, username, true);
          }
        } catch (error) {
          console.error("Error updating initial status:", error);
        }
      };
      
      updateInitialStatus();
      
      // Verificar localStorage al cargar (para limpiar estado anterior si el navegador se cerró)
      const checkPreviousSession = () => {
        try {
          const closingData = localStorage.getItem('user_closing');
          if (closingData) {
            const { userId: prevUserId, timestamp } = JSON.parse(closingData);
            
            // Si es el mismo usuario y cerró recientemente
            if (prevUserId === userId && 
                (new Date().getTime() - timestamp) < (5 * 60 * 1000)) {
              // Limpiar estado
              updateOnlineStatus(userId, username, false);
            }
            
            // Limpiar flag
            localStorage.removeItem('user_closing');
          }
        } catch (e) {
          console.error("Error checking previous session:", e);
        }
      };
      
      checkPreviousSession();
      
      // Heartbeat para mantener estado actualizado (cada 30 segundos)
      const heartbeatInterval = setInterval(() => {
        if (document.visibilityState === 'visible' && user) {
          updateOnlineStatus(userId, username, true);
        }
      }, 30000);
      
      // Manejar cambios de visibilidad
      const handleVisibilityChange = () => {
        const isVisible = document.visibilityState === 'visible';
        updateOnlineStatus(userId, username, isVisible);
      };
      
      // Manejar online/offline del navegador
      const handleOnline = () => {
        if (document.visibilityState === 'visible') {
          updateOnlineStatus(userId, username, true);
        }
      };
      
      const handleOffline = () => {
        updateOnlineStatus(userId, username, false);
      };
      
      // Marcar como offline al cerrar la ventana/pestaña
      const handleBeforeUnload = () => {
        // Usar sendBeacon para envío confiable antes del cierre
        if (navigator.sendBeacon) {
          const data = new Blob([JSON.stringify({ 
            userId, 
            username, 
            status: false 
          })], { type: 'application/json' });
          navigator.sendBeacon('/api/update-offline', data);
        }
        
        // Como respaldo, guardar flag en localStorage
        try {
          localStorage.setItem('user_closing', JSON.stringify({
            userId,
            username,
            timestamp: new Date().getTime()
          }));
        } catch (e) {
          console.error("Error setting localStorage flag:", e);
        }
      };
      
      // Registrar event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('pagehide', handleBeforeUnload);
      
      // Función de limpieza
      return () => {
        clearInterval(heartbeatInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('pagehide', handleBeforeUnload);
        
        // Marcar como offline al desmontar el componente
        if (user) {
          updateOnlineStatus(userId, username, false);
        }
      };
    }, [user, userData]);

    return null; // Este componente no renderiza nada
  };

  return (
    <Router>
      <ToastProvider>
        <div>
          <Navbar />
          
          {/* Componente para gestionar estado online/offline */}
          <OnlineStatusManager />
          
          <NotificationListener />
          <GroupNotificationListener />
          <FriendRequestListener />
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat" element={<Chats />} />
            <Route path="/chat/:username" element={<PrivateChat />} />
            <Route path="/editprofile" element={<EditProfile />} />
            <Route path="/chat/group/:groupId" element={<GroupChatPage />} />
          </Routes>
          
        </div>
      </ToastProvider>
    </Router>
  );
}