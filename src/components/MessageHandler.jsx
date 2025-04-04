import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { db, storage } from "../firebase/config";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  deleteDoc,
  writeBatch,
  getDoc
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { format } from "date-fns";
import { 
  MdImage, 
  MdDelete, 
  MdReply, 
  MdSend, 
  MdEmojiEmotions,
  MdGif,
  MdBlock
} from "react-icons/md";
import Staff from "../components/Staff";
import { toast } from "react-toastify";

// Mapa de hashtags a rutas
const ROUTE_HASHTAGS = {
  '#home': '/',
  '#login': '/login',
  '#register': '/register',
  '#chat': '/chat',
  '#editprofile': '/editprofile'
};

// Expresión regular para detectar hashtags de rutas
const HASHTAG_REGEX = /#(home|login|register|chat|editprofile)\b/g;

export default function MessageHandler({ receiver, isBlocked }) {
  const { userData } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [receiverData, setReceiverData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const scrollRef = useRef();
  const [replyTo, setReplyTo] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isMountedRef = useRef(true);
  const navigate = useNavigate();
  const [hasBlockedMe, setHasBlockedMe] = useState(false);
  const [iHaveBlocked, setIHaveBlocked] = useState(false);
  const [showCantSendMessage, setShowCantSendMessage] = useState(false);

  // Verificar el estado de bloqueo
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!userData || !receiver) return;
      
      try {
        // Verificar si yo he bloqueado al receptor
        const myBlockDocRef = doc(db, "blockedUsers", `${userData.username}_${receiver}`);
        const myBlockDoc = await getDoc(myBlockDocRef);
        const blocked = myBlockDoc.exists();
        setIHaveBlocked(blocked);
        
        // Verificar si el receptor me ha bloqueado
        const theirBlockDocRef = doc(db, "blockedUsers", `${receiver}_${userData.username}`);
        const theirBlockDoc = await getDoc(theirBlockDocRef);
        setHasBlockedMe(theirBlockDoc.exists());
      } catch (error) {
        console.error("Error al verificar estado de bloqueo:", error);
      }
    };
    
    checkBlockStatus();
  }, [userData, receiver, isBlocked]);

  useEffect(() => {
    const getReceiverData = async () => {
      const q = query(collection(db, "users"), where("username", "==", receiver));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setReceiverData(snap.docs[0].data());
      }
    };
    getReceiverData();
  }, [receiver]);


  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!userData || !receiver) return;

      try {
        // No marcar mensajes como leídos si el usuario está bloqueado
        if (iHaveBlocked) {
          console.log("Usuario bloqueado, no se marcarán mensajes como leídos");
          return;
        }
        
        const messagesRef = collection(db, "messages");
        const q = query(
          messagesRef,
          where("from", "==", receiver),
          where("to", "==", userData.username),
          where("read", "==", false)
        );

        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          
          snapshot.docs.forEach((docSnapshot) => {
            batch.update(doc(db, "messages", docSnapshot.id), { read: true });
          });
          
          await batch.commit();
          console.log(`Marcados ${snapshot.docs.length} mensajes como leídos al entrar al chat`);
        }
      } catch (error) {
        console.error("Error al marcar mensajes como leídos:", error);
      }
    };

    markMessagesAsRead();
  }, [userData, receiver, iHaveBlocked]);


  useEffect(() => {
    if (!userData) return;

    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("participants", "array-contains", userData.username),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const filtered = [];
      const unreadMessages = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        const isBetween =
          (data.from === userData.username && data.to === receiver) ||
          (data.from === receiver && data.to === userData.username);

        // Mostrar mensajes solo si no hay bloqueo, o si son mensajes del usuario actual
        if (isBetween) {
          if (data.to === userData.username && !data.read && !iHaveBlocked) {
            unreadMessages.push(docSnap.id);
          }

          filtered.push({ ...data, id: docSnap.id });
        }
      }

      setMessages(filtered);
      
      // Marcar mensajes como leídos (en segundo plano), pero solo si no hay bloqueo
      if (unreadMessages.length > 0 && !iHaveBlocked) {
        const batch = writeBatch(db);
        
        unreadMessages.forEach((msgId) => {
          batch.update(doc(db, "messages", msgId), { read: true });
        });
        
        batch.commit().catch(err => console.error("Error al marcar mensajes como leídos:", err));
      }
      
      scrollToBottom();
    });

    return () => {
      unsub();
      isMountedRef.current = false;
    };
  }, [userData, receiver, iHaveBlocked]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    
    // Verificar nuevamente si hay bloqueo
    const isAnyBlockActive = iHaveBlocked || hasBlockedMe || isBlocked;
    
    if (isAnyBlockActive) {
      // Mostrar mensaje temporal
      setShowCantSendMessage(true);
      setTimeout(() => setShowCantSendMessage(false), 3000);
      return;
    }
    
    // Verificar bloqueo una vez más antes de enviar (consulta en tiempo real)
    try {
      const myBlockDocRef = doc(db, "blockedUsers", `${userData.username}_${receiver}`);
      const theirBlockDocRef = doc(db, "blockedUsers", `${receiver}_${userData.username}`);
      
      const [myBlockDoc, theirBlockDoc] = await Promise.all([
        getDoc(myBlockDocRef),
        getDoc(theirBlockDocRef)
      ]);
      
      if (myBlockDoc.exists() || theirBlockDoc.exists()) {
        toast.error("No puedes enviar mensajes debido a un bloqueo");
        return;
      }
    } catch (error) {
      console.error("Error al verificar bloqueo:", error);
    }
    
    if (text.trim() === '' && !image) return;
  
    let imageUrl = null;
  
    if (image) {
      const imageRef = ref(storage, `chatImages/${Date.now()}-${image.name}`);
      await uploadBytes(imageRef, image);
      imageUrl = await getDownloadURL(imageRef);
    }
  
    await addDoc(collection(db, "messages"), {
      from: userData.username,
      to: receiver,
      text: text.trim(),
      image: imageUrl,
      timestamp: serverTimestamp(),
      participants: [userData.username, receiver],
      read: false,
      replyTo: replyTo ? { from: replyTo.from, text: replyTo.text } : null
    });
  
    setText('');
    setImage(null);
    setReplyTo(null);
    scrollToBottom();
  };

  const handleDelete = async (msg) => {
    const confirm = window.confirm("¿Eliminar este mensaje?");
    if (!confirm) return;

    try {
      if (msg.image) {
        const imagePath = decodeURIComponent(new URL(msg.image).pathname.split("/o/")[1]);
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
      }
      await deleteDoc(doc(db, "messages", msg.id));
    } catch (err) {
      alert("Error al eliminar mensaje: " + err.message);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  // Función para navegar al hacer clic en un hashtag
  const handleHashtagClick = (route) => {
    navigate(route);
  };

  // Función para renderizar el texto con hashtags clickeables
  const renderMessageWithHashtags = (text) => {
    // Primero manejamos los enlaces regulares
    const urlParts = text.split(/(https?:\/\/[^\s]+)/g);

    return urlParts.map((part, i) => {
      // Si es una URL, la manejamos como antes
      if (part.match(/^https?:\/\/[^\s]+$/)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-300"
          >
            {part}
          </a>
        );
      } 
      
      // Si no es una URL, buscamos hashtags
      const hashtagParts = part.split(HASHTAG_REGEX);
      
      if (hashtagParts.length === 1) {
        // No hay hashtags, devolver el texto normal
        return <span key={i}>{part}</span>;
      }
      
      // Reconstruir el texto con los hashtags convertidos en enlaces
      const result = [];
      let index = 0;
      
      part.replace(HASHTAG_REGEX, (match, hashtag, offset) => {
        // Añadir el texto antes del hashtag
        if (offset > index) {
          result.push(<span key={`${i}-${index}`}>{part.substring(index, offset)}</span>);
        }
        
        // Añadir el hashtag como enlace
        result.push(
          <span
            key={`${i}-${offset}`}
            className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer font-medium"
            onClick={() => handleHashtagClick(ROUTE_HASHTAGS[`#${hashtag}`])}
          >
            {match}
          </span>
        );
        
        index = offset + match.length;
        return match;
      });
      
      // Añadir el texto restante después del último hashtag
      if (index < part.length) {
        result.push(<span key={`${i}-end`}>{part.substring(index)}</span>);
      }
      
      return <span key={i}>{result}</span>;
    });
  };

  // Agrupar mensajes por fecha
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(msg => {
      if (!msg.timestamp?.toDate) return;
      
      const date = format(msg.timestamp.toDate(), 'PP'); // Formato: Apr 3, 2025
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(msg);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate();
  
  // Determinar si hay algún tipo de bloqueo
  const isAnyBlockActive = isBlocked || iHaveBlocked || hasBlockedMe;

  return (
    <div className="flex flex-col h-full">
      {/* Notificación de bloqueo */}
      {isAnyBlockActive && (
        <div className="bg-red-900 bg-opacity-75 p-4 text-white text-center">
          {iHaveBlocked ? (
            <div className="flex items-center justify-center space-x-2">
              <MdBlock size={20} />
              <span>Has bloqueado a este usuario. No puedes enviar ni recibir mensajes.</span>
            </div>
          ) : hasBlockedMe ? (
            <div className="flex items-center justify-center space-x-2">
              <MdBlock size={20} />
              <span>Este usuario te ha bloqueado. No puedes enviar mensajes.</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <MdBlock size={20} />
              <span>No puedes interactuar con este usuario.</span>
            </div>
          )}
        </div>
      )}

      {/* Overlay de imagen previa */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
        >
          <img
            src={previewImage}
            alt="Vista previa"
            className="max-w-[90%] max-h-[90%] rounded"
          />
        </div>
      )}

      {/* Mostrar mensaje de no poder enviar */}
      {showCantSendMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-800 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in">
          No puedes enviar mensajes a este usuario debido a un bloqueo
        </div>
      )}

      {/* Área de mensajes */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isAnyBlockActive ? 'opacity-75' : ''}`}>
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date} className="space-y-2">
            {/* Divisor de fecha */}
            <div className="flex items-center justify-center my-3">
              <div className="bg-gray-700 text-gray-300 text-xs font-medium px-3 py-1 rounded-full">
                {date}
              </div>
            </div>
            
            {/* Mensajes del día */}
            {msgs.map((msg, idx) => {
              const isMine = msg.from === userData.username;
              const photoURL = isMine ? userData?.photoURL : receiverData?.photoURL;
              const isStaff = msg.from === "Dogito";
              
              // Detectar si es el primer mensaje de un grupo del mismo remitente
              const isFirstInGroup = idx === 0 || msgs[idx - 1].from !== msg.from;
              // Detectar si es el último mensaje de un grupo del mismo remitente
              const isLastInGroup = idx === msgs.length - 1 || msgs[idx + 1].from !== msg.from;
              
              return (
                <div
                  key={msg.id || idx}
                  className={`flex items-start gap-2 group ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Avatar (solo mostrar en el primer mensaje del grupo) */}
                  {!isMine && isFirstInGroup && (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex-shrink-0 mt-1">
                      {photoURL ? (
                        <img src={photoURL} alt="pfp" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">😶</div>
                      )}
                    </div>
                  )}
                  
                  {/* Espacio para alinear cuando no hay avatar */}
                  {!isMine && !isFirstInGroup && <div className="w-8 flex-shrink-0"></div>}

                  <div className="max-w-[80%] flex flex-col">
                    {/* Nombre de usuario (solo en el primer mensaje del grupo) */}
                    {!isMine && isFirstInGroup && (
                      <div className="flex items-center mb-1 ml-1">
                        <span className="text-xs font-medium text-gray-300">{msg.from}</span>
                        <Staff username={msg.from} />
                      </div>
                    )}
                    
                    <div
                      className={`px-3 py-2 rounded-lg relative ${
                        isMine 
                          ? `bg-indigo-600 text-white ${isFirstInGroup ? 'rounded-tr-none' : ''} ${isLastInGroup ? 'rounded-br-none' : ''}`
                          : `bg-gray-700 text-gray-100 ${isFirstInGroup ? 'rounded-tl-none' : ''} ${isLastInGroup ? 'rounded-bl-none' : ''}`
                      }`}
                    >
                      {/* Mensaje al que responde */}
                      {msg.replyTo && (
                        <div className="text-xs border-l-2 pl-2 mb-2 opacity-75 rounded py-1 bg-black bg-opacity-20">
                          <span className="font-medium">{msg.replyTo.from}</span>
                          <Staff username={msg.replyTo.from} className="w-3 h-3" />
                          <span>: "{msg.replyTo.text}"</span>
                        </div>
                      )}

                      {/* Imagen */}
                      {msg.image && (
                        <div className="mb-2">
                          <img
                            src={msg.image}
                            alt="media"
                            className="rounded max-w-full max-h-60 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(msg.image)}
                          />
                        </div>
                      )}

                      {/* Texto del mensaje con hashtags clickeables */}
                      {msg.text && (
                        <p className="break-words">
                          {renderMessageWithHashtags(msg.text)}
                        </p>
                      )}

                      {/* Hora */}
                      <span className="block text-[10px] mt-1 text-right opacity-70">
                        {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'p') : '...'}
                      </span>

                      {/* No mostramos indicador de no leído ya que todos son leídos al entrar */}
                    </div>
                  </div>

                  {/* Botones de acción (deshabilitados si hay bloqueo) */}
                  {!isAnyBlockActive && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => setReplyTo({ from: msg.from, text: msg.text || (msg.image ? "[Imagen]" : "") })}
                        className="bg-gray-800 text-gray-300 p-1 rounded hover:bg-gray-700 transition-colors"
                        title="Responder"
                      >
                        <MdReply size={16} />
                      </button>
                      
                      {isMine && (
                        <button
                          onClick={() => handleDelete(msg)}
                          className="bg-red-900 text-red-100 p-1 rounded hover:bg-red-800 transition-colors"
                          title="Eliminar mensaje"
                        >
                          <MdDelete size={16} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Avatar propio (solo en el primer mensaje del grupo) */}
                  {isMine && isFirstInGroup && (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex-shrink-0 mt-1">
                      {photoURL ? (
                        <img src={photoURL} alt="pfp" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">😶</div>
                      )}
                    </div>
                  )}
                  
                  {/* Espacio para alinear cuando no hay avatar */}
                  {isMine && !isFirstInGroup && <div className="w-8 flex-shrink-0"></div>}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Área de respuesta */}
      {replyTo && !isAnyBlockActive && (
        <div className="bg-gray-800 border-l-4 border-indigo-500 px-3 py-2 mx-2 mb-2 text-sm rounded flex justify-between items-center text-gray-200">
          <div className="flex items-center">
            Respondiendo a <strong className="mx-1">{replyTo.from}</strong>
            <Staff username={replyTo.from} className="w-3 h-3 mr-1" />
            : "{replyTo.text}"
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-red-400 text-xs hover:underline"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Formulario de entrada */}
      {isAnyBlockActive ? (
        <div className="border-t border-gray-700 px-3 py-4 bg-gray-800">
          <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
            <MdBlock className="text-red-500 mr-2" size={20} />
            <span className="text-gray-400">
              {iHaveBlocked 
                ? "Has bloqueado a este usuario" 
                : hasBlockedMe 
                  ? "Este usuario te ha bloqueado" 
                  : "No puedes enviar mensajes"
              }
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={sendMessage} className="border-t border-gray-700 px-3 py-3 bg-gray-800">
          {image && (
            <div className="mb-2 bg-gray-750 p-2 rounded text-sm text-gray-300 flex justify-between items-center">
              <span>
                Imagen: <strong className="text-gray-200">{image.name}</strong> 
                ({Math.round(image.size / 1024)} KB)
              </span>
              <button 
                type="button"
                onClick={() => setImage(null)}
                className="text-red-400 hover:text-red-300"
              >
                <MdDelete />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={handleImageClick}
                className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700"
                title="Adjuntar imagen"
              >
                <MdImage size={20} />
              </button>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700"
                title="Insertar emoji"
              >
                <MdEmojiEmotions size={20} />
              </button>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700"
                title="Añadir GIF"
              >
                <MdGif size={20} />
              </button>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <input
              type="text"
              placeholder="Envía un mensaje... Usa #home o #chat para navegación"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <button
              type="submit"
              className={`p-2 rounded-full ${
                text.trim() || image
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
              disabled={!text.trim() && !image}>
              <MdSend size={20} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}