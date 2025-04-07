// RemoteVideo.jsx
import React from 'react';

const RemoteVideo = ({ 
  remoteVideoRef, 
  username, 
  status, 
  remoteAudioMuted, 
  toggleRemoteAudio, 
  checkRemoteAudio 
}) => {
  return (
    <div>
      <p className="text-sm mb-1">{username}</p>
      <div className="relative w-full h-48 rounded border border-gray-600 bg-gray-900">
        {status === "connected" ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded"
            ></video>
            <div className="absolute bottom-2 right-2 flex space-x-2">
              <button
                onClick={toggleRemoteAudio}
                className="bg-gray-800 bg-opacity-75 p-2 rounded-full"
                title={remoteAudioMuted ? "Activar audio" : "Silenciar audio"}
              >
                {remoteAudioMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1V10a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1V10a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              <button
                onClick={checkRemoteAudio}
                className="bg-gray-800 bg-opacity-75 p-2 rounded-full"
                title="Verificar audio"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-gray-400">
              {status === "waiting" 
                ? `Esperando a que ${username} se conecte...`
                : "Preparando conexión..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RemoteVideo;