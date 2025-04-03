import { useEffect, useState, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../firebase/config";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  deleteDoc,
  where,
  getDocs
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { AuthContext } from "../context/AuthContext";
import { format } from "date-fns";
import { 
  MdDelete, 
  MdReply, 
  MdSend, 
  MdArrowBack, 
  MdImage,
  MdEmojiEmotions,
  MdGif,
  MdPeople
} from "react-icons/md";
import GroupSettings from "./GroupSettings";
import Staff from "../components/Staff";
import ViewProfile from "./ViewProfile";
import ViewGroupMembers from "./ViewGroupMembers";

export default function GroupChat() {
  const { groupId } = useParams();
  const { userData } = useContext(AuthContext);
  const [groupInfo, setGroupInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [usersData, setUsersData] = useState([]);
  const scrollRef = useRef();
  const navigate = useNavigate();
  const [kickedOut, setKickedOut] = useState(false);
  const [image, setImage] = useState(null);
  const fileInputRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [viewingMembers, setViewingMembers] = useState(false);

  const isAdmin = groupInfo?.admin === userData?.username;

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "groups", groupId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGroupInfo(data);

        if (!data.miembros.includes(userData.username)) {
          setKickedOut(true);
          setTimeout(() => navigate("/chat"), 4000);
        }
      } else {
        setKickedOut(true);
        setTimeout(() => navigate("/chat"), 4000);
      }
    });

    return () => unsubscribe();
  }, [groupId, userData.username, navigate]);

  useEffect(() => {
    const q = query(
      collection(db, "groupMessages", groupId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = [];
      snap.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsub();
  }, [groupId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cargar perfiles de los miembros
  useEffect(() => {
    const fetchMembers = async () => {
      if (!groupInfo || !groupInfo.miembros?.length) return;

      const q = query(
        collection(db, "users"),
        where("username", "in", groupInfo.miembros)
      );

      const snap = await getDocs(q);
      const all = snap.docs.map((doc) => doc.data());
      setUsersData(all);
    };

    fetchMembers();
  }, [groupInfo]);

  // Obtener foto del usuario
  const getPhoto = (username) => {
    return usersData.find((u) => u.username === username)?.photoURL || null;
  };

  const handleSend = async () => {
    if (!text.trim() && !image) return;

    let imageUrl = null;

    if (image) {
      const imageRef = ref(storage, `groupImages/${groupId}/${Date.now()}-${image.name}`);
      await uploadBytes(imageRef, image);
      imageUrl = await getDownloadURL(imageRef);
    }

    await addDoc(collection(db, "groupMessages", groupId, "messages"), {
      from: userData.username,
      text: text.trim(),
      image: imageUrl,
      timestamp: serverTimestamp(),
      replyTo: replyTo ? { from: replyTo.from, text: replyTo.text } : null
    });

    setText("");
    setImage(null);
    setReplyTo(null);
  };

  const handleDelete = async (msgId, imageUrl) => {
    const confirm = window.confirm("¿Eliminar este mensaje?");
    if (!confirm) return;

    try {
      // Si hay una imagen, eliminarla del storage primero
      if (imageUrl) {
        const imagePath = decodeURIComponent(new URL(imageUrl).pathname.split("/o/")[1]);
        const imageRef = ref(storage, imagePath);
        try {
          await deleteObject(imageRef);
        } catch (err) {
          console.error("Error al eliminar imagen:", err);
          // Continuar con la eliminación del mensaje incluso si falla la eliminación de la imagen
        }
      }
      
      await deleteDoc(doc(db, "groupMessages", groupId, "messages", msgId));
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
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
      
      {/* Modal de perfil de usuario */}
      {viewingProfile && (
        <ViewProfile 
          username={viewingProfile} 
          onClose={() => setViewingProfile(null)} 
        />
      )}
      
      {/* Modal de miembros del grupo */}
      {viewingMembers && (
        <ViewGroupMembers 
          groupInfo={groupInfo} 
          groupId={groupId}
          onClose={() => setViewingMembers(false)} 
        />
      )}

      {kickedOut ? (
        <div className="text-center text-red-400 font-semibold mt-20 p-4">
          Ya no eres parte de este grupo. Serás redirigido en unos segundos...
        </div>
      ) : (
        <>
          {/* Encabezado fijo */}
          <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 py-3 px-4 flex items-center">
            <button 
              onClick={() => navigate("/chat")}
              className="text-gray-400 hover:text-gray-200 mr-3"
            >
              <MdArrowBack size={22} />
            </button>
            
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                  <span className="text-xl">👥</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-gray-100">
                    {groupInfo?.name || "Cargando..."}
                  </h2>
                  <p className="text-xs text-gray-400 cursor-pointer hover:text-gray-200" onClick={() => setViewingMembers(true)}>
                    {groupInfo?.miembros?.length || 0} miembros
                  </p>
                </div>
                
                <button
                  onClick={() => setViewingMembers(true)}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-full mr-2"
                  title="Ver miembros"
                >
                  <MdPeople size={22} />
                </button>

                {groupInfo && isAdmin && (
                  <GroupSettings
                    groupId={groupId}
                    groupInfo={groupInfo}
                    onChange={() => {
                      const groupRef = doc(db, "groups", groupId);
                      getDoc(groupRef).then((snap) => {
                        if (snap.exists()) {
                          const updated = snap.data();
                          setGroupInfo(updated);
                          if (
                            !updated.miembros.includes(userData.username)
                          ) {
                            setKickedOut(true);
                            setTimeout(() => navigate("/chat"), 4000);
                          }
                        }
                      });
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                No hay mensajes aún. ¡Sé el primero en escribir!
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.from === userData.username;
                const canDelete = isMine || isAdmin;
                const photo = getPhoto(msg.from);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isMine ? "items-end" : "items-start"
                    } relative group`}
                  >
                    <div className="flex items-start gap-2 max-w-[85%]">
                      {!isMine && (
                        <div 
                          className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 mt-1 cursor-pointer hover:opacity-80"
                          onClick={() => setViewingProfile(msg.from)}
                        >
                          {photo ? (
                            <img
                              src={photo}
                              alt="pfp"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-gray-300">😶</div>
                          )}
                        </div>
                      )}

                      <div
                        className={`px-3 py-2 rounded-lg ${
                          isMine
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-700 text-gray-100"
                        }`}
                      >
                        {/* Nombre de usuario con badge de Staff */}
                        <div 
                          className="flex items-center mb-1 cursor-pointer"
                          onClick={() => setViewingProfile(msg.from)}
                        >
                          <p className={`text-sm font-medium ${isMine ? "text-indigo-200" : "text-gray-300"} hover:underline`}>
                            {msg.from}
                          </p>
                          <Staff username={msg.from} />
                        </div>
                        
                        {/* Mensaje citado con badge de Staff */}
                        {msg.replyTo && (
                          <div className={`text-xs italic border-l-2 pl-2 mb-2 ${isMine ? "border-indigo-400 text-indigo-200" : "border-gray-500 text-gray-300"}`}>
                            <div className="flex items-center">
                              <span>{msg.replyTo.from}</span>
                              <Staff username={msg.replyTo.from} className="w-3 h-3 ml-1" />
                              <span>: "{msg.replyTo.text.length > 30 ? msg.replyTo.text.substring(0, 30) + '...' : msg.replyTo.text}"</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Imagen */}
                        {msg.image && (
                          <div className="mb-2">
                            <img
                              src={msg.image}
                              alt="imagen"
                              className="rounded max-w-full max-h-60 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setPreviewImage(msg.image)}
                            />
                          </div>
                        )}
                        
                        {msg.text && (
                          <p className="break-words whitespace-pre-wrap">
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
                        <p className={`text-[10px] text-right mt-1 ${isMine ? "text-indigo-200 opacity-70" : "text-gray-400 opacity-70"}`}>
                          {msg.timestamp?.toDate
                            ? format(msg.timestamp.toDate(), "p")
                            : "..."}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => setReplyTo({ 
                            from: msg.from, 
                            text: msg.text || (msg.image ? "[Imagen]" : "") 
                          })}
                          title="Responder"
                          className="text-gray-500 hover:text-gray-300 bg-gray-800 p-1 rounded"
                        >
                          <MdReply size={16} />
                        </button>
                        
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(msg.id, msg.image)}
                            className="text-red-500 hover:text-red-400 bg-gray-800 p-1 rounded"
                            title="Eliminar"
                          >
                            <MdDelete size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollRef}></div>
          </div>

          {/* Mensaje citado */}
          {replyTo && (
            <div className="bg-gray-800 border-l-4 border-indigo-500 px-3 py-2 mx-4 mb-2 text-sm text-gray-300 rounded">
              <div className="flex items-center">
                Respondiendo a <strong className="mx-1 text-gray-200">{replyTo.from}</strong>
                <Staff username={replyTo.from} className="w-3 h-3 mr-1" />
                : "{replyTo.text.length > 40 ? replyTo.text.substring(0, 40) + '...' : replyTo.text}"
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="ml-2 text-red-400 text-xs hover:underline"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Input area with image preview */}
          <div className="bg-gray-800 border-t border-gray-700 p-3">
            {image && (
              <div className="mb-2 bg-gray-700 p-2 rounded text-sm text-gray-300 flex justify-between items-center">
                <span>
                  Imagen: <strong className="text-gray-200">{image.name}</strong> 
                  ({Math.round(image.size / 1024)} KB)
                </span>
                <button 
                  onClick={() => setImage(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <MdDelete />
                </button>
              </div>
            )}
            
            <div className="flex gap-2 items-center">
              <div className="flex space-x-1">
                <button
                  onClick={handleImageClick}
                  className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700"
                  title="Adjuntar imagen"
                >
                  <MdImage size={20} />
                </button>
                <button
                  className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700"
                  title="Insertar emoji"
                >
                  <MdEmojiEmotions size={20} />
                </button>
                <button
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
              
              <textarea
                type="text"
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px] max-h-24"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={kickedOut}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={(!text.trim() && !image) || kickedOut}
                className={`p-2 rounded-full ${
                  (!text.trim() && !image) || kickedOut
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                <MdSend size={20} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}