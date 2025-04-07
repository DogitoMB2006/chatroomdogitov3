// RoomManager.js - Gestión de salas en Firestore

/**
 * Crea un ID único para la sala basado en ambos usuarios
 * @param {string} user1 - Nombre del primer usuario
 * @param {string} user2 - Nombre del segundo usuario
 * @returns {string} - ID único para la sala
 */
export const createRoomId = (user1, user2) => {
  const sortedUsernames = [user1, user2].sort();
  return `call_${sortedUsernames[0]}_${sortedUsernames[1]}`;
};

/**
 * Crea o actualiza una sala en Firestore
 * @param {object} db - Instancia de Firestore
 * @param {string} roomId - ID de la sala
 * @param {string} username - Nombre del usuario que entra
 * @param {string} peerId - ID del peer
 * @returns {Promise} - Promesa que se resuelve cuando se actualiza la sala
 */
export const createOrUpdateRoom = async (db, roomId, username, peerId) => {
  const { doc, getDoc, setDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  
  try {
    const roomRef = doc(db, "rooms", roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (roomDoc.exists()) {
      // Actualizar sala existente
      const currentData = roomDoc.data();
      const participantsUpdate = [...new Set([...currentData.participants || [], username])];
      
      // Actualizar información del Peer
      const peersUpdate = {
        ...(currentData.peers || {})
      };
      peersUpdate[username] = peerId;
      
      await updateDoc(roomRef, {
        participants: participantsUpdate,
        peers: peersUpdate,
        lastUpdated: serverTimestamp(),
        active: true
      });
      
      console.log("Sala actualizada:", currentData);
      return roomDoc.data();
    } else {
      // Crear nueva sala
      const peers = {};
      peers[username] = peerId;
      
      await setDoc(roomRef, {
        participants: [username],
        peers: peers,
        created: serverTimestamp(),
        active: true
      });
      
      console.log("Nueva sala creada:", roomId);
      return {
        participants: [username],
        peers: peers,
        active: true
      };
    }
  } catch (err) {
    console.error("Error al configurar sala:", err);
    throw err;
  }
};

/**
 * Actualiza el ID de Peer en Firestore
 * @param {object} db - Instancia de Firestore
 * @param {string} roomId - ID de la sala
 * @param {string} username - Nombre del usuario
 * @param {string} newPeerId - Nuevo ID del peer
 * @returns {Promise}
 */
export const updatePeerId = async (db, roomId, username, newPeerId) => {
  const { doc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  
  try {
    if (!roomId) return;
    
    const roomRef = doc(db, "rooms", roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (roomDoc.exists()) {
      const data = roomDoc.data();
      const peersUpdate = {
        ...(data.peers || {})
      };
      peersUpdate[username] = newPeerId;
      
      await updateDoc(roomRef, {
        peers: peersUpdate,
        lastUpdated: serverTimestamp()
      });
      
      console.log("ID de Peer actualizado en Firestore");
    }
  } catch (err) {
    console.error("Error al actualizar ID de Peer:", err);
    throw err;
  }
};

/**
 * Monitorea los cambios en una sala
 * @param {object} db - Instancia de Firestore
 * @param {string} roomId - ID de la sala
 * @param {function} onUpdate - Callback para actualizaciones
 * @returns {function} - Función para detener la escucha
 */
export const monitorRoom = async (db, roomId, onUpdate) => {
  // Usar importación dinámica en lugar de require
  const { doc, onSnapshot } = await import('firebase/firestore');
  
  const roomRef = doc(db, "rooms", roomId);
  return onSnapshot(roomRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      console.log("Actualización de sala:", data);
      onUpdate(data);
    }
  });
};

/**
 * Actualiza una sala cuando un usuario abandona la llamada
 * @param {object} db - Instancia de Firestore
 * @param {string} roomId - ID de la sala
 * @param {string} username - Nombre del usuario que sale
 * @returns {Promise}
 */
export const leaveRoom = async (db, roomId, username) => {
  const { doc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  
  try {
    if (!roomId) return;
    
    const roomRef = doc(db, "rooms", roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (roomDoc.exists()) {
      const data = roomDoc.data();
      const updatedParticipants = (data.participants || []).filter(p => p !== username);
      
      // Actualizar peers
      const peersUpdate = { ...(data.peers || {}) };
      delete peersUpdate[username];
      
      if (updatedParticipants.length === 0) {
        // Si no quedan participantes, marcar como inactiva
        await updateDoc(roomRef, {
          active: false,
          peers: peersUpdate,
          endedAt: serverTimestamp()
        });
      } else {
        // Actualizar lista de participantes
        await updateDoc(roomRef, {
          participants: updatedParticipants,
          peers: peersUpdate,
          lastUpdated: serverTimestamp()
        });
      }
    }
  } catch (err) {
    console.error("Error al abandonar sala:", err);
    throw err;
  }
};