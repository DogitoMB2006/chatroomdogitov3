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
  
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
  
      return false;
    },
  
    // Mostrar una notificación
    async showNotification(title, options = {}) {
      if (!this.isSupported()) return;
  
      // Si no tenemos permiso, intentar solicitarlo
      if (Notification.permission !== 'granted') {
        const granted = await this.requestPermission();
        if (!granted) return;
      }
  
      try {
        // Configuración predeterminada
        const defaultOptions = {
          icon: '/icon.png', // Reemplaza con tu icono
          badge: '/badge.png', // Opcional, icono más pequeño para algunos sistemas
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
  
        return notification;
      } catch (error) {
        console.error('Error al mostrar notificación:', error);
        return null;
      }
    },
  
    // Guardar preferencia del usuario en localStorage
    savePreference(enabled) {
      localStorage.setItem('notificationsEnabled', enabled ? 'true' : 'false');
    },
  
    // Verificar si el usuario ha activado las notificaciones
    isEnabled() {
      return localStorage.getItem('notificationsEnabled') === 'true';
    }
  };