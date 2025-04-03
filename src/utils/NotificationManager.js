// utils/NotificationManager.js
// Servicio mejorado para manejar notificaciones con Service Worker

export const NotificationManager = {
    // Verificar si las notificaciones están soportadas
    isSupported() {
      return 'Notification' in window;
    },
  
    // Verificar si Service Workers están soportados
    isServiceWorkerSupported() {
      return 'serviceWorker' in navigator;
    },
  
    // Registrar el Service Worker
    async registerServiceWorker() {
      if (!this.isServiceWorkerSupported()) {
        console.warn('Service Workers no están soportados en este navegador');
        return null;
      }
  
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('Service Worker registrado con éxito:', registration);
        return registration;
      } catch (error) {
        console.error('Error al registrar Service Worker:', error);
        return null;
      }
    },
  
    // Solicitar permiso para notificaciones
    async requestPermission() {
      if (!this.isSupported()) {
        console.warn('Las notificaciones no están soportadas en este navegador');
        return false;
      }
  
      if (Notification.permission === 'granted') {
        return true;
      }
  
      try {
        if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          
          // Si el permiso fue concedido, intentar registrar el Service Worker
          if (permission === 'granted') {
            await this.registerServiceWorker();
          }
          
          return permission === 'granted';
        }
      } catch (error) {
        console.error("Error al solicitar permiso de notificación:", error);
      }
  
      return false;
    },
  
    // Mostrar una notificación
    async showNotification(title, options = {}) {
      if (!this.isSupported()) {
        console.warn('Las notificaciones no están soportadas en este navegador');
        return null;
      }
  
      try {
        // Si no tenemos permiso, intentar solicitarlo
        if (Notification.permission !== 'granted') {
          const granted = await this.requestPermission();
          if (!granted) {
            console.warn('Permiso de notificación denegado');
            return null;
          }
        }
  
        // Configuración predeterminada
        const defaultOptions = {
          icon: '/icon.png', // Reemplaza con tu icono
          badge: '/badge.png', // Opcional
          silent: false,
          requireInteraction: true
        };
  
        // Intentar mostrar la notificación a través del Service Worker si está disponible
        if (this.isServiceWorkerSupported() && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;
          
          return registration.showNotification(title, { 
            ...defaultOptions, 
            ...options 
          });
        }
        
        // Fallback a notificación regular si el Service Worker no está disponible
        const notification = new Notification(title, { ...defaultOptions, ...options });
  
        // Manejar eventos de la notificación
        notification.onclick = options.onClick || (() => {
          window.focus();
          notification.close();
        });
  
        notification.onerror = (event) => {
          console.error('Error al mostrar notificación:', event);
        };
  
        return notification;
      } catch (error) {
        console.error('Error al mostrar notificación:', error);
        return null;
      }
    },
  
    // Guardar preferencia del usuario en localStorage
    savePreference(enabled) {
      try {
        localStorage.setItem('notificationsEnabled', enabled ? 'true' : 'false');
      } catch (error) {
        console.error('Error al guardar preferencia de notificación:', error);
      }
    },
  
    // Verificar si el usuario ha activado las notificaciones
    isEnabled() {
      try {
        return localStorage.getItem('notificationsEnabled') === 'true';
      } catch (error) {
        console.error('Error al verificar preferencia de notificación:', error);
        return false;
      }
    },
  
    // Inicializar el sistema de notificaciones
    async initialize() {
      // Solo inicializar si el usuario ha activado las notificaciones
      if (this.isEnabled() && Notification.permission === 'granted') {
        try {
          // Registrar Service Worker
          await this.registerServiceWorker();
          
          // Escuchar mensajes del Service Worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Mensaje del Service Worker:', event.data);
            
            if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
              // Manejar clics en notificaciones
              console.log('Notificación clickeada con datos:', event.data.data);
            }
          });
          
          return true;
        } catch (error) {
          console.error('Error al inicializar sistema de notificaciones:', error);
          return false;
        }
      }
      
      return false;
    }
  };