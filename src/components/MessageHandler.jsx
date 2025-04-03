// ... imports igual que ya tienes
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
  deleteDoc
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { format } from "date-fns";
import { MdImage, MdDelete, MdReply } from "react-icons/md"; // Añadido MdReply

export default function MessageHandler({ receiver }) {
  const { userData } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [receiverData, setReceiverData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const scrollRef = useRef();
  const [replyTo, setReplyTo] = useState(null);

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
    if (!userData) return;

    const messagesRef = collection(db, "messages");

    const q = query(
      messagesRef,
      where("participants", "array-contains", userData.username),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const filtered = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        const isBetween =
          (data.from === userData.username && data.to === receiver) ||
          (data.from === receiver && data.to === userData.username);

        if (isBetween) {
          if (data.to === userData.username && !data.read) {
            await updateDoc(doc(db, "messages", docSnap.id), { read: true });
          }

          filtered.push({ ...data, id: docSnap.id });
        }
      }

      setMessages(filtered);

      // Auto-scroll al último mensaje al cargar
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    });

    return () => unsub();
  }, [userData, receiver]);

  const sendMessage = async () => {
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
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
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

  return (
    <div className="flex flex-col h-[60vh] max-w-xl mx-auto bg-white shadow rounded">
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
        >
          <img
            src={previewImage}
            alt="Vista previa"
            className="max-w-[90%] max-h-[90%] rounded shadow-lg"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => {
          const isMine = msg.from === userData.username;
          const photoURL = isMine ? userData?.photoURL : receiverData?.photoURL;
          
          return (
            <div
              key={msg.id || idx}
              className={`flex items-end gap-2 ${
                isMine ? 'justify-end' : 'justify-start'
              } group`}
            >
              {!isMine && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
                  {photoURL ? (
                    <img src={photoURL} alt="pfp" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">😶</div>
                  )}
                </div>
              )}

              <div
                className={`max-w-[75%] px-3 py-2 rounded-lg relative
                  ${isMine
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-black'
                  }`}
              >
                {/* Mensaje al que se responde */}
                {msg.replyTo && (
                  <div className="text-xs italic border-l-2 pl-2 mb-1 opacity-75">
                    <span className="font-semibold">{msg.replyTo.from}:</span> "{msg.replyTo.text}"
                  </div>
                )}

                {msg.image && (
                  <img
                    src={msg.image}
                    alt="media"
                    className="mb-2 rounded max-w-full max-h-48 border border-gray-300 cursor-pointer hover:brightness-90"
                    onClick={() => setPreviewImage(msg.image)}
                  />
                )}

                {msg.text && (
                  <p className="break-words">
                    {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                      part.match(/^https?:\/\/[^\s]+$/) ? (
                        <a
                          key={i}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-300 underline"
                        >
                          {part}
                        </a>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </p>
                )}

                <span className="block text-[10px] mt-1 text-right opacity-70">
                  {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'p') : '...'}
                </span>

                {msg.from !== userData.username && !msg.read && (
                  <span className="absolute top-0 right-0 bg-red-500 w-2 h-2 rounded-full" title="No leído"></span>
                )}
              </div>

              {/* Botones de acción al lado del texto */}
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => setReplyTo({ from: msg.from, text: msg.text || (msg.image ? "[Imagen]" : "") })}
                  className="bg-blue-100 text-blue-700 p-1 rounded hover:bg-blue-200"
                  title="Responder"
                >
                  <MdReply size={16} />
                </button>
                
                {isMine && (
                  <button
                    onClick={() => handleDelete(msg)}
                    className="bg-red-100 text-red-700 p-1 rounded hover:bg-red-200"
                    title="Eliminar mensaje"
                  >
                    <MdDelete size={16} />
                  </button>
                )}
              </div>

              {isMine && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
                  {photoURL ? (
                    <img src={photoURL} alt="pfp" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">😶</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={scrollRef}></div>
      </div>

      {/* Mensaje de respuesta justo arriba del input */}
      {replyTo && (
        <div className="bg-gray-100 border-l-4 border-blue-500 px-3 py-2 mx-2 mt-2 mb-1 text-sm rounded flex justify-between items-center">
          <div>
            Respondiendo a <strong>{replyTo.from}</strong>: "{replyTo.text}"
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-red-500 text-xs hover:underline"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Entrada de texto */}
      <div className="border-t p-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="imageInput" className="text-blue-600 hover:text-blue-800 text-2xl cursor-pointer">
            <MdImage title="Adjuntar imagen" />
          </label>
          <input
            type="file"
            id="imageInput"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="hidden"
          />

          <input
            type="text"
            placeholder="Escribe un mensaje..."
            className="flex-1 border rounded px-3 py-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Enviar
          </button>
        </div>

        {image && (
          <p className="text-sm text-gray-500 mt-1">
            Imagen seleccionada: <strong>{image.name}</strong>
          </p>
        )}
      </div>
    </div>
  );
}