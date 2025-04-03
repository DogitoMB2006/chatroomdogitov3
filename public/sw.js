// public/sw.js - (Crea este archivo en la carpeta public)
self.addEventListener('install', event => {
    self.skipWaiting();
    console.log('Service Worker instalado');
  });
  
  self.addEventListener('activate', event => {
    console.log('Service Worker activado');
    return self.clients.claim();
  });
  
  self.addEventListener('push', event => {
    const title = 'Nuevo mensaje';
    const options = {
      body: event.data ? event.data.text() : 'Tienes una nueva notificación',
      icon: '/icon.png'
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  });
  
  self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
      clients.openWindow('/')
    );
  });