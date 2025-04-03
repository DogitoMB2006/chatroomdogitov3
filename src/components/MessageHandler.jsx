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
  doc
} from "firebase/firestore";
import { format } from "date-fns";

export default function MessageHandler({ receiver }) {
  const { userData } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const scrollRef = useRef();

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

        // esto es para Filtrar solo mensajes entre ambos
        const isBetween = (
          (data.from === userData.username && data.to === receiver) ||
          (data.from === receiver && data.to === userData.username)
        );

        if (isBetween) {
          // Si el mensaje es para mí y no está leído → marcarlo como leído
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
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[75%] px-3 py-2 rounded-lg relative group
              ${msg.from === userData.username
                ? 'bg-blue-500 text-white self-end ml-auto'
                : 'bg-gray-200 text-black self-start mr-auto'}`}
          >
            <p>{msg.text}</p>

        
            <span className="block text-[10px] mt-1 text-right opacity-70">
              {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'p') : '...'}
            </span>

          
            {msg.from !== userData.username && !msg.read && (
              <span
                className="absolute top-0 right-0 bg-red-500 w-2 h-2 rounded-full"
                title="No leído"
              ></span>
            )}
          </div>
        ))}
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
