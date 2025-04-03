import { db } from "../firebase/config";
import { 
  doc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  collection,
  query,
  where,
  getDoc
} from "firebase/firestore";
import { useEffect } from "react";

// Función para actualizar el estado en línea del usuario
export const updateOnlineStatus = async (userId, username, status) => {
  if (!userId || !username) return;

  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      online: status,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating online status:", error);
  }
};

// Función para escuchar el estado en línea del usuario
export const listenToUserStatus = (username, callback) => {
  if (!username) return () => {};

  try {
    const q = query(collection(db, "users"), where("username", "==", username));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        
        // Verificar si el usuario está en línea
        const isOnline = userData.online;
        
        // Verificar última actividad (2 minutos como máximo tiempo inactivo)
        const lastSeen = userData.lastSeen?.toDate();
        const isRecentlyActive = lastSeen && 
          (new Date() - lastSeen) < (2 * 60 * 1000);
        
        // Solo considerar en línea si tanto el flag como la actividad reciente son válidos
        callback(isOnline && isRecentlyActive);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error listening to user status:", error);
    return () => {};
  }
};

// Hook para gestionar el estado en línea
export const useOnlineStatus = (user) => {
  useEffect(() => {
    if (!user) return;
    
    const username = user.displayName || user.email.split('@')[0];
    const userId = user.uid;
    
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
    
    // Heartbeat para mantener estado actualizado (cada 30 segundos)
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
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
    
    // Función de limpieza
    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      // Marcar como offline al desmontar el componente
      updateOnlineStatus(userId, username, false);
    };
  }, [user]);
};