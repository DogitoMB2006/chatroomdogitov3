// Service Worker para manejar notificaciones

// Evento de instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Instalado');
    self.skipWaiting();
  });
  
  // Evento de activación
  self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activado');
    return self.clients.claim();
  });
  
  // Escuchar notificaciones push del servidor
  self.addEventListener('push', (event) => {
    console.log('Service Worker: Notificación push recibida', event);
    
    if (!event.data) return;
    
    try {
      const data = event.data.json();
      
      const options = {
        body: data.body || 'Tienes un nuevo mensaje',
        icon: data.icon || '/icon.png',
        badge: data.badge || '/badge.png',
        data: data.data || {},
        requireInteraction: true,
        actions: data.actions || []
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'Nueva notificación', options)
      );
    } catch (error) {
      console.error('Error al procesar notificación push:', error);
      
      // Fallar de manera elegante si los datos no son JSON
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Nueva notificación', { 
          body: text || 'Tienes un nuevo mensaje'
        })
      );
    }
  });
  
  // Evento click en la notificación
  self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Click en notificación', event);
    
    event.notification.close();
    
    // Intentar abrir la ventana correcta o enfocar una existente
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Primero intentar enfocar una ventana existente
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data || {} });
              return client.focus();
            }
          }
          
          // Si no hay ventana existente, abrir una nueva
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  });
  
  // Evento de cierre de notificación
  self.addEventListener('notificationclose', (event) => {
    console.log('Service Worker: Notificación cerrada', event);
  });