import { useState, useEffect, useContext } from "react";
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { FaUserPlus, FaUserCheck, FaUserFriends, FaTimes } from "react-icons/fa";
import Staff from "./Staff";

export default function ViewProfile({ username, onClose }) {
  const { userData } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friendStatus, setFriendStatus] = useState("none"); // none, friends, pending, sending
  
  // Obtener datos del perfil
  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // No permitir ver el propio perfil
        if (username === userData.username) {
          setError("Este es tu propio perfil");
          setLoading(false);
          return;
        }

        // Buscar datos del usuario
        const q = query(
          collection(db, "users"),
          where("username", "==", username)
        );
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setError("Usuario no encontrado");
          setLoading(false);
          return;
        }
        
        setProfileData(snap.docs[0].data());
        
        // Verificar si ya son amigos
        if (userData.friends && userData.friends.includes(username)) {
          setFriendStatus("friends");
          setLoading(false);
          return;
        }
        
        // Verificar si hay una solicitud pendiente
        const requestQ = query(
          collection(db, "friendRequests"),
          where("from", "==", userData.username),
          where("to", "==", username),
          where("status", "==", "pending")
        );
        
        const requestSnap = await getDocs(requestQ);
        
        if (!requestSnap.empty) {
          setFriendStatus("pending");
        } else {
          setFriendStatus("none");
        }
      } catch (err) {
        console.error("Error al cargar perfil:", err);
        setError("Error al cargar el perfil");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [username, userData]);
  
  // Enviar solicitud de amistad
  const sendFriendRequest = async () => {
    setFriendStatus("sending");
    
    try {
      const requestData = {
        from: userData.username,
        to: username,
        status: "pending",
        timestamp: serverTimestamp()
      };
      
      // Solo añadimos photoURL si existe
      if (userData.photoURL) {
        requestData.photoURL = userData.photoURL;
      }
      
      await addDoc(collection(db, "friendRequests"), requestData);
      
      setFriendStatus("pending");
    } catch (err) {
      console.error("Error al enviar solicitud:", err);
      setError("Error al enviar la solicitud");
      setFriendStatus("none");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-full"
        >
          <FaTimes size={20} />
        </button>
        
        {loading ? (
          <div className="p-8 text-center text-gray-300">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4">Cargando perfil...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">
            <p>{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-200"
            >
              Cerrar
            </button>
          </div>
        ) : profileData && (
          <>
            {/* Encabezado con fondo gradiente */}
            <div className="h-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-lg"></div>
            
            {/* Contenido del perfil */}
            <div className="flex flex-col items-center px-6 pb-6 -mt-12">
              {/* Foto de perfil */}
              <div className="w-24 h-24 rounded-full border-4 border-gray-800 overflow-hidden bg-gray-700">
                {profileData.photoURL ? (
                  <img 
                    src={profileData.photoURL} 
                    alt={`${username} profile`} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">😶</div>
                )}
              </div>
              
              {/* Nombre de usuario con badge */}
              <div className="mt-3 flex items-center">
                <h2 className="text-xl font-semibold text-white">{username}</h2>
                <Staff username={username} />
              </div>
              
              {/* Información adicional */}
              <p className="text-gray-400 text-sm mt-2">
                Se unió en {profileData.joinDate ? new Date(profileData.joinDate.toDate()).toLocaleDateString() : "fecha desconocida"}
              </p>
              
              <div className="flex items-center mt-2 text-gray-400 text-sm">
                <FaUserFriends className="mr-1" />
                <span>{profileData.friends?.length || 0} amigos</span>
              </div>
              
              {/* Botón de acción según el estado */}
              <div className="mt-6 w-full">
                {friendStatus === "friends" ? (
                  <div className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md">
                    <FaUserCheck className="mr-2" />
                    Ya son amigos
                  </div>
                ) : friendStatus === "pending" ? (
                  <div className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md">
                    <FaUserPlus className="mr-2" />
                    Solicitud enviada
                  </div>
                ) : (
                  <button
                    onClick={sendFriendRequest}
                    disabled={friendStatus === "sending"}
                    className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {friendStatus === "sending" ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <FaUserPlus className="mr-2" />
                        Agregar como amigo
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}