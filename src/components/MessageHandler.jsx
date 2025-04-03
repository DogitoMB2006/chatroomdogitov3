import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/config";
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
  getDocs
} from "firebase/firestore";
import { format } from "date-fns";

export default function MessageHandler({ receiver }) {
  const { userData } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const scrollRef = useRef();
  const [receiverData, setReceiverData] = useState(null);

  useEffect(() => {
    // Obtener la foto del receptor
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
          filtered.push(data);
        }
      }

      setMessages(filtered);
    });

    return () => unsub();
  }, [userData, receiver]);

  const sendMessage = async () => {
    if (text.trim() === '') return;

    await addDoc(collection(db, "messages"), {
      from: userData.username,
      to: receiver,
      text: text.trim(),
      timestamp: serverTimestamp(),
      participants: [userData.username, receiver],
      read: false
    });

    setText('');
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="flex flex-col h-[60vh] max-w-xl mx-auto bg-white shadow rounded">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => {
          const isMine = msg.from === userData.username;
          const photoURL = isMine
            ? userData?.photoURL
            : receiverData?.photoURL;

          return (
            <div
              key={idx}
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
                className={`max-w-[75%] px-3 py-2 rounded-lg relative
                  ${isMine
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-black'
                  }`}
              >
                <p>{msg.text}</p>
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

      <div className="border-t p-2 flex gap-2">
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
    </div>
  );
}
