// PeerConnection.jsx

export const loadPeerJS = () => {
  return new Promise((resolve, reject) => {
    if (window.Peer) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = "https://unpkg.com/peerjs@1.3.2/dist/peerjs.min.js";
    script.async = true;
    script.onload = () => {
      console.log("PeerJS cargado correctamente");
      resolve();
    };
    script.onerror = (err) => {
      console.error("Error al cargar PeerJS", err);
      reject(new Error("No se pudo cargar la biblioteca de videollamadas"));
    };
    document.body.appendChild(script);
  });
};

export const createPeer = (peerId) => {
  if (!window.Peer) {
    throw new Error("PeerJS no está cargado");
  }
  
  // Se utiliza el ID proporcionado para crear el peer, de modo que se registre con ese ID
  const peer = new window.Peer(peerId, {
    debug: 0,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });
  
  peer.on('open', (id) => {
    console.log('Peer conectado con ID:', id);
  });
  
  // Manejar desconexiones y reconexiones automáticas
  peer.on('disconnected', () => {
    console.log("Peer desconectado - intentando reconexión automática");
    setTimeout(() => {
      if (peer.destroyed) return;
      try {
        peer.reconnect();
      } catch (err) {
        console.error("Error al reconectar:", err);
      }
    }, 1000);
  });
  
  return peer;
};

export const generateUniqueId = (username) => {
  return `${username}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const callPeer = (peer, remotePeerId, stream) => {
  if (!peer || !remotePeerId || !stream) {
    throw new Error("Faltan parámetros para iniciar la llamada");
  }
  
  console.log("Llamando a:", remotePeerId);
  
  // Verificar que el stream tenga pistas de audio y vídeo activas
  const audioTracks = stream.getAudioTracks();
  const videoTracks = stream.getVideoTracks();
  
  console.log(`Estado del stream local: Audio pistas=${audioTracks.length}, Video pistas=${videoTracks.length}`);
  
  if (audioTracks.length > 0) {
    // Asegurarse de que las pistas de audio estén habilitadas
    audioTracks.forEach(track => track.enabled = true);
  }
  
  try {
    // Realizar la llamada utilizando el stream local
    const call = peer.call(remotePeerId, stream);
    return call;
  } catch (err) {
    console.error("Error al realizar la llamada:", err);
    throw err;
  }
};

export const setupOutgoingCall = (call, onStream, onError, onClose) => {
  if (!call) return;
  
  // Configurar el listener para recibir el stream remoto
  call.on('stream', (remoteStream) => {
    console.log("Stream recibido en llamada saliente");
    
    // Verificar el estado del stream remoto
    const audioTracks = remoteStream.getAudioTracks();
    const videoTracks = remoteStream.getVideoTracks();
    
    console.log(`Stream remoto recibido: Audio pistas=${audioTracks.length}, Video pistas=${videoTracks.length}`);
    
    if (audioTracks.length > 0) {
      console.log("Estado de pistas de audio remoto:");
      audioTracks.forEach((track, i) => {
        console.log(`- Audio ${i}: Habilitado=${track.enabled}, Estado=${track.readyState}`);
        // Asegurarse de que las pistas estén habilitadas
        track.enabled = true;
      });
    }
    
    if (onStream) onStream(remoteStream);
  });
  
  // Configurar el manejo de errores en la llamada
  call.on('error', (err) => {
    console.error("Error en la llamada saliente:", err);
    if (onError) onError(err);
  });
  
  call.on('close', () => {
    console.log("Llamada saliente cerrada");
    if (onClose) onClose();
  });
};

export const destroyPeer = (peer) => {
  if (peer) {
    try {
      peer.destroy();
      console.log("Peer destruido correctamente");
    } catch (err) {
      console.error("Error al destruir peer:", err);
    }
  }
};
