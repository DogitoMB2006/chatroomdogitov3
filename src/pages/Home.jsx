import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdPlayArrow, MdPause, MdFullscreen, MdVolumeUp, MdVolumeMute } from 'react-icons/md';

// Componente de reproductor de video personalizado
const VideoPlayer = ({ src, poster }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeout = useRef(null);

  // Maneja la reproducción/pausa
  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Maneja el cambio de progreso
  const handleProgress = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const progressValue = (video.currentTime / video.duration) * 100;
    setProgress(progressValue);
    setCurrentTime(video.currentTime);
  };

  // Formatea el tiempo en MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Maneja los eventos de carga de metadatos
  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
  };

  // Maneja el cambio de progreso manual
  const handleProgressChange = (e) => {
    const newTime = (e.target.value / 100) * duration;
    videoRef.current.currentTime = newTime;
    setProgress(e.target.value);
    setCurrentTime(newTime);
  };

  // Maneja el cambio de volumen
  const handleVolumeChange = (e) => {
    const newVolume = e.target.value / 100;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Alterna el mute
  const toggleMute = () => {
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    if (isMuted) {
      videoRef.current.volume = volume || 0.5;
    } else {
      setVolume(videoRef.current.volume);
    }
  };

  // Maneja el modo pantalla completa
  const toggleFullscreen = () => {
    const container = containerRef.current;
    
    if (!document.fullscreenElement && !document.mozFullScreenElement &&
        !document.webkitFullscreenElement && !document.msFullscreenElement) {
      // Entrar a pantalla completa
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Salir de pantalla completa
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Maneja la visibilidad de los controles
  const showControls = () => {
    setIsControlsVisible(true);
    
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000);
    }
  };

  // Escucha cambios en el fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement || 
        !!document.mozFullScreenElement ||
        !!document.webkitFullscreenElement || 
        !!document.msFullscreenElement
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-lg overflow-hidden shadow-lg ${isFullscreen ? 'w-screen h-screen' : 'w-full aspect-video'}`}
      onMouseMove={showControls}
      onMouseLeave={() => isPlaying && setIsControlsVisible(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        poster={poster}
        onClick={togglePlay}
        onTimeUpdate={handleProgress}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      >
        <source src={src} type="video/mp4" />
        Tu navegador no soporta la reproducción de videos.
      </video>

      {/* Overlay de reproducción central */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
          onClick={togglePlay}
        >
          <div className="bg-purple-600 bg-opacity-80 rounded-full p-4 shadow-lg transform transition-transform hover:scale-110">
            <MdPlayArrow className="text-white text-4xl" />
          </div>
        </div>
      )}

      {/* Controles inferiores */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity duration-300 ${isControlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Barra de progreso */}
        <div className="flex items-center mb-2">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleProgressChange}
            className="w-full h-1 bg-gray-300 rounded-full appearance-none cursor-pointer focus:outline-none"
            style={{
              background: `linear-gradient(to right, #9333ea ${progress}%, rgba(255,255,255,0.3) ${progress}%)`,
            }}
          />
        </div>

        {/* Botones y tiempo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={togglePlay}
              className="text-white hover:text-purple-400 focus:outline-none"
            >
              {isPlaying ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
            </button>

            <div className="flex items-center space-x-2">
              <button 
                onClick={toggleMute}
                className="text-white hover:text-purple-400 focus:outline-none"
              >
                {isMuted ? <MdVolumeMute size={24} /> : <MdVolumeUp size={24} />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume * 100}
                onChange={handleVolumeChange}
                className="w-16 md:w-24 h-1 bg-gray-300 rounded-full appearance-none cursor-pointer focus:outline-none hidden sm:block"
                style={{
                  background: `linear-gradient(to right, white ${isMuted ? 0 : volume * 100}%, rgba(255,255,255,0.3) ${isMuted ? 0 : volume * 100}%)`,
                }}
              />
            </div>

            <span className="text-white text-xs sm:text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button 
            onClick={toggleFullscreen}
            className="text-white hover:text-purple-400 focus:outline-none"
          >
            <MdFullscreen size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  
  const [updates, setUpdates] = useState([
    {
      id: 1,
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
      id: 2,
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
      id: 3,
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
      id: 4,
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
          DogiCord Updates
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Mantente informado sobre las últimas mejoras y características de nuestra plataforma.
          </p>
        </div>

        {/* Android Installation Tutorial Section */}
        <div className="mb-16 bg-white rounded-xl shadow-md overflow-hidden">
          <div className="md:flex">
            <div className="md:shrink-0 bg-gradient-to-r from-purple-500 to-indigo-600 md:w-48 flex items-center justify-center p-6 md:p-0">
              <div className="text-center text-white">
                <div className="text-xl font-bold">Android</div>
                <div className="text-sm opacity-80">Tutorial</div>
              </div>
            </div>
            <div className="p-6 w-full">
              <div className="font-bold text-xl mb-2 text-gray-800">Cómo instalar DogiCord en Android</div>
              <p className="text-gray-600 mb-4">
                Aprende a instalar la aplicación en tu dispositivo Android usando el navegador Brave, ojo tambien puede usanr chrome es lo mismo balsa de vagos.
              </p>
              <div className="mt-4 w-full max-w-3xl mx-auto">
                <VideoPlayer 
                  src="/public/forandroid.mp4" 
                  poster="/android-tutorial-poster.jpg" 
                />
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>Sigue estos pasos para instalar DogiCord en tu dispositivo Android:</p>
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                  <li>Descarga e instala el navegador Brave desde Google Play Store</li>
                  <li>Abre DogiCord en Brave y navega a la configuración</li>
                  <li>Selecciona "Añadir a pantalla de inicio"</li>
                  <li>Y wow! gran vaina!, que dificil!! </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-8">
          {updates.map((update, index) => (
            <div 
              key={update.id} 
              className="update-card bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 opacity-0 hover:shadow-lg"
            >
              <div className="md:flex">
                <div className="md:shrink-0 bg-gradient-to-r from-purple-500 to-indigo-600 md:w-48 flex items-center justify-center p-6 md:p-0">
                  <div className="text-center text-white">
                    <div className="text-xl font-bold">{update.version}</div>
                    <div className="text-sm opacity-80">{update.date}</div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="font-bold text-xl mb-2 text-gray-800">{update.title}</div>
                  <p className="text-gray-600 mb-4">{update.description}</p>
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Nuevas características:</h4>
                    <ul className="space-y-1">
                      {update.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-purple-500 mr-2">•</span>
                          <span className="text-gray-600 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>


        <div className="mt-16 text-center">
          <button 
            onClick={() => navigate('/chat')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform transition hover:-translate-y-0.5"
          >
            Entrar al Chat
          </button>
          <p className="mt-4 text-sm text-gray-500">
            ¿Tienes sugerencias para mejorar? Háznoslo saber en el chat.
          </p>
        </div>
      </div>
    </div>
  );
}