// utils/NotificationService.js
export const NotificationService = {
    // Verificar si las notificaciones están soportadas
    isSupported() {
      return 'Notification' in window;
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
          icon: '/icon.png', // Reemplaza con tu icono o usa un valor por defecto
          badge: '/badge.png', // Opcional
          silent: false,
          requireInteraction: true // Mantener la notificación hasta que el usuario interactúe
        };
  
        // Crear y mostrar la notificación
        const notification = new Notification(title, { ...defaultOptions, ...options });
  
        // Manejar eventos de la notificación
        notification.onclick = options.onClick || (() => {
          window.focus();
          notification.close();
        });
  
        // Manejar errores
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
    }
  };