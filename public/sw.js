// Service Worker para habilitar notificaciones en producción
const CACHE_NAME = 'mi-app-v1';

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  self.skipWaiting(); // Fuerza la activación inmediata
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker activado');
  
  // Reclama el control inmediatamente
  event.waitUntil(clients.claim());
});

// Gestión de notificaciones push (cuando implementes Push API)
self.addEventListener('push', event => {
  console.log('Push recibido:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    // Mostrar la notificación
    const options = {
      body: data.body || 'Tienes un nuevo mensaje',
      icon: data.icon || '/icon.png',
      badge: data.badge || '/badge.png',
      data: {
        url: data.url || '/',
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Notificación', options)
    );
  }
});

// Gestión de clic en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('Notificación clicada:', event);
  
  // Cerrar la notificación
  event.notification.close();
  
  // Abrir o enfocar una ventana existente
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data && event.notification.data.url ? 
        event.notification.data.url : '/';
      
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // De lo contrario, abrir una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Función auxiliar para enviar notificaciones desde cliente
self.notifyUser = async (data) => {
  try {
    await self.registration.showNotification(data.title || 'Notificación', {
      body: data.body || 'Tienes un nuevo mensaje',
      icon: data.icon || '/icon.png',
      badge: data.badge || '/badge.png',
      data: {
        url: data.url || '/'
      }
    });
    return true;
  } catch (error) {
    console.error('Error al mostrar notificación:', error);
    return false;
  }
};

// Escuchar mensajes del cliente
self.addEventListener('message', event => {
  console.log('Mensaje recibido en SW:', event.data);
  
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