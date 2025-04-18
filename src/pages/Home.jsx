import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdPlayArrow, MdInfo, MdUpdate, MdCode, MdPhone, MdDesktopWindows } from 'react-icons/md';

export default function Home() {
  const navigate = useNavigate();
  
  const [updates, setUpdates] = useState([
    {
      id: 2,
      version: "v1.2.1",
      date: "7 Abril, 2025",
      title: "Se ha mejorado el estilo de home.jsx",
      description: "ahora pueden habilitar las notificaciones!!!",
      features: [
        "tambien se han arreglado muchos bugs dentro de la aplicacion"
      ]
    },
    {
      id: 3,
      version: "v1.0.4",
      date: "3 Abril, 2025",
      title: "APLICACION PARA PC!!",
      description: "ahora pueden habilitar las notificaciones!!!",
      features: [
        "Dure probablemente el dia completo el dia de hoy, no tenia conocimiento de electron pero lo logre!",
        "Como conseguir la aplicacion? aqui, https://github.com/DogitoMB2006/dogito-chatroomeletrcon/releases/download/v1.1.4/Dogito-Chat-Setup-1.1.4.exe",
      ]
    },
    {
      id: 4,
      version: "v1.0.3",
      date: "3 Abril, 2025",
      title: "Que hay de nuevo?",
      description: "ahora pueden habilitar las notificaciones!!!",
      features: [
        "Asi es ahora puedes activar notificaciones",
        "no perderas ninguna notificacion de tus amigos ! o grupos!"
      ]
    },
    {
      id: 5,
      version: "v1.0.2",
      date: "3 Abril, 2025",
      title: "Que hay de nuevo?",
      description: "Se ha actualizado el UI completo, ahora es más bonito y rápido., además de que se han agregado nuevas funcionalidades",
      features: [
        "Todo es hermoso",
        "El ui de discord no sirve comparado a esto",
        "Me tomo 4 horas hacerlo",
        "Ahora puedes ver el chat de tus amigos",
        "se ha mejorado el estilo de los grupos tambien etc"
      ]
    },
    {
      id: 6,
      version: "v1.0.1",
      date: "3 Abril, 2025",
      title: "Nuevo sistema de notificaciones",
      description: "He agregado un sistema de notificaciones en tiempo real para mejorar la experiencia de comunicacion.",
      features: [
        "Notificaciones push",
        "Configuración personalizada de alertas",
        "Indicadores de mensajes no leídos",
        "He agregado GRUPOSS, ahora si grupos uwu"
      ]
    },
    {
      id: 7,
      version: "v1.0.0",
      date: "2 Marzo, 2025",
      title: "Mejoras de rendimiento",
      description: "Optimizaciones en el rendimiento general de la aplicación y corrección de errores. :D",
      features: [
        "Tiempo de carga reducido en un 30%",
        "Menor consumo de memoria",
        "Corrección de errores de interfaz"
      ]
    }
  ]);

  // Estilos compartidos para los contenedores de video
  const videoContainerStyles = `
    .video-container {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    
    .video-container video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background-color: #0f172a;
    }
    
    /* Cambio de estilo cuando está en pantalla completa */
    :fullscreen .video-container,
    :-webkit-full-screen .video-container,
    :-moz-full-screen .video-container,
    :-ms-fullscreen .video-container {
      width: 100vw !important;
      height: 100vh !important;
      aspect-ratio: unset;
    }
    
    :fullscreen video,
    :-webkit-full-screen video,
    :-moz-full-screen video,
    :-ms-fullscreen video {
      width: auto !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: 100% !important;
    }
  `;

  useEffect(() => {
    const animateUpdates = () => {
      const updateElements = document.querySelectorAll('.update-card');
      updateElements.forEach((element, index) => {
        setTimeout(() => {
          element.classList.add('animate-fade-in-down');
          element.style.opacity = '1';
        }, index * 150);
      });
    };

    animateUpdates();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-12">
          <div className="inline-block p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg mb-6">
            <MdUpdate className="text-white" size={36} />
          </div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 mb-4">
            DogiCord Updates
          </h1>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            Mantente informado sobre las últimas mejoras y características de nuestra plataforma.
          </p>
        </div>

        {/* Android Installation Tutorial Section */}
        <div className="mb-12 bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
          <div className="md:flex">
            <div className="md:shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 md:w-48 flex items-center justify-center p-6 md:p-0">
              <div className="text-center text-white">
                <MdPhone size={48} className="mx-auto mb-2" />
                <div className="text-xl font-bold">Android</div>
                <div className="text-sm opacity-80">Tutorial</div>
              </div>
            </div>
            <div className="p-6 w-full">
              <div className="font-bold text-xl mb-2 text-gray-100">Cómo instalar DogiCord en Android</div>
              <p className="text-gray-300 mb-4">
                Aprende a instalar nuestra aplicación en tu dispositivo Android usando el navegador Brave.
              </p>
              <div className="mt-4 w-full max-w-3xl mx-auto rounded-lg overflow-hidden shadow-lg bg-gray-900 video-container">
                <style jsx>{videoContainerStyles}</style>
                <video 
                  controls 
                  playsInline
                  preload="metadata"
                  poster="/android-tutorial-poster.jpg"
                  className="video-player"
                >
                  <source src="/forandroid.mp4" type="video/mp4" />
                  Tu navegador no soporta la reproducción de videos.
                </video>
              </div>
              <div className="mt-4 text-sm text-gray-300">
                <p>Sigue estos pasos para instalar DogiCord en tu dispositivo Android:</p>
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                  <li>Descarga e instala el navegador Brave desde Google Play Store</li>
                  <li>Abre DogiCord en Brave y navega a la configuración</li>
                  <li>Selecciona "Añadir a pantalla de inicio"</li>
                  <li>¡Disfruta de DogiCord como una aplicación nativa!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Tutorial Section */}
        <div className="mb-12 bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
          <div className="md:flex">
            <div className="md:shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 md:w-48 flex items-center justify-center p-6 md:p-0">
              <div className="text-center text-white">
                <MdInfo size={48} className="mx-auto mb-2" />
                <div className="text-xl font-bold">Notificaciones</div>
                <div className="text-sm opacity-80">Tutorial</div>
              </div>
            </div>
            <div className="p-6 w-full">
              <div className="font-bold text-xl mb-2 text-gray-100">Cómo habilitar notificaciones</div>
              <p className="text-gray-300 mb-4">
                Aprende a configurar las notificaciones para no perderte ningún mensaje importante.
              </p>
              <div className="mt-4 w-full max-w-3xl mx-auto rounded-lg overflow-hidden shadow-lg bg-gray-900 video-container">
                <style jsx>{videoContainerStyles}</style>
                <video 
                  controls 
                  playsInline
                  preload="metadata"
                  poster="/notification-tutorial-poster.jpg"
                  className="video-player"
                >
                  <source src="/enablenotis.mp4" type="video/mp4" />
                  Tu navegador no soporta la reproducción de videos.
                </video>
              </div>
              <div className="mt-4 text-sm text-gray-300">
                <p>Sigue estos pasos para habilitar las notificaciones:</p>
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                  <li>Abre DogiCord y ve a la configuración de tu perfil</li>
                  <li>Busca la sección "Notificaciones" en el menú</li>
                  <li>Activa las notificaciones según tus preferencias</li>
                  <li>Permite los permisos del navegador cuando te lo solicite</li>
                  <li>¡Listo! Ahora recibirás notificaciones en tiempo real</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop App Section */}
        <div className="mb-12 bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
          <div className="md:flex">
            <div className="md:shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 md:w-48 flex items-center justify-center p-6 md:p-0">
              <div className="text-center text-white">
                <MdDesktopWindows size={48} className="mx-auto mb-2" />
                <div className="text-xl font-bold">PC App</div>
                <div className="text-sm opacity-80">Descarga</div>
              </div>
            </div>
            <div className="p-6 w-full">
              <div className="font-bold text-xl mb-2 text-gray-100">Aplicación para PC</div>
              <p className="text-gray-300 mb-4">
                Descarga nuestra aplicación nativa para Windows y disfruta de DogiCord con notificaciones nativas y mejor rendimiento.
              </p>
              <div className="bg-gray-700 p-4 rounded-lg mt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <MdCode className="text-indigo-400" size={24} />
                  <span className="text-gray-200 font-medium">Enlaces de descarga</span>
                </div>
                <a 
                  href="https://github.com/DogitoMB2006/dogito-chatroomeletrcon/releases/download/v1.3.2/Dogito-Chat-Setup-1.3.2.exe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-2 bg-indigo-600 text-white py-3 px-4 rounded-lg text-center hover:bg-indigo-700 transition-colors"
                >
                  Descargar para Windows
                </a>
                <p className="text-xs text-gray-400 mt-2">
                  Versión actual: 1.2.1 - Actualizada el 6 de Abril, 2025
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-100 mb-6 flex items-center">
          <MdUpdate className="mr-2 text-indigo-400" size={24} />
          Historial de Actualizaciones
        </h2>

        <div className="space-y-6">
          {updates.map((update, index) => (
            <div 
              key={update.id} 
              className="update-card bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-300 opacity-0 hover:shadow-lg border border-gray-700"
            >
              <div className="md:flex">
                <div className="md:shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 md:w-48 flex items-center justify-center p-6 md:p-0">
                  <div className="text-center text-white">
                    <div className="text-xl font-bold">{update.version}</div>
                    <div className="text-sm opacity-80">{update.date}</div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="font-bold text-xl mb-2 text-gray-100">{update.title}</div>
                  <p className="text-gray-300 mb-4">{update.description}</p>
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-200 mb-2">Nuevas características:</h4>
                    <ul className="space-y-1">
                      {update.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-indigo-400 mr-2">•</span>
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button 
            onClick={() => navigate('/chat')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform transition hover:-translate-y-0.5 flex items-center justify-center mx-auto space-x-2"
          >
            <MdPlayArrow size={20} />
            <span>Entrar al Chat</span>
          </button>
          <p className="mt-4 text-sm text-gray-400">
            ¿Tienes sugerencias para mejorar? Háznoslo saber en el chat.
          </p>
        </div>
      </div>
    </div>
  );
}