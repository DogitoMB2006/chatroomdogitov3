import { useParams, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import MessageHandler from "../components/MessageHandler";
import BlockUser from "../components/BlockUser";
import RoomHandler from "../components/calls/RoomHandler";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
  orderBy,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import {
  MdArrowBack,
  MdMoreVert,
  MdCall,
  MdVideocam,
  MdClose,
  MdBlock
} from "react-icons/md";
import { listenToUserStatus } from "../utils/onlineStatus";

export default function PrivateChat() {
  const { username } = useParams();
  const { userData } = useContext(AuthContext);
  const navigate = useNavigate();
  const [receiverData, setReceiverData] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasBlockedMe, setHasBlockedMe] = useState(false);
  const [showCall, setShowCall] = useState(null); // "audio" o "video"
  
  const isAnyBlockActive = isBlocked || hasBlockedMe;

  useEffect(() => {
    if (!userData || !username) return;

    const checkBlockStatus = async () => {
      try {
        const blockDocRef = doc(db, "blockedUsers", `${userData.username}_${username}`);
        const blockDoc = await getDoc(blockDocRef);
        setIsBlocked(blockDoc.exists());

        const reverseBlockDocRef = doc(db, "blockedUsers", `${username}_${userData.username}`);
        const reverseBlockDoc = await getDoc(reverseBlockDocRef);
        setHasBlockedMe(reverseBlockDoc.exists());
      } catch (error) {
        console.error("Error al verificar bloqueo:", error);
      }
    };

    checkBlockStatus();

    const blockRef = collection(db, "blockedUsers");
    const q1 = query(blockRef, where("blocker", "==", userData.username), where("blocked", "==", username));
    const q2 = query(blockRef, where("blocker", "==", username), where("blocked", "==", userData.username));

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      setIsBlocked(!snapshot.empty);
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      setHasBlockedMe(!snapshot.empty);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [userData, username]);

  useEffect(() => {
    const fetchReceiverData = async () => {
      const q = query(collection(db, "users"), where("username", "==", username));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setReceiverData(snapshot.docs[0].data());
      }
    };

    fetchReceiverData();
  }, [username]);

  useEffect(() => {
    const unsubscribe = listenToUserStatus(username, (online) => {
      setIsUserOnline(online);
    });

    return () => unsubscribe();
  }, [username]);

  useEffect(() => {
    if (!userData || isBlocked) return;

    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("from", "==", username),
      where("to", "==", userData.username),
      where("read", "==", false),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const batch = [];
      for (const docSnap of snapshot.docs) {
        batch.push(updateDoc(doc(db, "messages", docSnap.id), { read: true }));
      }

      if (batch.length > 0) {
        await Promise.all(batch);
        console.log(`Marcados ${batch.length} mensajes como leídos`);
      }
    });

    return () => unsubscribe();
  }, [userData, username, isBlocked]);

  // En lugar de detectar llamadas entrantes, ahora nos unimos a salas
  useEffect(() => {
    if (!userData || !username) return;
    
    // Escuchar si hay una sala activa entre estos usuarios
    const sortedUsernames = [userData.username, username].sort();
    const roomName = `room_${sortedUsernames[0]}_${sortedUsernames[1]}`;
    const roomDocRef = doc(db, "rooms", roomName);
    
    const unsubscribe = onSnapshot(roomDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.active && data.participants?.includes(username) && 
            !data.participants?.includes(userData.username)) {
          // El otro usuario está en una sala esperando
          console.log("El otro usuario está esperando en una sala");
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userData, username]);

  const goBack = () => navigate("/chat");
  const toggleUserInfo = () => setShowUserInfo(!showUserInfo);
  const handleBlockStatusChange = (newStatus) => setIsBlocked(newStatus);
  
  // Iniciar una llamada con manejo de errores
  const startCall = (type) => {
    try {
      if (!userData) {
        console.error("No hay datos de usuario");
        return;
      }
      
      console.log(`Iniciando llamada de ${type} con ${username}`);
      setShowCall(type);
    } catch (error) {
      console.error("Error al iniciar llamada:", error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100 w-full overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 px-2 sm:px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={goBack}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
          >
            <MdArrowBack size={24} />
          </button>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
                {receiverData?.photoURL ? (
                  <img src={receiverData.photoURL} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-gray-300">😶</div>
                )}
              </div>
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                isAnyBlockActive ? "bg-red-500" : isUserOnline ? "bg-green-500" : "bg-gray-500"
              }`}></div>
            </div>

            <div>
              <h2 className="font-medium text-gray-100 truncate max-w-[150px] flex items-center">
                {username}
                {isBlocked && <span className="ml-2 text-xs bg-red-500 text-white px-1 py-0.5 rounded">Bloqueado</span>}
                {hasBlockedMe && <span className="ml-2 text-xs bg-gray-500 text-white px-1 py-0.5 rounded">Te bloqueó</span>}
              </h2>
              <p className="text-xs text-gray-400">
                {isAnyBlockActive ? "Bloqueado" : isUserOnline ? "En línea" : "Desconectado"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => startCall("audio")}
            className={`text-gray-400 p-2 rounded-full ${isAnyBlockActive ? "opacity-50 cursor-not-allowed" : "hover:text-white hover:bg-gray-700"} hidden sm:block`}
            disabled={isAnyBlockActive}
          >
            <MdCall size={22} />
          </button>
          <button
            onClick={() => startCall("video")}
            className={`text-gray-400 p-2 rounded-full ${isAnyBlockActive ? "opacity-50 cursor-not-allowed" : "hover:text-white hover:bg-gray-700"} hidden sm:block`}
            disabled={isAnyBlockActive}
          >
            <MdVideocam size={22} />
          </button>
          <button
            onClick={toggleUserInfo}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700"
          >
            <MdMoreVert size={22} />
          </button>
        </div>
      </header>

      {/* Chat principal */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 flex flex-col">
          {isAnyBlockActive && (
            <div className="bg-red-900 bg-opacity-75 p-4 text-white text-center">
              <div className="flex items-center justify-center space-x-2">
                <MdBlock size={20} />
                <span>
                  {isBlocked
                    ? "Has bloqueado a este usuario. No puedes enviar ni recibir mensajes."
                    : "Este usuario te ha bloqueado. No puedes enviar mensajes."}
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-gray-900 px-1 sm:px-3">
            <MessageHandler receiver={username} isBlocked={isAnyBlockActive} />
          </div>
        </div>

        {/* Panel lateral de información del usuario */}
        {showUserInfo && (
          <div className="absolute right-0 top-0 h-full w-64 bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out">
            <div className="p-4">
              <h3 className="text-lg font-medium mb-4">Opciones</h3>
              <BlockUser
                username={username}
                isBlocked={isBlocked}
                onBlockStatusChange={handleBlockStatusChange}
              />
            </div>
          </div>
        )}

        {/* Llamada */}
        {showCall && userData && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="relative w-full max-w-xl">
              <RoomHandler
                otherUsername={username}
                myUsername={userData.username}
                video={showCall === "video"}
                onClose={() => {
                  console.log("Cerrando llamada");
                  setShowCall(null);
                }}
              />
            </div>

            <button
              onClick={() => {
                console.log("Botón cerrar presionado");
                setShowCall(null);
              }}
              className="absolute top-4 right-4 bg-red-700 hover:bg-red-800 text-white p-2 rounded-full"
            >
              <MdClose size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}