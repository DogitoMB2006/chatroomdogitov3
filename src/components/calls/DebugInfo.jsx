// DebugInfo.jsx
import React from 'react';

const DebugInfo = ({ 
  status, 
  roomId, 
  participants, 
  localAudioMuted, 
  remoteAudioMuted 
}) => {
  return (
    <details className="mt-2 text-xs text-gray-500">
      <summary>Información de depuración</summary>
      <ul className="mt-1 list-disc pl-5">
        <li>Estado: {status}</li>
        <li>Sala: {roomId || "No asignada"}</li>
        <li>Participantes: {participants.join(", ") || "Ninguno"}</li>
        <li>PeerJS: {window.Peer ? "Cargado" : "No cargado"}</li>
        <li>WebRTC: {typeof RTCPeerConnection !== 'undefined' ? "Soportado" : "No soportado"}</li>
        <li>Audio local: {localAudioMuted ? "Silenciado" : "Activado"}</li>
        <li>Audio remoto: {remoteAudioMuted ? "Silenciado" : "Activado"}</li>
      </ul>
    </details>
  );
};

export default DebugInfo;