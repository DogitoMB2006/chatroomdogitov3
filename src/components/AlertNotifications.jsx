import React, { useState, useEffect } from 'react';
import { MdNotifications, MdNotificationsOff, MdClose, MdInfo } from 'react-icons/md';

export default function AlertNotifications() {
  const [show, setShow] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Verificar si las notificaciones están soportadas
    if (!('Notification' in window)) {
      console.warn('Las notificaciones no están soportadas en este navegador');
      return;
    }

    // No mostrar si ya se ha tomado una decisión
    const notifKey = "notificacionesAceptadas";
    if (localStorage.getItem(notifKey)) {
      return;
    }

    // No mostrar si ya están concedidos los permisos
    if (Notification.permission === 'granted') {
      localStorage.setItem(notifKey, 'true');
      localStorage.setItem('notificationsEnabled', 'true');
      return;
    }

    // Mostrar la alerta
    setTimeout(() => {
      setShow(true);
    }, 1500);
  }, []);

  // Función segura para cerrar el modal
  const safelyCloseModal = () => {
    setAnimateOut(true);
    setShowInstructions(false);
    setTimeout(() => {
      setShow(false);
    }, 500);
  };

  const handleEnable = () => {
    // Si mostramos las instrucciones, ocultarlas primero
    if (showInstructions) {
      setShowInstructions(false);
      return;
    }

    // Intentar solicitar permiso
    try {
      // En algunos navegadores en entornos de desarrollo (como localhost),
      // esto puede ser bloqueado automáticamente
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          // El usuario concedió el permiso
          localStorage.setItem("notificacionesAceptadas", 'true');
          localStorage.setItem('notificationsEnabled', 'true');
          
          // Mostrar notificación de prueba
          try {
            new Notification('¡Notificaciones activadas!', {
              body: 'Recibirás notificaciones de mensajes nuevos.',
              icon: '/icon.png'
            });
          } catch (e) {
            console.error("Error al mostrar notificación de prueba", e);
          }
          
          // Cerrar modal
          safelyCloseModal();
        } else if (permission === 'denied') {
          // El usuario negó el permiso
          localStorage.setItem("notificacionesAceptadas", 'rechazado');
          localStorage.setItem('notificationsEnabled', 'false');
          safelyCloseModal();
        } else {
          // El navegador bloqueó la solicitud o la dejó en estado default
          // Mostrar instrucciones
          setShowInstructions(true);
        }
      }).catch(error => {
        console.error("Error al solicitar permiso:", error);
        setShowInstructions(true);
      });
    } catch (error) {
      console.error("Error al solicitar permiso:", error);
      setShowInstructions(true);
    }
  };

  const handleDisable = () => {
    setAnimateOut(true);
    localStorage.setItem("notificacionesAceptadas", 'rechazado');
    localStorage.setItem('notificationsEnabled', 'false');
    
    setTimeout(() => {
      setShow(false);
    }, 500);
  };

  // Si no se debe mostrar, no renderizar nada
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-opacity duration-300">
      <div 
        className={`bg-gray-800 border border-gray-700 rounded-lg max-w-md w-full mx-4 shadow-xl transform transition-all duration-500 ${
          animateOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <div className="relative p-6">
          <button 
            onClick={safelyCloseModal}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <MdClose size={24} />
          </button>
          
          <div className="flex flex-col items-center text-center">
            {!showInstructions ? (
              // Pantalla principal
              <>
                <div className="bg-indigo-900 p-4 rounded-full mb-4">
                  <MdNotifications className="text-indigo-300" size={36} />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">Activar notificaciones</h2>
                
                <p className="text-gray-300 mb-6">
                  Recibe notificaciones instantáneas cuando tengas nuevos mensajes, incluso cuando no estés usando la aplicación.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={handleEnable}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <MdNotifications size={20} />
                    <span>Activar</span>
                  </button>
                  
                  <button
                    onClick={handleDisable}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <MdNotificationsOff size={20} />
                    <span>No, gracias</span>
                  </button>
                </div>
                
                <p className="mt-4 text-gray-400 text-sm">
                  Puedes cambiar esta configuración más tarde en tu perfil.
                </p>
              </>
            ) : (
              // Pantalla de instrucciones si el navegador bloquea automáticamente
              <>
                <div className="bg-yellow-700 p-4 rounded-full mb-4">
                  <MdInfo className="text-yellow-300" size={36} />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">Se requiere permiso manual</h2>
                
                <p className="text-gray-300 mb-4">
                  Tu navegador ha bloqueado la solicitud automática de permisos. Sigue estos pasos para activar las notificaciones:
                </p>
                
                <ol className="text-left text-gray-300 mb-6 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5">1</span>
                    <span>Haz clic en el icono de bloqueo o información en la barra de direcciones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5">2</span>
                    <span>Busca la opción "Notificaciones" o "Permisos del sitio"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5">3</span>
                    <span>Cambia la configuración a "Permitir" para este sitio</span>
                  </li>
                </ol>
                
                <img 
                  src="/notification-help.png" 
                  alt="Ubicación del permiso de notificaciones" 
                  className="w-full max-w-sm rounded-lg border border-gray-600 mb-6"
                  onError={(e) => {e.target.style.display = 'none'}}
                />
                
                <button
                  onClick={safelyCloseModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Entendido
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}