import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  
  // Array de updates para mostrar (ejemplo)
  const [updates, setUpdates] = useState([
    {
      id: 1,
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
      id: 2,
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
      id: 3,
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

  // Efecto para animación de entrada
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
        {/* Encabezado */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
          DogiCord Updates
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Mantente informado sobre las últimas mejoras y características de nuestra plataforma.
          </p>
        </div>

        {/* Lista de updates */}
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

        {/* Footer */}
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