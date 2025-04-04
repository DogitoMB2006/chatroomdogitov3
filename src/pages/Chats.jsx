import { useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  deleteDoc,
  documentId,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import AddFriend from "../components/AddFriend";
import FriendRequests from "../components/FriendRequests";
import CreateGroupButton from "../components/CreateGroupButton";
import Staff from "../components/Staff";
import { MdSearch, MdPeopleAlt, MdGroups, MdNotifications } from "react-icons/md";
import { listenToUserStatus } from "../utils/onlineStatus";

export default function Chats() {
  const { user, userData } = useContext(AuthContext);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedTab, setSelectedTab] = useState("friends");
  const [searchTerm, setSearchTerm] = useState("");
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const navigationTimeoutRef = useRef(null);
  const clickedItemRef = useRef(null);
  
  // Referencia para evitar duplicación en las actualizaciones de contadores
  const processedMessagesRef = useRef(new Set());
  const unreadCountsTimerRef = useRef(null);

  // Optimización: Función de navegación mejorada con protección contra doble clic
  const handleNavigation = useCallback((path, id) => {
    // Si ya estamos navegando o hay un timeout activo, ignorar clics adicionales
    if (isNavigating) {
      return;
    }
    
    // Marcar que estamos en proceso de navegación
    setIsNavigating(true);
    
    // Proporcionar feedback visual
    if (clickedItemRef.current) {
      clickedItemRef.current.classList.remove('bg-indigo-700');
    }
    
    // Guardar referencia del elemento en el que se hizo clic
    clickedItemRef.current = document.getElementById(id);
    
    if (clickedItemRef.current) {
      clickedItemRef.current.classList.add('bg-indigo-700');
    }
    
    // Ejecutar la navegación con un pequeño retraso para la transición visual
    clearTimeout(navigationTimeoutRef.current);
    navigationTimeoutRef.current = setTimeout(() => {
      navigate(path);
      // Restablecer el estado después de la navegación
      setIsNavigating(false);
      // Limpiar el estilo después de la navegación
      if (clickedItemRef.current) {
        clickedItemRef.current.classList.remove('bg-indigo-700');
      }
    }, 50);
  }, [navigate, isNavigating]);

  // Limpieza del timeout al desmontar
  useEffect(() => {
    return () => {
      clearTimeout(navigationTimeoutRef.current);
      clearTimeout(unreadCountsTimerRef.current);
    };
  }, []);

  // Obtener amigos - Optimizado para usar caché y reducir consultas
  useEffect(() => {
    const fetchFriends = async () => {
      if (!userData?.friends || userData.friends.length === 0) {
        setFriends([]);
        setIsLoading(false);
        return;
      }

      try {
        // Usamos sessionStorage para cachear los datos de amigos
        const cachedFriendsData = sessionStorage.getItem('friends_data');
        const cachedTimestamp = sessionStorage.getItem('friends_timestamp');
        const now = Date.now();
        
        // Usamos caché si existe y tiene menos de 5 minutos
        if (cachedFriendsData && cachedTimestamp && (now - parseInt(cachedTimestamp) < 300000)) {
          setFriends(JSON.parse(cachedFriendsData));
        } else {
          // Si no hay caché o está desactualizada, hacemos la consulta
          const friendData = [];
          const batchSize = 10; // Procesar en lotes para evitar sobrecarga
          
          // Dividir amigos en lotes
          for (let i = 0; i < userData.friends.length; i += batchSize) {
            const batch = userData.friends.slice(i, i + batchSize);
            
            // Consulta optimizada con una sola consulta por lote usando 'in'
            const q = query(collection(db, "users"), where("username", "in", batch));
            const snapshot = await getDocs(q);
            
            snapshot.forEach(doc => {
              friendData.push(doc.data());
            });
          }
          
          setFriends(friendData);
          
          // Guardar en caché
          sessionStorage.setItem('friends_data', JSON.stringify(friendData));
          sessionStorage.setItem('friends_timestamp', now.toString());
        }
      } catch (error) {
        console.error("Error al obtener amigos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userData) {
      fetchFriends();
    }
  }, [userData]);

  // Listener optimizado para el estado en línea de amigos
  useEffect(() => {
    if (!userData?.friends || userData.friends.length === 0) return;

    // Limitar el número de listeners activos a la vez
    const activeUsernames = userData.friends.slice(0, 20); // Limitar a 20 amigos activos
    const unsubscribers = {};

    activeUsernames.forEach((friendUsername) => {
      const unsubscribe = listenToUserStatus(friendUsername, (isOnline) => {
        setOnlineStatuses(prev => ({
          ...prev,
          [friendUsername]: isOnline
        }));
      });

      unsubscribers[friendUsername] = unsubscribe;
    });

    return () => {
      Object.values(unsubscribers).forEach(unsub => unsub && unsub());
    };
  }, [userData?.friends]);

  // Obtener grupos - Optimizado
  useEffect(() => {
    if (!userData) return;

    // Usamos una consulta más eficiente con límite
    const q = query(
      collection(db, "groups"),
      where("miembros", "array-contains", userData.username),
      limit(20) // Limitar a 20 grupos para mejorar rendimiento
    );

    const unsub = onSnapshot(q, (snap) => {
      const results = [];
      snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
      setGroups(results);
    });

    return () => unsub();
  }, [userData]);
  
  // Obtener solicitudes de amistad pendientes - Optimizado
  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, "friendRequests"),
      where("to", "==", userData.username),
      where("status", "==", "pending"),
      orderBy("timestamp", "desc"),
      limit(10) // Limitar a 10 solicitudes recientes
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingFriendRequests(requests);
    });

    return () => unsub();
  }, [userData]);

  // MEJORA CLAVE: Un solo listener para obtener últimos mensajes y conteo no leído
  useEffect(() => {
    if (!userData) return;
    
    // Un solo listener para todos los mensajes del usuario
    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("participants", "array-contains", userData.username),
      orderBy("timestamp", "desc"),
      limit(50)  // Limitamos para optimizar pero aumentamos para capturar más conversaciones
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      // Usamos un objeto para agrupar por conversación
      const lastMessagesByPerson = {};
      const unreadCountsByPerson = {};
      
      // Procesar los mensajes
      snapshot.docs.forEach(docSnap => {
        const msg = docSnap.data();
        const otherPerson = msg.from === userData.username ? msg.to : msg.from;
        
        // Skip si es un mensaje de grupo
        if (!otherPerson) return;
        
        // Actualizar último mensaje de esta conversación
        if (!lastMessagesByPerson[otherPerson] || 
            (msg.timestamp && 
            (!lastMessagesByPerson[otherPerson].timestamp || 
            msg.timestamp.toDate() > lastMessagesByPerson[otherPerson].timestamp.toDate()))) {
          
          lastMessagesByPerson[otherPerson] = {
            text: msg.text || (msg.image ? "📷 Imagen" : ""),
            timestamp: msg.timestamp,
            from: msg.from,
            to: msg.to,
            unread: msg.to === userData.username && !msg.read
          };
        }
        
        // Contar mensajes no leídos
        if (msg.to === userData.username && !msg.read) {
          if (!unreadCountsByPerson[msg.from]) {
            unreadCountsByPerson[msg.from] = 0;
          }
          unreadCountsByPerson[msg.from]++;
        }
      });
      
      // Actualizar estado de última vista de un solo mensaje por conversación
      setLastMessages(prev => {
        // Combinar previo con nuevo, manteniendo otras entradas (como grupos)
        const newState = { ...prev };
        
        // Actualizar o añadir nuevas entradas
        Object.entries(lastMessagesByPerson).forEach(([person, msgData]) => {
          newState[person] = msgData;
        });
        
        return newState;
      });
      
      // Actualizar contador de no leídos
      setUnreadCounts(unreadCountsByPerson);
    });
    
    return () => unsub();
  }, [userData]);

  // Listener optimizado para mensajes de grupo
  useEffect(() => {
    if (!userData || groups.length === 0) return;
    
    const unsubscribers = [];
    
    // Limitar a 10 grupos activos para reducir consultas pero aumentar para mejor experiencia
    const activeGroups = groups.slice(0, 10);
    
    activeGroups.forEach(group => {
      const msgsRef = collection(db, "groupMessages", group.id, "messages");
      const groupLastMsgQuery = query(msgsRef, orderBy("timestamp", "desc"), limit(1));
      
      const unsubGroupLastMsg = onSnapshot(groupLastMsgQuery, (snapshot) => {
        if (!snapshot.empty) {
          const msgData = snapshot.docs[0].data();
          
          setLastMessages(prevState => ({
            ...prevState,
            [`group_${group.id}`]: {
              text: msgData.text || (msgData.image ? "📷 Imagen" : ""),
              timestamp: msgData.timestamp,
              from: msgData.from,
              unread: msgData.from !== userData.username
            }
          }));
        }
      });
      
      unsubscribers.push(unsubGroupLastMsg);
    });
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [userData, groups]);

  // Filtrar chats por búsqueda - Memoizado para evitar cálculos innecesarios
  const filteredFriends = useMemo(() => {
    return friends.filter(friend => 
      friend.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [friends, searchTerm]);
  
  const filteredGroups = useMemo(() => {
    return groups.filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  // Formatear tiempo relativo
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "";
    
    const now = new Date();
    const messageDate = timestamp.toDate();
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) return "ahora";
    else if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
    else if (diffInHours < 24 && messageDate.getDate() === now.getDate()) {
      return messageDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    else if (diffInDays === 1) return "ayer";
    else if (diffInDays < 7) {
      const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
      return days[messageDate.getDay()];
    }
    else {
      return messageDate.toLocaleDateString([], { day: 'numeric', month: 'numeric' });
    }
  };

  // Verificar si un amigo está en línea
  const isOnline = (username) => {
    return onlineStatuses[username] || false;
  };

  // Manejar aceptación de solicitud de amistad - Optimizado
  const handleAcceptFriendRequest = async (req) => {
    try {
      const requestRef = doc(db, "friendRequests", req.id);
      await updateDoc(requestRef, { status: "accepted" });

      // Obtener referencias directas en lugar de consultas
      const userRef = collection(db, "users");
      const q1 = query(userRef, where("username", "==", userData.username));
      const q2 = query(userRef, where("username", "==", req.from));

      const [meSnap, senderSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);

      if (!meSnap.empty && !senderSnap.empty) {
        const meDoc = meSnap.docs[0];
        const senderDoc = senderSnap.docs[0];

        const meFriends = meDoc.data().friends || [];
        const senderFriends = senderDoc.data().friends || [];

        // Actualizaciones en paralelo para mayor eficiencia
        await Promise.all([
          updateDoc(doc(db, "users", meDoc.id), {
            friends: [...new Set([...meFriends, req.from])]
          }),
          updateDoc(doc(db, "users", senderDoc.id), {
            friends: [...new Set([...senderFriends, userData.username])]
          })
        ]);
        
        // Actualizar el caché de amigos
        sessionStorage.removeItem('friends_data');
        sessionStorage.removeItem('friends_timestamp');
      }
    } catch (error) {
      console.error("Error al aceptar solicitud:", error);
    }
  };

  // Manejar rechazo de solicitud de amistad
  const handleRejectFriendRequest = async (req) => {
    try {
      await deleteDoc(doc(db, "friendRequests", req.id));
    } catch (error) {
      console.error("Error al rechazar solicitud:", error);
    }
  };

  // Ordenar la lista de amigos según la actividad reciente
  const sortedFriends = useMemo(() => {
    return [...filteredFriends].sort((a, b) => {
      const lastMsgA = lastMessages[a.username];
      const lastMsgB = lastMessages[b.username];
      
      // Si hay mensajes no leídos, priorizarlos
      const unreadA = unreadCounts[a.username] || 0;
      const unreadB = unreadCounts[b.username] || 0;
      
      if (unreadA > 0 && unreadB === 0) return -1;
      if (unreadA === 0 && unreadB > 0) return 1;
      
      // Si ambos tienen mensajes no leídos o ninguno, comparar por tiempo
      if (!lastMsgA?.timestamp && !lastMsgB?.timestamp) return 0;
      if (!lastMsgA?.timestamp) return 1;
      if (!lastMsgB?.timestamp) return -1;
      
      // Ordenar por timestamp más reciente
      return lastMsgB.timestamp.toDate() - lastMsgA.timestamp.toDate();
    });
  }, [filteredFriends, lastMessages, unreadCounts]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* Barra de búsqueda */}
      <div className="p-4 border-b border-gray-800">
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Pestañas de navegación */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setSelectedTab("friends")}
          className={`flex-1 py-3 flex justify-center items-center gap-2 ${
            selectedTab === "friends" ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-400'
          }`}
        >
          <MdPeopleAlt size={20} />
          <span>Amigos</span>
        </button>
        <button
          onClick={() => setSelectedTab("groups")}
          className={`flex-1 py-3 flex justify-center items-center gap-2 ${
            selectedTab === "groups" ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-400'
          }`}
        >
          <MdGroups size={20} />
          <span>Grupos</span>
        </button>
      </div>

      {/* Contenido: Lista de chats */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-pulse text-gray-400">Cargando...</div>
          </div>
        ) : (
          <>
            {selectedTab === "friends" && (
              <div className="p-2 space-y-1">
                {sortedFriends.length > 0 ? (
                  sortedFriends.map((friend) => (
                    <div
                      id={`friend-${friend.username}`}
                      key={friend.username}
                      onClick={() => handleNavigation(`/chat/${friend.username}`, `friend-${friend.username}`)}
                      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors active:bg-indigo-700
                        ${unreadCounts[friend.username] ? 'bg-gray-800 bg-opacity-70' : ''}
                      `}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleNavigation(`/chat/${friend.username}`, `friend-${friend.username}`);
                        }
                      }}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                          {friend.photoURL ? (
                            <img src={friend.photoURL} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-gray-300">😶</div>
                          )}
                        </div>
                        {isOnline(friend.username) && (
                          <div className="absolute bottom-0 right-0 bg-green-500 w-3 h-3 rounded-full border-2 border-gray-900"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="font-medium truncate">{friend.username}</span>
                            <Staff username={friend.username} />
                          </div>
                          <span className="text-xs text-gray-400">
                            {lastMessages[friend.username]?.timestamp ? 
                              formatRelativeTime(lastMessages[friend.username].timestamp) : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className={`text-sm truncate max-w-[70%] ${
                            lastMessages[friend.username]?.unread ? 'text-gray-100 font-medium' : 'text-gray-400'
                          }`}>
                            {lastMessages[friend.username]?.from === userData.username && (
                              <span className="text-gray-400 mr-1">Tú:</span>
                            )}
                            {lastMessages[friend.username]?.text || 'No hay mensajes aún'}
                          </p>
                          {unreadCounts[friend.username] > 0 && (
                            <span className="bg-indigo-600 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                              {unreadCounts[friend.username]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <p className="mb-4">No hay amigos para mostrar</p>
                    <AddFriend />
                  </div>
                )}
              </div>
            )}
     
            {selectedTab === "groups" && (
              <div className="p-2 space-y-1">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div
                      id={`group-${group.id}`}
                      key={group.id}
                      onClick={() => handleNavigation(`/chat/group/${group.id}`, `group-${group.id}`)}
                      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors active:bg-indigo-700
                        ${lastMessages[`group_${group.id}`]?.unread ? 'bg-gray-800 bg-opacity-70' : ''}
                      `}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleNavigation(`/chat/group/${group.id}`, `group-${group.id}`);
                        }
                      }}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 flex items-center justify-center">
                        <span className="text-xl">👥</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-medium truncate">{group.name}</span>
                          <span className="text-xs text-gray-400">
                            {lastMessages[`group_${group.id}`]?.timestamp ? 
                              formatRelativeTime(lastMessages[`group_${group.id}`].timestamp) : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className={`text-sm truncate max-w-[70%] ${
                            lastMessages[`group_${group.id}`]?.unread ? 'text-gray-100 font-medium' : 'text-gray-400'
                          }`}>
                            {lastMessages[`group_${group.id}`]?.from ? (
                              <span>
                                {lastMessages[`group_${group.id}`].from === userData.username ? (
                                  <span className="text-gray-400 mr-1">Tú:</span>
                                ) : (
                                  <span className="font-medium mr-1">{lastMessages[`group_${group.id}`].from}:</span>
                                )}
                                {lastMessages[`group_${group.id}`].text}
                              </span>
                            ) : (
                              'No hay mensajes aún'
                            )}
                          </p>
                          {lastMessages[`group_${group.id}`]?.unread && (
                            <span className="bg-indigo-600 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                              nuevo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <p className="mb-4">No hay grupos para mostrar</p>
                    <CreateGroupButton />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Botones flotantes */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {/* Solicitudes de amistad */}
        <button
          onClick={() => setShowFriendRequestsModal(true)}
          className="relative bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg rounded-full p-3"
          title="Solicitudes de amistad"
        >
          <MdNotifications size={20} />
          {pendingFriendRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {pendingFriendRequests.length}
            </span>
          )}
        </button>
        
        {selectedTab === "friends" && (
          <AddFriend className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg rounded-full p-3" />
        )}
        {selectedTab === "groups" && (
          <CreateGroupButton className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg rounded-full p-3" />
        )}
      </div>

      {/* Modal de solicitudes de amistad */}
      {showFriendRequestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-100">Solicitudes de amistad</h2>

            {pendingFriendRequests.length === 0 ? (
              <p className="text-center text-gray-400">No tienes solicitudes pendientes.</p>
            ) : (
              <ul className="space-y-3">
                {pendingFriendRequests.map((req) => (
                  <li
                    key={req.id}
                    className="flex items-center gap-3 bg-gray-700 p-3 rounded"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
                      {req.photoURL ? (
                        <img src={req.photoURL} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-gray-300">😶</div>
                      )}
                    </div>
                  
                    <div className="flex justify-between items-center w-full">
                      <span className="text-gray-200">{req.from}</span>
                      <div className="space-x-2">
                        <button
                          onClick={() => handleAcceptFriendRequest(req)}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm"
                        >
                          Aceptar
                        </button>
                        <button
                          onClick={() => handleRejectFriendRequest(req)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="text-right mt-4">
              <button
                onClick={() => setShowFriendRequestsModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}