// CallControls.jsx
import React from 'react';

const CallControls = ({ toggleLocalAudio, leaveCall, localAudioMuted, participants, myUsername, otherUsername }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex space-x-3">
        <button
          onClick={toggleLocalAudio}
          className={`${localAudioMuted ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 rounded flex items-center`}
        >
          {localAudioMuted ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              Micrófono silenciado
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Micrófono activado
            </>
          )}
        </button>
        
        <button
          onClick={leaveCall}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l4 4m0 0l-4 4m4-4H8.5M4 4v16" />
          </svg>
          Colgar
        </button>
      </div>
      
      <p className="text-sm text-gray-400 mt-2">
        {participants.length === 1 
          ? `Solo tú estás en la llamada. Esperando a ${otherUsername}.` 
          : participants.length === 2 
            ? "Ambos conectados a la sala" 
            : "Conectando..."}
      </p>
    </div>
  );
};

export default CallControls;