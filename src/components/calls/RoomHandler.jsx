// RoomHandler.jsx - Componente principal refactorizado
import { useRef, useState, useEffect } from "react";
import { db } from "../../firebase/config";

// Importar utilidades
import * as MediaHandler from './MediaHandler';
import * as PeerConnection from './PeerConnection';
import * as RoomManager from './RoomManager';

// Importar componentes
import VideoContainer from './VideoContainer';
import CallControls from './CallControls';
import StatusIndicator from './StatusIndicator';
import DebugInfo from './DebugInfo';

export default function RoomHandler({ otherUsername, myUsername, video = true, onClose }) {
  // Referencias
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const connectionRef = useRef(null);
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef(null);
  
  // Estado
  const [status, setStatus] = useState("initializing");
  const [error, setError] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [localAudioMuted, setLocalAudioMuted] = useState(false);
  const [remoteAudioMuted, setRemoteAudioMuted] = useState(false);

  // Efectos de limpieza
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Cancelar cualquier timeout pendiente
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Cerrar la conexión
      if (peerRef.current) {
        PeerConnection.destroyPeer(peerRef.current);
        peerRef.current = null;
      }
      
      // Detener streams
      if (localStreamRef.current) {
        MediaHandler.stopStream(localStreamRef.current);
        localStreamRef.current = null;
      }
    };
  }, []);

  // Cargar PeerJS y iniciar cámara/micrófono
  useEffect(() => {
    const init = async () => {
      try {
        // Cargar PeerJS
        await PeerConnection.loadPeerJS();
        
        if (!isMountedRef.current) return;
        
        // Solicitar acceso a cámara/micrófono
        setStatus("accessing_media");
        const stream = await MediaHandler.requestMediaAccess(video);
        
        if (!isMountedRef.current) {
          MediaHandler.stopStream(stream);
          return;
        }
        
        // Guardar referencia al stream local
        localStreamRef.current = stream;
        
        // Mostrar video local
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Iniciar sala
        initRoom(stream);
      } catch (err) {
        console.error("Error en la inicialización:", err);
        setError(err.message || "Error al inicializar");
      }
    };
    
    init();
  }, [video]);

  // Inicializar sala
  const initRoom = async (stream) => {
    try {
      setStatus("creating_room");
      
      // Crear ID único para la sala
      const consistentRoomId = RoomManager.createRoomId(myUsername, otherUsername);
      setRoomId(consistentRoomId);
      
      // ID único para este peer en esta llamada
      const myPeerId = PeerConnection.generateUniqueId(myUsername);
      
      // Crear o actualizar sala en Firestore
      await RoomManager.createOrUpdateRoom(db, consistentRoomId, myUsername, myPeerId);
      
      // Monitorear la sala - usando await porque ahora monitorRoom es una función async
      const unsubscribe = await RoomManager.monitorRoom(db, consistentRoomId, (data) => {
        if (!isMountedRef.current) return;
        
        setParticipants(data.participants || []);
        
        // Si ambos están en la sala, iniciar la conexión
        if (data.participants && 
            data.participants.includes(myUsername) && 
            data.participants.includes(otherUsername) &&
            data.peers && 
            data.peers[myUsername] && 
            data.peers[otherUsername]) {
          
          // Iniciar conexión con los IDs de PeerJS almacenados
          const otherPeerId = data.peers[otherUsername];
          console.log("ID del otro usuario:", otherPeerId);
          
          initPeerConnection(stream, myPeerId, otherPeerId);
        } else {
          setStatus("waiting");
        }
        
        // Si la sala se marca como inactiva
        if (data.active === false) {
          leaveCall();
        }
      });
      
      // Limpiar suscripción al desmontar
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } catch (err) {
      console.error("Error al configurar sala:", err);
      setError("Error al configurar la sala: " + err.message);
    }
  };

  // Iniciar conexión con el otro usuario
  const initPeerConnection = (stream, myPeerId, otherPeerId) => {
    try {
      if (peerRef.current) {
        // Ya tenemos una conexión
        return;
      }
      
      setStatus("connecting");
      
      // Determinar quién llama y quién recibe basado en orden alfabético
      const sortedUsernames = [myUsername, otherUsername].sort();
      const iAmCaller = sortedUsernames[0] === myUsername;
      
      console.log("¿Soy el llamador?", iAmCaller);
      
      // Crear instancia de Peer
      const peer = PeerConnection.createPeer(myPeerId);
      peerRef.current = peer;
      
      // Cuando se abre la conexión
      peer.on('open', (id) => {
        console.log('Mi conexión abierta con ID:', id);
        
        if (iAmCaller) {
          // Esperar un momento antes de llamar
          retryTimeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current || !peerRef.current) return;
            
            // Iniciar llamada
            const call = PeerConnection.callPeer(peer, otherPeerId, stream);
            connectionRef.current = call;
            
            // Configurar manejadores para la llamada
            PeerConnection.setupOutgoingCall(
              call,
              // onStream
              (remoteStream) => {
                handleRemoteStream(remoteStream);
                setStatus("connected");
              },
              // onError
              (err) => {
                console.error("Error en la llamada:", err);
                retryTimeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current && peerRef.current && localStreamRef.current) {
                    console.log("Reintentando llamada...");
                    const newCall = peerRef.current.call(otherPeerId, localStreamRef.current);
                    connectionRef.current = newCall;
                    PeerConnection.setupOutgoingCall(
                      newCall,
                      (rs) => {
                        handleRemoteStream(rs);
                        setStatus("connected");
                      },
                      () => {},
                      () => leaveCall()
                    );
                  }
                }, 2000);
              },
              // onClose
              () => leaveCall()
            );
          }, 1000);
        }
      });
      
      // Recibir llamadas entrantes
      peer.on('call', (call) => {
        console.log("Llamada entrante de:", call.peer);
        
        connectionRef.current = call;
        
        // Responder con nuestro stream
        call.answer(stream);
        console.log("Llamada respondida con el stream local");
        
        // Manejar stream remoto
        call.on('stream', (remoteStream) => {
          console.log("Stream remoto recibido en la llamada entrante");
          
          // Manejar el stream y actualizar el estado inmediatamente
          const result = handleRemoteStream(remoteStream);
          if (result) {
            setStatus("connected");
          }
        });
        
        call.on('error', (err) => {
          console.error("Error en la llamada entrante:", err);
        });
        
        call.on('close', () => {
          console.log("Llamada entrante cerrada");
          if (isMountedRef.current) {
            leaveCall();
          }
        });
      });
      
      // Manejar errores
      peer.on('error', handlePeerError(stream, myPeerId, otherPeerId));
      
    } catch (err) {
      console.error("Error al iniciar PeerJS:", err);
      setError("Error al iniciar la conexión: " + err.message);
    }
  };
  
  // Manejar errores de Peer
  const handlePeerError = (stream, myPeerId, otherPeerId) => (err) => {
    console.error("Error de PeerJS:", err);
    
    if (err.type === "unavailable-id") {
      // Si el ID ya está tomado, generar uno nuevo
      const newPeerId = PeerConnection.generateUniqueId(myUsername);
      console.log("Generando nuevo ID:", newPeerId);
      
      // Actualizar en Firestore
      RoomManager.updatePeerId(db, roomId, myUsername, newPeerId);
      
      // Reintentar con nuevo ID
      retryTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          initPeerConnection(stream, newPeerId, otherPeerId);
        }
      }, 1000);
    } else if (err.type === "peer-unavailable") {
      // El otro peer no está disponible, reintentar después
      console.log("Usuario no disponible, reintentando en 3 segundos...");
      
      retryTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current || !peerRef.current) return;
        
        // Verificar si hay un nuevo ID del otro usuario
        checkForUpdatedPeerId(otherPeerId);
      }, 3000);
    } else {
      setError("Error de conexión: " + err.type);
    }
  };

  // Verificar si hay un ID actualizado del otro usuario
  const checkForUpdatedPeerId = async (oldOtherPeerId) => {
    try {
      if (!roomId || !isMountedRef.current) return;
      
      const { doc, getDoc } = await import('firebase/firestore');
      
      // Obtener datos actualizados de la sala
      const roomRef = doc(db, "rooms", roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (roomDoc.exists() && isMountedRef.current) {
        const data = roomDoc.data();
        const otherPeerId = data.peers[otherUsername];
        
        // Si el ID cambió, intentar con el nuevo
        if (otherPeerId && otherPeerId !== oldOtherPeerId) {
          console.log("ID del otro usuario actualizado, reintentando:", otherPeerId);
          initPeerConnection(localStreamRef.current, 
                             PeerConnection.generateUniqueId(myUsername), 
                             otherPeerId);
        } else if (peerRef.current && localStreamRef.current) {
          // Reintentar con el mismo ID
          console.log("Reintentando llamada a:", oldOtherPeerId);
          const sortedUsernames = [myUsername, otherUsername].sort();
          if (sortedUsernames[0] === myUsername) {
            const call = peerRef.current.call(oldOtherPeerId, localStreamRef.current);
            connectionRef.current = call;
            
            PeerConnection.setupOutgoingCall(
              call,
              (rs) => {
                handleRemoteStream(rs);
                setStatus("connected");
              },
              () => {},
              () => leaveCall()
            );
          }
        }
      }
    } catch (err) {
      console.error("Error al verificar ID actualizado:", err);
    }
  };

  // Manejar stream remoto
  const handleRemoteStream = (remoteStream) => {
    if (!isMountedRef.current) return false;
    return MediaHandler.handleRemoteStream(remoteStream, remoteVideoRef.current);
  };
  
  // Reintentar conexión manualmente
  const retryConnection = async () => {
    try {
      setError(null);
      
      // Cancelar cualquier timeout pendiente
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Cerrar la conexión actual si existe
      if (peerRef.current) {
        PeerConnection.destroyPeer(peerRef.current);
        peerRef.current = null;
      }
      
      // Verificar el stream local
      if (!localStreamRef.current) {
        throw new Error("No hay acceso a cámara/micrófono");
      }
      
      // Generar un nuevo ID
      const myNewPeerId = PeerConnection.generateUniqueId(myUsername);
      
      // Actualizar en Firestore
      await RoomManager.updatePeerId(db, roomId, myUsername, myNewPeerId);
      
      // Obtener el ID del otro usuario
      const { doc, getDoc } = await import('firebase/firestore');
      const roomRef = doc(db, "rooms", roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (roomDoc.exists()) {
        const data = roomDoc.data();
        const otherPeerId = data.peers[otherUsername];
        
        if (otherPeerId) {
          // Reiniciar la conexión
          console.log("Reintentando conexión con nuevos IDs");
          initPeerConnection(localStreamRef.current, myNewPeerId, otherPeerId);
        } else {
          setError("No se puede encontrar el ID del otro usuario");
        }
      }
    } catch (err) {
      console.error("Error al reintentar conexión:", err);
      setError("Error al reintentar: " + err.message);
    }
  };

  // Abandonar la llamada
  const leaveCall = async () => {
    try {
      console.log("Abandonando llamada...");
      
      // Cancelar cualquier timeout pendiente
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Cerrar conexión
      if (peerRef.current) {
        PeerConnection.destroyPeer(peerRef.current);
        peerRef.current = null;
      }
      
      // Detener streams
      if (localStreamRef.current) {
        MediaHandler.stopStream(localStreamRef.current);
        localStreamRef.current = null;
      }
      
      // Actualizar sala
      await RoomManager.leaveRoom(db, roomId, myUsername);
      
      // Cerrar modal
      if (isMountedRef.current && onClose) {
        onClose();
      }
    } catch (err) {
      console.error("Error al abandonar llamada:", err);
      
      // Intentar cerrar de todas formas
      if (isMountedRef.current && onClose) {
        onClose();
      }
    }
  };
  
  // Alternar silencio del audio local
  const toggleLocalAudio = () => {
    const newMutedState = MediaHandler.toggleLocalAudio(localStreamRef.current, localAudioMuted);
    setLocalAudioMuted(newMutedState);
  };
  
  // Alternar silencio del audio remoto
  const toggleRemoteAudio = () => {
    if (remoteVideoRef.current) {
      const newMutedState = !remoteAudioMuted;
      remoteVideoRef.current.muted = newMutedState;
      setRemoteAudioMuted(newMutedState);
      console.log("Audio remoto:", newMutedState ? "silenciado" : "activado");
    }
  };

  // Verificar audio remoto
  const checkRemoteAudio = () => {
    MediaHandler.checkRemoteAudio(remoteVideoRef.current);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg text-white max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">
        {status === "connected" 
          ? `Llamada con ${otherUsername}`
          : `Conectando con ${otherUsername}`}
      </h2>
      
      <StatusIndicator 
        error={error} 
        status={status} 
        retryConnection={retryConnection} 
        otherUsername={otherUsername} 
      />
      
      <VideoContainer 
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        localStreamRef={localStreamRef}
        myUsername={myUsername}
        otherUsername={otherUsername}
        status={status}
        localAudioMuted={localAudioMuted}
        remoteAudioMuted={remoteAudioMuted}
        toggleLocalAudio={toggleLocalAudio}
        toggleRemoteAudio={toggleRemoteAudio}
        checkRemoteAudio={checkRemoteAudio}
      />

      <CallControls 
        toggleLocalAudio={toggleLocalAudio}
        leaveCall={leaveCall}
        localAudioMuted={localAudioMuted}
        participants={participants}
        myUsername={myUsername}
        otherUsername={otherUsername}
      />
      
      <DebugInfo 
        status={status}
        roomId={roomId}
        participants={participants}
        localAudioMuted={localAudioMuted}
        remoteAudioMuted={remoteAudioMuted}
      />
    </div>
  );
}