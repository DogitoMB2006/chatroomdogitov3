import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { db, storage } from "../firebase/config";
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
  writeBatch
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
  MdGif
} from "react-icons/md";
import Staff from "../components/Staff";

export default function MessageHandler({ receiver }) {
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
  }, [userData, receiver]);


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

        if (isBetween) {
        
          if (data.to === userData.username && !data.read) {
            unreadMessages.push(docSnap.id);
          }

          filtered.push({ ...data, id: docSnap.id });
        }
      }

      setMessages(filtered);
      
      // Marcar mensajes como leídos (en segundo plano)
      if (unreadMessages.length > 0) {
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
  }, [userData, receiver]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
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

  return (
    <div className="flex flex-col h-full">
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

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

                      {/* Texto del mensaje */}
                      {msg.text && (
                        <p className="break-words">
                          {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                            part.match(/^https?:\/\/[^\s]+$/) ? (
                              <a
                                key={i}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`underline ${isMine ? 'text-blue-200' : 'text-blue-300'}`}
                              >
                                {part}
                              </a>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </p>
                      )}

                      {/* Hora */}
                      <span className="block text-[10px] mt-1 text-right opacity-70">
                        {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'p') : '...'}
                      </span>

                      {/* No mostramos indicador de no leído ya que todos son leídos al entrar */}
                    </div>
                  </div>

                  {/* Botones de acción */}
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
      {replyTo && (
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
            placeholder="Envía un mensaje..."
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
            disabled={!text.trim() && !image}
          >
            <MdSend size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}