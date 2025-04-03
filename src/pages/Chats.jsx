import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { collection, getDocs, query, where, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import AddFriend from "../components/AddFriend";
import FriendRequests from "../components/FriendRequests";
import CreateGroupButton from "../components/CreateGroupButton";
import Staff from "../components/Staff";
import { MdSearch, MdPeopleAlt, MdGroups, MdNotifications } from "react-icons/md";

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
  const navigate = useNavigate();

  // Obtener amigos
  useEffect(() => {
    const fetchFriends = async () => {
      if (!userData?.friends || userData.friends.length === 0) {
        setFriends([]);
        return;
      }

      const friendData = [];

      for (let uname of userData.friends) {
        const q = query(collection(db, "users"), where("username", "==", uname));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          friendData.push(snapshot.docs[0].data());
        }
      }

      setFriends(friendData);
    };

    if (userData) {
      fetchFriends();
    }
  }, [userData]);

  // Obtener grupos
  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, "groups"),
      where("miembros", "array-contains", userData.username)
    );

    const unsub = onSnapshot(q, (snap) => {
      const results = [];
      snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
      setGroups(results);
    });

    return () => unsub();
  }, [userData]);
  
  // Obtener solicitudes de amistad pendientes
  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, "friendRequests"),
      where("to", "==", userData.username),
      where("status", "==", "pending"),
      orderBy("timestamp", "desc")
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

  // Obtener mensajes no leídos y últimos mensajes en tiempo real
  useEffect(() => {
    if (!userData) return;
    
    // Objeto para almacenar los unsubscribe de los listeners
    const unsubscribers = [];
    
    // Listener para mensajes privados
    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("to", "==", userData.username),
      where("read", "==", false),
      orderBy("timestamp", "desc")
    );

    const unsubMessages = onSnapshot(q, (snapshot) => {
      const newUnreadCounts = { ...unreadCounts };
      const newLastMessages = { ...lastMessages };

      // Agrupar mensajes no leídos por remitente
      snapshot.docs.forEach((doc) => {
        const msg = doc.data();
        const from = msg.from;
        
        // Incrementar contador de no leídos
        if (!newUnreadCounts[from]) {
          newUnreadCounts[from] = 0;
        }
        newUnreadCounts[from]++;
        
        // Actualizar último mensaje si es más reciente
        if (!newLastMessages[from] || 
            (msg.timestamp && 
            (!newLastMessages[from].timestamp || 
            msg.timestamp.toDate() > newLastMessages[from].timestamp.toDate()))) {
          newLastMessages[from] = {
            text: msg.text || (msg.image ? "📷 Imagen" : ""),
            timestamp: msg.timestamp,
            unread: true
          };
        }
      });
      
      setUnreadCounts(newUnreadCounts);
      setLastMessages(prevState => ({...prevState, ...newLastMessages}));
    });
    
    unsubscribers.push(unsubMessages);

    // Para cada amigo, obtener el último mensaje (leído o no)
    friends.forEach(friend => {
      const lastMsgQuery = query(
        messagesRef,
        where("participants", "array-contains", userData.username),
        orderBy("timestamp", "desc"),
        limit(10)
      );
      
      const unsubLastMsg = onSnapshot(lastMsgQuery, (snapshot) => {
        const newLastMessages = { ...lastMessages };
        
        snapshot.docs.forEach(doc => {
          const msgData = doc.data();
          
          // Verificar si el mensaje es entre este amigo y el usuario
          const isBetween = 
            (msgData.from === userData.username && msgData.to === friend.username) ||
            (msgData.from === friend.username && msgData.to === userData.username);
            
          if (isBetween) {
            const username = msgData.from === userData.username ? msgData.to : msgData.from;
            
            // Actualizar último mensaje si es más reciente
            if (!newLastMessages[username] || 
                (msgData.timestamp && 
                (!newLastMessages[username].timestamp || 
                msgData.timestamp.toDate() > newLastMessages[username].timestamp.toDate()))) {
              
              newLastMessages[username] = {
                text: msgData.text || (msgData.image ? "📷 Imagen" : ""),
                timestamp: msgData.timestamp,
                unread: msgData.to === userData.username && !msgData.read
              };
            }
          }
        });
        
        setLastMessages(prevState => ({...prevState, ...newLastMessages}));
      });
      
      unsubscribers.push(unsubLastMsg);
    });

    // Para grupos, obtener último mensaje y actualizaciones en tiempo real
    groups.forEach(group => {
      const msgsRef = collection(db, "groupMessages", group.id, "messages");
      const groupLastMsgQuery = query(msgsRef, orderBy("timestamp", "desc"), limit(1));
      
      const unsubGroupLastMsg = onSnapshot(groupLastMsgQuery, (snapshot) => {
        if (!snapshot.empty) {
          const msgData = snapshot.docs[0].data();
          const newLastMessages = { ...lastMessages };
          
          const groupKey = `group_${group.id}`;
          newLastMessages[groupKey] = {
            text: msgData.text || (msgData.image ? "📷 Imagen" : ""),
            timestamp: msgData.timestamp,
            from: msgData.from,
            // Determinar si es no leído (esto requeriría lógica adicional en el grupo)
            unread: msgData.from !== userData.username
          };
          
          setLastMessages(prevState => ({...prevState, ...newLastMessages}));
        }
      });
      
      unsubscribers.push(unsubGroupLastMsg);
    });

    // Cleanup de todos los listeners al desmontar
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [userData, friends, groups]); // Se ejecuta al cambiar amigos o grupos

  // Filtrar chats por búsqueda
  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para formatear la fecha relativa (ej: "hace 5 min", "hoy a las 10:30")
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "";
    
    const now = new Date();
    const messageDate = timestamp.toDate();
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    // Mismo día, menos de 1 minuto
    if (diffInMinutes < 1) {
      return "ahora";
    }
    // Mismo día, menos de 1 hora
    else if (diffInMinutes < 60) {
      return `hace ${diffInMinutes} min`;
    }
    // Mismo día, más de 1 hora
    else if (diffInHours < 24 && messageDate.getDate() === now.getDate()) {
      return messageDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    // Ayer
    else if (diffInDays === 1) {
      return "ayer";
    }
    // Hace menos de una semana
    else if (diffInDays < 7) {
      const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
      return days[messageDate.getDay()];
    }
    // Más de una semana
    else {
      return messageDate.toLocaleDateString([], { day: 'numeric', month: 'numeric' });
    }
  };

  // Verificar si un amigo está en línea (simulado)
  const isOnline = (username) => {
    // Aquí podrías implementar lógica real para detectar si está en línea
    return Math.random() > 0.5; // Simulación para el ejemplo
  };

  // Manejar aceptar solicitud de amistad
  const handleAcceptFriendRequest = async (req) => {
    try {
      const requestRef = doc(db, "friendRequests", req.id);
      
      // 1. Marcar como aceptado
      await updateDoc(requestRef, { status: "accepted" });

      // 2. Agregar a ambos en sus listas de amigos
      const usersRef = collection(db, "users");

      const q1 = query(usersRef, where("username", "==", userData.username));
      const q2 = query(usersRef, where("username", "==", req.from));

      const [meSnap, senderSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);

      if (!meSnap.empty && !senderSnap.empty) {
        const meDoc = meSnap.docs[0];
        const senderDoc = senderSnap.docs[0];

        const meFriends = meDoc.data().friends || [];
        const senderFriends = senderDoc.data().friends || [];

        await updateDoc(doc(db, "users", meDoc.id), {
          friends: [...new Set([...meFriends, req.from])]
        });

        await updateDoc(doc(db, "users", senderDoc.id), {
          friends: [...new Set([...senderFriends, userData.username])]
        });
      }
    } catch (error) {
      console.error("Error al aceptar solicitud:", error);
    }
  };

  // Manejar rechazar solicitud de amistad
  const handleRejectFriendRequest = async (req) => {
    try {
      await deleteDoc(doc(db, "friendRequests", req.id));
    } catch (error) {
      console.error("Error al rechazar solicitud:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* No utilizamos header aquí ya que tenemos Navbar */}

      {/* Búsqueda */}
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

      {/* Pestañas */}
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
        {selectedTab === "friends" && (
          <div className="p-2 space-y-1">
            {filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => (
                <div
                  key={friend.username}
                  onClick={() => navigate(`/chat/${friend.username}`)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
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
                  key={group.id}
                  onClick={() => navigate(`/chat/group/${group.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
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
                            <span className="font-medium">{lastMessages[`group_${group.id}`].from}:</span> {lastMessages[`group_${group.id}`].text}
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
      </div>

      {/* Acciones flotantes */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {/* Botón de notificaciones de solicitudes de amistad */}
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
                    {/* Imagen de perfil */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
                      {req.photoURL ? (
                        <img src={req.photoURL} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-gray-300">😶</div>
                      )}
                    </div>
                  
                    {/* Nombre y botones */}
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