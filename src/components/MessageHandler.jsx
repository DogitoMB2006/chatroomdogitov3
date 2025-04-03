// ... imports igual que antes
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
import { MdImage } from "react-icons/md";

export default function MessageHandler({ receiver }) {
  const { userData } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [receiverData, setReceiverData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const scrollRef = useRef();

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

          // 👇 Aquí agregamos los logs de depuración
          if (data.to === userData.username && data.from !== receiver) {
            console.log("🔎 Estado para notificación:");
            console.log("➡️ Es mensaje de otra persona:", data.from !== receiver);
            console.log("➡️ Es para mí:", data.to === userData.username);
            console.log("➡️ Permiso:", Notification.permission);
            console.log("➡️ Visibilidad:", document.visibilityState);
          }

          if (
            data.from !== receiver &&
            data.to === userData.username &&
            Notification.permission === "granted" &&
            document.visibilityState === "visible"
          ) {
            console.log("📢 Mostrando notificación de:", data.from, data.text);
            new Notification(`Mensaje de ${data.from}`, {
              body: data.text || "📷 Imagen",
              icon: "/logo192.png"
            });
          }

          filtered.push({ ...data, id: docSnap.id });
        }
      }

      setMessages(filtered);
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
      read: false
    });

    setText('');
    setImage(null);
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const handleDelete = async (msg) => {
    const confirm = window.confirm("¿Eliminar este mensaje con imagen?");
    if (!confirm) return;

    try {
      if (msg.image) {
        const imagePath = decodeURIComponent(new URL(msg.image).pathname.split("/o/")[1]);
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
      }
      await deleteDoc(doc(db, "messages", msg.id));
    } catch (err) {
      alert("Error al eliminar imagen: " + err.message);
    }
  };

  return (
    <div className="flex flex-col h-[60vh] max-w-xl mx-auto bg-white shadow rounded">
      {/* Modal de vista previa */}
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
              }`}
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
                className={`max-w-[75%] px-3 py-2 rounded-lg relative group
                  ${isMine
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-black'
                  }`}
              >
                {/* Imagen si hay */}
                {msg.image && (
                  <div className="relative group">
                    <img
                      src={msg.image}
                      alt="media"
                      className="mb-2 rounded max-w-full max-h-48 border border-gray-300 cursor-pointer hover:brightness-90"
                      onClick={() => setPreviewImage(msg.image)}
                    />
                    {isMine && (
                      <button
                        onClick={() => handleDelete(msg)}
                        className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1 rounded opacity-80 hover:opacity-100"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                )}

                {/* Texto con links */}
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

      {/* Entrada de texto con ícono y botón */}
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
