// Servicio de notificaciones

// Verificar si las notificaciones están habilitadas
export const areNotificationsEnabled = () => {
  if (!('Notification' in window)) {
    return false;
  }
  
  // Verificar permiso del navegador
  const permissionGranted = Notification.permission === 'granted';
  
  // Verificar preferencia del usuario
  const userPreference = localStorage.getItem('notificationsEnabled') === 'true';
  
  return permissionGranted && userPreference;
};

// Registrar el service worker si no está registrado
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker no soportado');
    return null;
  }
  
  try {
    // Verificar si ya está registrado
    const existingRegistration = await navigator.serviceWorker.getRegistration();
    if (existingRegistration) {
      return existingRegistration;
    }
    
    // Registrar nuevo Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('Service Worker registrado:', registration);
    
    // Esperar a que esté activo
    if (registration.installing) {
      await new Promise(resolve => {
        registration.installing.addEventListener('statechange', e => {
          if (e.target.state === 'activated') {
            resolve();
          }
        });
      });
    }
    
    return registration;
  } catch (error) {
    console.error('Error al registrar Service Worker:', error);
    return null;
  }
};

// Enviar notificación usando el service worker
export const sendNotification = async (title, options = {}) => {
  if (!areNotificationsEnabled()) {
    console.warn('Las notificaciones no están habilitadas');
    return false;
  }
  
  // Asegurarse de que el service worker esté registrado
  const swRegistration = await registerServiceWorker();
  
  if (!swRegistration) {
    console.error('No se pudo obtener el registro del Service Worker');
    return false;
  }
  
  try {
    // Si el Service Worker está activo, usar ese método
    if (navigator.serviceWorker.controller) {
      // Enviar mensaje al service worker
      navigator.serviceWorker.controller.postMessage({
        type: 'SEND_NOTIFICATION',
        payload: {
          title,
          ...options
        }
      });
      
      return true;
    } else {
      // Fallback a notificación directa (menos confiable en producción)
      await swRegistration.showNotification(title, options);
      return true;
    }
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    
    // Intento alternativo
    try {
      new Notification(title, options);
      return true;
    } catch (fallbackError) {
      console.error('Error en fallback de notificación:', fallbackError);
      return false;
    }
  }
};

// Ejemplo de uso:
// import { sendNotification } from './notificationService';
// 
// sendNotification('Nuevo mensaje', {
//   body: 'Has recibido un mensaje de Juan',
//   icon: '/icon.png',
//   data: {
//     url: '/chat/123'
//   }
// });