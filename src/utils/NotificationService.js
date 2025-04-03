// utils/NotificationService.js - (Actualiza este archivo)
export const NotificationService = {
  isSupported() {
    return 'Notification' in window;
  },
  
  async requestPermission() {
    console.log("Solicitando permiso para notificaciones...");
    if (!this.isSupported()) {
      console.warn('Las notificaciones no están soportadas en este navegador');
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      
      console.log(`Permiso de notificación: ${permission}`);
      
      if (granted) {
        this.registerServiceWorker();
      }
      
      return granted;
    } catch (error) {
      console.error("Error solicitando permiso:", error);
      return false;
    }
  },
  
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker no soportado');
      return null;
    }
    
    try {
      console.log("Registrando Service Worker...");
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado correctamente:', registration);
      return registration;
    } catch (error) {
      console.error('Error al registrar Service Worker:', error);
      return null;
    }
  },
  
  async showNotification(title, options = {}) {
    console.log(`Intentando mostrar notificación: "${title}"`);
    
    if (!this.isSupported()) {
      console.warn('Notificaciones no soportadas');
      return null;
    }
    
    if (Notification.permission !== 'granted') {
      console.log('Permiso no concedido, solicitando...');
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Permiso denegado');
        return null;
      }
    }
    
    try {
      // Intentar con Service Worker primero
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          const registration = await navigator.serviceWorker.ready;
          console.log('Mostrando notificación via Service Worker');
          return registration.showNotification(title, options);
        } catch (swError) {
          console.warn('Error con Service Worker, usando fallback', swError);
        }
      }
      
      // Fallback a notificación estándar
      console.log('Mostrando notificación estándar');
      return new Notification(title, options);
    } catch (error) {
      console.error('Error mostrando notificación:', error);
      return null;
    }
  },
  
  savePreference(enabled) {
    localStorage.setItem('notificationsEnabled', enabled ? 'true' : 'false');
  },
  
  isEnabled() {
    return localStorage.getItem('notificationsEnabled') === 'true';
  },
  
  async initialize() {
    if (this.isEnabled() && Notification.permission === 'granted') {
      return this.registerServiceWorker();
    }
    return null;
  },
  
  // Método para pruebas directas
  async testNotification() {
    console.log("Ejecutando prueba de notificación");
    
    if (Notification.permission !== 'granted') {
      console.log("Solicitando permiso para test");
      await this.requestPermission();
    }
    
    if (Notification.permission === 'granted') {
      try {
        // Test simple con Notification API nativa
        console.log("Mostrando notificación de prueba simple");
        new Notification("Notificación de prueba", {
          body: "Esta es una notificación de prueba simple"
        });
        return true;
      } catch (error) {
        console.error("Error en prueba simple:", error);
        return false;
      }
    } else {
      console.warn("Permiso no concedido para test");
      return false;
    }
  }
};