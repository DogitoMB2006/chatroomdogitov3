// LocalVideo.jsx
import React from 'react';

const LocalVideo = ({ localVideoRef, username, localAudioMuted, toggleLocalAudio }) => {
  return (
    <div>
      <p className="text-sm mb-1">Tú</p>
      <div className="relative w-full h-48 rounded border border-gray-600 bg-gray-900">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover rounded"
        ></video>
        <div className="absolute bottom-2 right-2">
          <button
            onClick={toggleLocalAudio}
            className="bg-gray-800 bg-opacity-75 p-2 rounded-full"
            title={localAudioMuted ? "Activar micrófono" : "Silenciar micrófono"}
          >
            {localAudioMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocalVideo;