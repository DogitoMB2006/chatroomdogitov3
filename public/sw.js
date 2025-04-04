// Service Worker para habilitar notificaciones en producción
const CACHE_NAME = 'mi-app-v1';

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalado');
  self.skipWaiting(); // Fuerza la activación inmediata
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activado');
  
  // Reclama el control inmediatamente
  event.waitUntil(clients.claim());
});

// Gestión de notificaciones push (cuando implementes Push API)
self.addEventListener('push', event => {
  console.log('[Service Worker] Push recibido:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    // Mostrar la notificación
    const options = {
      body: data.body || 'Tienes un nuevo mensaje',
      icon: data.icon || '/icon.png',
      badge: data.badge || '/badge.png',
      data: {
        url: data.url || '/',
        messageId: data.messageId
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Notificación', options)
    );
  }
});

// Gestión de clic en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notificación clicada:', event);
  
  // Cerrar la notificación
  event.notification.close();
  
  // Obtener la URL de la notificación
  const urlToOpen = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : '/';
  
  // Abrir o enfocar una ventana existente
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    })
    .then(clientList => {
      // Verificar si ya hay una ventana abierta con esa URL
      for (const client of clientList) {
        // Si la URL coincide al final del pathname
        if (client.url.endsWith(urlToOpen) && 'focus' in client) {
          // Enfocar la ventana existente
          return client.focus();
        }
      }
      
      // Si no hay ventana, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Función para enviar notificaciones desde cliente
self.notifyUser = async (data) => {
  try {
    console.log('[Service Worker] Mostrando notificación:', data);
    
    await self.registration.showNotification(data.title || 'Notificación', {
      body: data.body || 'Tienes un nuevo mensaje',
      icon: data.icon || '/icon.png',
      badge: data.badge || '/badge.png',
      data: {
        url: data.url || '/',
        messageId: data.messageId
      },
      requireInteraction: data.requireInteraction || false
    });
    return true;
  } catch (error) {
    console.error('[Service Worker] Error al mostrar notificación:', error);
    return false;
  }
};

// Escuchar mensajes del cliente
self.addEventListener('message', event => {
  console.log('[Service Worker] Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SEND_NOTIFICATION') {
    self.notifyUser(event.data.payload)
      .then(success => {
        // Responder al cliente
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'NOTIFICATION_RESULT',
            success
          });
        }
      });
  }
});