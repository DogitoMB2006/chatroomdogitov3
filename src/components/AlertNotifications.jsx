import React, { useState, useEffect, useRef } from 'react';
import { MdNotifications, MdNotificationsOff, MdClose, MdInfo, MdImage } from 'react-icons/md';

export default function AlertNotifications() {
  const [show, setShow] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [notificationStatus, setNotificationStatus] = useState('default');

  // Posibles rutas para la imagen
  const imageSources = [
    '/assets/testing.jpg',
    '/testing.jpg',
    '/public/assets/testing.jpg',
    './assets/testing.jpg'
  ];

  // Verificar el estado inicial de las notificaciones
  useEffect(() => {
    // Verificar si las notificaciones están soportadas
    if (!('Notification' in window)) {
      console.warn('Las notificaciones no están soportadas en este navegador');
      return;
    }

    // Establecer el estado actual
    setNotificationStatus(Notification.permission);

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

    // Verificar si necesitamos registrar el service worker
    checkAndRegisterServiceWorker();

    // Mostrar la alerta con un retraso
    setTimeout(() => {
      setShow(true);
    }, 1500);
  }, []);

  // Función para registrar el Service Worker necesario para notificaciones en producción
  const checkAndRegisterServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        // Registrar el service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('Service Worker registrado con éxito:', registration);
        
        // Esperar a que el service worker esté activo
        if (registration.installing) {
          console.log('Service Worker instalando');
          
          registration.installing.addEventListener('statechange', e => {
            if (e.target.state === 'activated') {
              console.log('Service Worker ahora está activo');
            }
          });
        }
      } catch (error) {
        console.error('Error al registrar el Service Worker:', error);
      }
    } else {
      console.warn('Service Worker no soportado en este navegador');
    }
  };

  // Verificar si podemos cargar la imagen cuando se muestran las instrucciones
  useEffect(() => {
    if (!showInstructions) return;

    // Función para probar cada posible ruta de imagen
    const checkImage = async () => {
      for (const src of imageSources) {
        console.log(`Intentando cargar imagen desde: ${src}`);
        
        try {
          // Verificar si la imagen existe
          const response = await fetch(src);
          
          if (response.ok) {
            console.log(`Imagen encontrada en: ${src}`);
            setImageSrc(src);
            setImageLoaded(true);
            return; // Salir del bucle si encontramos una imagen válida
          } else {
            console.warn(`No se pudo cargar la imagen desde: ${src}`);
          }
        } catch (error) {
          console.warn(`Error al verificar la imagen en: ${src}`, error);
        }
      }
      
      // Si llegamos aquí, ninguna fuente funcionó
      console.error("No se pudo cargar la imagen desde ninguna fuente.");
    };

    checkImage();
  }, [showInstructions]);

  // Función segura para cerrar el modal
  const safelyCloseModal = () => {
    setAnimateOut(true);
    setShowInstructions(false);
    setTimeout(() => {
      setShow(false);
    }, 500);
  };

  // Función para verificar si el permiso fue otorgado
  const checkNotificationPermission = async () => {
    // Es posible que el estado haya cambiado, así que verificamos de nuevo
    const currentPermission = Notification.permission;
    setNotificationStatus(currentPermission);
    
    if (currentPermission === 'granted') {
      localStorage.setItem("notificacionesAceptadas", 'true');
      localStorage.setItem('notificationsEnabled', 'true');
      
      // Mostrar notificación de prueba después de un pequeño retraso
      setTimeout(() => {
        try {
          // Asegurarse de que el service worker esté activo antes de enviar notificación
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Enviar a través del service worker
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification('¡Notificaciones activadas!', {
                body: 'Recibirás notificaciones de mensajes nuevos.',
                icon: '/icon.png'
              });
            });
          } else {
            // Fallback a notificación directa (menos confiable en producción)
            new Notification('¡Notificaciones activadas!', {
              body: 'Recibirás notificaciones de mensajes nuevos.',
              icon: '/icon.png'
            });
          }
        } catch (e) {
          console.error("Error al mostrar notificación de prueba", e);
        }
      }, 1000);
      
      return true;
    }
    
    return false;
  };

  const handleEnable = async () => {
    // Si mostramos las instrucciones, ocultarlas primero
    if (showInstructions) {
      setShowInstructions(false);
      return;
    }

    // Asegurarse de que el service worker esté registrado
    await checkAndRegisterServiceWorker();

    // Intentar solicitar permiso
    try {
      console.log("Solicitando permiso de notificaciones...");
      
      // Forzar a que se muestre el prompt del navegador
      const permissionResult = await Notification.requestPermission();
      console.log("Resultado del permiso:", permissionResult);
      
      // Actualizar el estado
      setNotificationStatus(permissionResult);
      
      if (permissionResult === 'granted') {
        // El usuario concedió el permiso
        const success = await checkNotificationPermission();
        if (success) {
          // Cerrar modal después de un retraso para asegurar que se muestre la notificación
          setTimeout(() => {
            safelyCloseModal();
          }, 1500);
        }
      } else if (permissionResult === 'denied') {
        // El usuario negó el permiso
        localStorage.setItem("notificacionesAceptadas", 'rechazado');
        localStorage.setItem('notificationsEnabled', 'false');
        safelyCloseModal();
      } else {
        // El navegador bloqueó la solicitud o la dejó en estado default
        // Mostrar instrucciones
        setShowInstructions(true);
      }
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
                  Estado actual: {notificationStatus === 'granted' ? 'Permitido' : 
                                 notificationStatus === 'denied' ? 'Bloqueado' : 'No decidido'}
                </p>
                
                <p className="mt-2 text-gray-400 text-sm">
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
                
                {/* Imagen de instrucciones con fallback */}
                <div className="w-full mb-6 rounded-lg overflow-hidden border border-gray-600">
                  {imageLoaded ? (
                    <img 
                      src={imageSrc}
                      alt="Guía para activar notificaciones" 
                      className="w-full h-auto"
                      onError={() => {
                        console.error("Error al cargar la imagen");
                        setImageLoaded(false);
                      }}
                    />
                  ) : (
                    <div className="bg-gray-700 p-8 flex flex-col items-center justify-center">
                      <MdImage size={48} className="text-gray-500 mb-3" />
                      <p className="text-gray-400 text-sm">
                        Cargando imagen...
                        <br />
                        Si no aparece, sigue las instrucciones escritas debajo.
                      </p>
                    </div>
                  )}
                </div>
                
                <ol className="text-left text-gray-300 mb-6 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5">1</span>
                    <span>Haz clic en el icono de candado o información en la barra de direcciones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5">2</span>
                    <span>Busca la opción "Notificaciones" o "Permisos del sitio"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5">3</span>
                    <span>Cambia la configuración a "Permitir" para este sitio</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5">4</span>
                    <span>Recarga la página y vuelve a intentar activar las notificaciones</span>
                  </li>
                </ol>
                
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