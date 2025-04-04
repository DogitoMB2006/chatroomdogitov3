import { useParams, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import MessageHandler from "../components/MessageHandler";
import { db } from "../firebase/config";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  onSnapshot,
  orderBy,
  doc
} from "firebase/firestore";
import { MdArrowBack, MdMoreVert, MdCall, MdVideocam, MdClose } from "react-icons/md";
import { listenToUserStatus } from "../utils/onlineStatus";

export default function PrivateChat() {
  const { username } = useParams();
  const { userData } = useContext(AuthContext);
  const navigate = useNavigate();
  const [receiverData, setReceiverData] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(false);

  // Fetch receiver's data
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

  // Listen to user's online status
  useEffect(() => {
    const unsubscribe = listenToUserStatus(username, (online) => {
      setIsUserOnline(online);
    });

    return () => unsubscribe();
  }, [username]);

  // Marcar mensajes como leídos al entrar al chat
  useEffect(() => {
    if (!userData) return;

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
      }});

      return () => unsubscribe();
    }, [userData, username]);
  
    const goBack = () => {
      navigate("/chat");
    };
  
    const toggleUserInfo = () => {
      setShowUserInfo(!showUserInfo);
    };
  
    return (
      <div className="h-screen flex flex-col bg-gray-900 text-gray-100 w-full overflow-hidden">
        {/* Header */}
        <header className="bg-gray-800 px-2 sm:px-4 py-3 shadow-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              onClick={goBack}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
              aria-label="Go back"
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
                {isUserOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                )}
              </div>
              
              <div>
                <h2 className="font-medium text-gray-100 truncate max-w-[150px]">{username}</h2>
                <p className="text-xs text-gray-400">
                  {isUserOnline ? "En línea" : "Desconectado"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <button 
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 hidden sm:block"
              aria-label="Call"
            >
              <MdCall size={22} />
            </button>
            <button 
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 hidden sm:block"
              aria-label="Video call"
            >
              <MdVideocam size={22} />
            </button>
            <button 
              onClick={toggleUserInfo}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700"
              aria-label="More options"
            >
              <MdMoreVert size={22} />
            </button>
          </div>
        </header>
  
        {/* Main Chat Area with Sidebar */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Main chat content */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto bg-gray-900 px-1 sm:px-3">
              <MessageHandler receiver={username} />
            </div>
          </div>
          
          {/* Mobile User Info Overlay */}
          {showUserInfo && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden flex justify-end">
              <div className="w-4/5 max-w-xs bg-gray-800 h-full overflow-y-auto p-4 animate-slide-in-right">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg">Información de usuario</h3>
                  <button 
                    onClick={toggleUserInfo}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700"
                  >
                    <MdClose size={22} />
                  </button>
                </div>
                
                {receiverData && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-600 mb-3">
                        {receiverData.photoURL ? (
                          <img src={receiverData.photoURL} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">😶</div>
                        )}
                      </div>
                      <h4 className="font-bold text-xl truncate max-w-full">{username}</h4>
                      <p className="text-sm text-gray-400">
                        {isUserOnline ? "En línea" : "Desconectado"}
                      </p>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="bg-gray-700 p-3 rounded">
                        <span className="block text-gray-400 mb-1">Correo</span>
                        <span className="break-words">{receiverData.email || "No disponible"}</span>
                      </div>
                      
                      <div className="bg-gray-700 p-3 rounded">
                        <span className="block text-gray-400 mb-1">Estado</span>
                        <span>{receiverData.status || "Sin estado"}</span>
                      </div>
                      
                      <div className="bg-gray-700 p-3 rounded">
                        <span className="block text-gray-400 mb-1">Se unió</span>
                        <span>{receiverData.joinDate || "Fecha desconocida"}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-700 flex flex-col space-y-3">
                      <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white transition-colors">
                        Enviar mensaje
                      </button>
                      <button className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors">
                        Bloquear usuario
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Desktop sidebar - Only shown on desktop */}
          {showUserInfo && (
            <div className="w-64 bg-gray-800 shadow-lg border-l border-gray-700 overflow-y-auto hidden md:block p-4 animate-fade-in-down">
              <h3 className="font-medium text-lg mb-4">Información de usuario</h3>
              
              {receiverData && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-600 mb-3">
                      {receiverData.photoURL ? (
                        <img src={receiverData.photoURL} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">😶</div>
                      )}
                    </div>
                    <h4 className="font-bold text-xl">{username}</h4>
                    <p className="text-sm text-gray-400">
                      {isUserOnline ? "En línea" : "Desconectado"}
                    </p>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="bg-gray-700 p-3 rounded">
                      <span className="block text-gray-400 mb-1">Correo</span>
                      <span className="break-words">{receiverData.email || "No disponible"}</span>
                    </div>
                    
                    <div className="bg-gray-700 p-3 rounded">
                      <span className="block text-gray-400 mb-1">Estado</span>
                      <span>{receiverData.status || "Sin estado"}</span>
                    </div>
                    
                    <div className="bg-gray-700 p-3 rounded">
                      <span className="block text-gray-400 mb-1">Se unió</span>
                      <span>{receiverData.joinDate || "Fecha desconocida"}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700 flex flex-col space-y-3">
                    <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white transition-colors">
                      Enviar mensaje
                    </button>
                    <button className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors">
                      Bloquear usuario
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }