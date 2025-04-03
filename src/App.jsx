import React, { useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase/config";
import AlertNotifications from './components/AlertNotifications';

// Función global para actualizar el estado online (fuera del componente)
const updateOnlineStatus = async (userId, username, status) => {
  if (!userId || !username) return;

  console.log(`[GLOBAL] Actualizando estado a: ${status ? 'online' : 'offline'} para ${username}`);

  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      online: status,
      lastSeen: new Date() // Usar una fecha directa para mayor consistencia
    });
  } catch (error) {
    console.error("[GLOBAL] Error updating online status:", error);
  }
};

// Componente responsable únicamente del seguimiento de estado online
function OnlineStatusTracker() {
  const { user, userData } = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    const userId = user.uid;
    const username = userData?.username || user.email?.split('@')[0];
    
    // Log de montaje del componente para debugging
    console.log(`[OnlineTracker] Montado. Ruta: ${location.pathname}`);
    
    // Siempre establecer como online al montar (si la página está visible)
    if (document.visibilityState === 'visible') {
      console.log('[OnlineTracker] Estableciendo estado inicial: online');
      updateOnlineStatus(userId, username, true);
    }

    // Verificar localStorage (para limpiar estado anterior si el navegador se cerró)
    try {
      const closingData = localStorage.getItem('user_closing');
      if (closingData) {
        const { userId: prevUserId } = JSON.parse(closingData);
        if (prevUserId === userId) {
          console.log('[OnlineTracker] Encontrado indicador de cierre previo, actualizando estado online');
          updateOnlineStatus(userId, username, true); // Actualizar a online si se encuentra indicador
        }
        localStorage.removeItem('user_closing');
      }
    } catch (e) {
      console.error("[OnlineTracker] Error checking localStorage:", e);
    }
    
    // Actualización regular del estado online para evitar que caduque
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('[OnlineTracker] Heartbeat: actualizando estado online');
        updateOnlineStatus(userId, username, true);
      }
    }, 20000); // Cada 20 segundos
    
    // Manejar cambios de visibilidad de la página
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      console.log(`[OnlineTracker] Cambio de visibilidad: ${isVisible ? 'visible' : 'oculto'}`);
      updateOnlineStatus(userId, username, isVisible);
    };
    
    // Manejar estado online/offline del navegador
    const handleOnline = () => {
      console.log('[OnlineTracker] Navegador online');
      if (document.visibilityState === 'visible') {
        updateOnlineStatus(userId, username, true);
      }
    };
    
    const handleOffline = () => {
      console.log('[OnlineTracker] Navegador offline');
      updateOnlineStatus(userId, username, false);
    };
    
    // Manejar cierre de ventana/pestaña
    const handleBeforeUnload = () => {
      console.log('[OnlineTracker] beforeunload/pagehide detectado');
      
      // Usar localStorage como método principal (más confiable)
      try {
        localStorage.setItem('user_closing', JSON.stringify({
          userId,
          username,
          timestamp: new Date().getTime()
        }));
      } catch (e) {
        console.error("[OnlineTracker] Error setting localStorage:", e);
      }
      
      // Intentar usar sendBeacon como respaldo
      if (navigator.sendBeacon) {
        const data = new Blob([JSON.stringify({ 
          userId, 
          username, 
          status: false 
        })], { type: 'application/json' });
        navigator.sendBeacon('/api/update-offline', data);
      }
    };
    
    // Registrar todos los event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    
    // Cleanup function
    return () => {
      console.log('[OnlineTracker] Desmontando componente (NO debería ocurrir durante navegación normal)');
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      // NO establecer como offline al desmontar - solo queremos hacer eso
      // cuando el usuario realmente se desconecta, no durante la navegación
    };
  }, [user, userData]); // No incluir location.pathname para evitar re-ejecutar en cambios de ruta

  // Log cuando cambia la ruta para depuración
  useEffect(() => {
    if (user) {
      console.log(`[OnlineTracker] Cambio de ruta a: ${location.pathname}`);
      // NO actualizar el estado aquí - solo para logging
    }
  }, [location.pathname, user]);

  return null; // Este componente no renderiza nada
}

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <div>
          <Navbar />
          
          {/* Componente de alerta para notificaciones */}
          <AlertNotifications />
          
          {/* Sistema de seguimiento de estado online global */}
          <OnlineStatusTracker />
          
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