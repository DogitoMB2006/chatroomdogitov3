// StatusIndicator.jsx
import React from 'react';

const StatusIndicator = ({ error, status, retryConnection, otherUsername }) => {
  return (
    <>
      {/* Mostrar errores */}
      {error && (
        <div className="bg-red-600 p-2 rounded mb-4 text-white">
          <p>{error}</p>
          <p className="text-sm mt-1">Puedes intentar recargar la página o revisar los permisos de la cámara.</p>
          <div className="flex mt-2 space-x-2">
            <button 
              onClick={() => window.location.reload()}
              className="bg-white text-red-600 px-3 py-1 rounded text-sm font-medium"
            >
              Recargar página
            </button>
            <button 
              onClick={retryConnection}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium"
            >
              Reintentar conexión
            </button>
          </div>
        </div>
      )}
      
      {/* Estado actual */}
      {!error && status !== "connected" && (
        <div className="bg-blue-900 p-2 rounded mb-4 flex items-center">
          <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>
            {status === "initializing" && "Inicializando..."}
            {status === "accessing_media" && "Accediendo a cámara y micrófono..."}
            {status === "creating_room" && "Preparando sala..."}
            {status === "waiting" && `Esperando a que ${otherUsername} se conecte...`}
            {status === "connecting" && "Estableciendo conexión..."}
          </span>
          {(status === "waiting" || status === "connecting") && (
            <button 
              onClick={retryConnection}
              className="ml-auto bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 text-xs rounded"
            >
              Reconectar
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default StatusIndicator;