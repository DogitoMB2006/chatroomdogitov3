// MediaHandler.js - Manejo de streams multimedia

/**
 * Solicita acceso a cámara y micrófono
 * @param {boolean} video - Indica si se solicita acceso a la cámara
 * @returns {Promise<MediaStream>} - Stream multimedia
 */
export const requestMediaAccess = async (video = true) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    return stream;
  } catch (err) {
    console.error("Error al acceder a cámara/micrófono:", err);
    throw err;
  }
};

/**
 * Detiene todas las pistas de un stream
 * @param {MediaStream} stream - Stream a detener
 */
export const stopStream = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

/**
 * Alterna el estado de silencio del audio local
 * @param {MediaStream} stream - Stream local
 * @param {boolean} currentMuted - Estado actual del silencio
 * @returns {boolean} - Nuevo estado de silencio
 */
export const toggleLocalAudio = (stream, currentMuted) => {
  if (!stream) return currentMuted;
  
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length > 0) {
    const newMutedState = !currentMuted;
    audioTracks.forEach(track => {
      track.enabled = !newMutedState;
    });
    console.log("Audio local:", newMutedState ? "silenciado" : "activado");
    return newMutedState;
  }
  
  return currentMuted;
};

/**
 * Comprueba el estado del audio en un stream remoto
 * @param {HTMLVideoElement} videoElement - Elemento de video
 */
export const checkRemoteAudio = (videoElement) => {
  if (videoElement && videoElement.srcObject) {
    const audioTracks = videoElement.srcObject.getAudioTracks();
    console.log("Pistas de audio en stream remoto:", audioTracks);
    
    if (audioTracks.length > 0) {
      console.log("Estado de las pistas de audio:");
      audioTracks.forEach((track, i) => {
        console.log(`- Pista ${i}: Habilitada=${track.enabled}, Activa=${track.readyState}, ID=${track.id}`);
      });
    } else {
      console.log("No hay pistas de audio en el stream remoto");
    }
    
    console.log("Estado del elemento de video remoto:");
    console.log("- Silenciado:", videoElement.muted);
    console.log("- Volumen:", videoElement.volume);
    console.log("- Reproduciendo:", !videoElement.paused);
  } else {
    console.log("No hay stream remoto asignado al elemento de video");
  }
};

/**
 * Asigna un stream remoto a un elemento de video y gestiona la reproducción
 * @param {MediaStream} remoteStream - Stream remoto
 * @param {HTMLVideoElement} videoElement - Elemento de video
 * @returns {boolean} - Si el stream se asignó correctamente
 */
export const handleRemoteStream = (remoteStream, videoElement) => {
  if (!remoteStream || !videoElement) {
    return false;
  }
  
  // Asignar stream al elemento de video
  videoElement.srcObject = remoteStream;
  videoElement.volume = 1.0;
  videoElement.muted = false;
  
  // Reproducir automáticamente con método simplificado
  try {
    videoElement.play().catch(e => {
      // Si falla, intentar reproducir en silencio primero
      videoElement.muted = true;
      videoElement.play().then(() => {
        // Después de un segundo, activar el audio
        setTimeout(() => {
          videoElement.muted = false;
        }, 1000);
      });
    });
  } catch (err) {
    console.error("Error al reproducir stream remoto:", err);
  }
  
  return true;
};