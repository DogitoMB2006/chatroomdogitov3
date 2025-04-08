import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MdNotifications, MdNotificationsOff } from 'react-icons/md';

export default function GroupMute({ groupId, userId }) {
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkMuteStatus() {
      if (!groupId || !userId) return;
      
      try {
        setLoading(true);
        
        // Obtener las preferencias de notificación del usuario
        const userPrefsRef = doc(db, "userPreferences", userId);
        const userPrefsSnap = await getDoc(userPrefsRef);
        
        if (userPrefsSnap.exists() && userPrefsSnap.data().mutedGroups) {
          // Si existe la preferencia y tiene grupos silenciados
          const mutedGroups = userPrefsSnap.data().mutedGroups || [];
          setIsMuted(mutedGroups.includes(groupId));
        } else {
          // Por defecto, las notificaciones están activadas
          setIsMuted(false);
        }
      } catch (error) {
        console.error("Error al verificar estado de silencio:", error);
        setIsMuted(false);
      } finally {
        setLoading(false);
      }
    }
    
    checkMuteStatus();
  }, [groupId, userId]);

  const toggleMuteStatus = async () => {
    if (!groupId || !userId) return;
    
    try {
      setLoading(true);
      
      // Obtener preferencias actuales
      const userPrefsRef = doc(db, "userPreferences", userId);
      const userPrefsSnap = await getDoc(userPrefsRef);
      
      let mutedGroups = [];
      
      if (userPrefsSnap.exists() && userPrefsSnap.data().mutedGroups) {
        mutedGroups = [...userPrefsSnap.data().mutedGroups];
      }
      
      // Actualizar la lista de grupos silenciados
      if (isMuted) {
        // Quitar de la lista de silenciados
        mutedGroups = mutedGroups.filter(id => id !== groupId);
      } else {
        // Añadir a la lista de silenciados
        if (!mutedGroups.includes(groupId)) {
          mutedGroups.push(groupId);
        }
      }
      
      // Guardar cambios en Firestore
      if (userPrefsSnap.exists()) {
        await updateDoc(userPrefsRef, {
          mutedGroups: mutedGroups
        });
      } else {
        await setDoc(userPrefsRef, {
          mutedGroups: mutedGroups
        });
      }
      
      // Actualizar el estado local
      setIsMuted(!isMuted);
      
      // Guardar en localStorage para acceso rápido
      const localMutedGroups = JSON.parse(localStorage.getItem('mutedGroups') || '[]');
      if (!isMuted) {
        if (!localMutedGroups.includes(groupId)) {
          localMutedGroups.push(groupId);
        }
      } else {
        const index = localMutedGroups.indexOf(groupId);
        if (index > -1) {
          localMutedGroups.splice(index, 1);
        }
      }
      localStorage.setItem('mutedGroups', JSON.stringify(localMutedGroups));
      
    } catch (error) {
      console.error("Error al actualizar estado de silencio:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <button 
        className="p-2 text-gray-500 rounded-full opacity-50 cursor-wait"
        disabled
      >
        <MdNotifications size={22} />
      </button>
    );
  }

  return (
    <button
      onClick={toggleMuteStatus}
      className={`p-2 ${
        isMuted 
          ? "text-gray-500 hover:text-gray-300" 
          : "text-blue-400 hover:text-blue-300"
      } hover:bg-gray-800 rounded-full transition-colors duration-200`}
      title={isMuted ? "Activar notificaciones" : "Silenciar notificaciones"}
    >
      {isMuted ? <MdNotificationsOff size={22} /> : <MdNotifications size={22} />}
    </button>
  );
}