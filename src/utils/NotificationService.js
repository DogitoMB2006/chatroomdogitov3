// Servicio de notificaciones

// Clase principal del servicio de notificaciones
const NotificationService = {
  // Verificar si las notificaciones están soportadas
  isSupported() {
    return 'Notification' in window;
  },
  
  // Verificar si las notificaciones están habilitadas (método original)
  areEnabled() {
    if (!this.isSupported()) {
      return false;
    }
    
    // Verificar permiso del navegador
    const permissionGranted = Notification.permission === 'granted';
    
    // Verificar preferencia del usuario
    const userPreference = localStorage.getItem('notificationsEnabled') === 'true';
    
    return permissionGranted && userPreference;
  },
  
  // Alias para compatibilidad con código existente
  isEnabled() {
    return this.areEnabled();
  },
  
  // Inicializar el servicio de notificaciones
  async initialize() {
    if (!this.isSupported()) {
      console.warn('Las notificaciones no están soportadas en este navegador');
      return false;
    }
    
    // Registrar el service worker
    await this.registerServiceWorker();
    
    // Verificar permisos
    if (Notification.permission !== 'granted') {
      console.warn('Los permisos de notificación no están concedidos');
      return false;
    }
    
    return true;
  },
  
  // Registrar el service worker si no está registrado
  async registerServiceWorker() {
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
  },
  
  // Enviar notificación
  async showNotification(title, options = {}) {
    if (!this.isEnabled()) {
      console.warn('Las notificaciones no están habilitadas');
      return false;
    }
    
    // Asegurarse de que el service worker esté registrado
    const swRegistration = await this.registerServiceWorker();
    
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
  }
};

// Exportación por defecto
export default NotificationService;

// También exportamos funciones individuales para compatibilidad
export const areNotificationsEnabled = () => NotificationService.areEnabled();
export const isNotificationsEnabled = () => NotificationService.isEnabled();
export const registerServiceWorker = () => NotificationService.registerServiceWorker();
export const sendNotification = (title, options) => NotificationService.showNotification(title, options);