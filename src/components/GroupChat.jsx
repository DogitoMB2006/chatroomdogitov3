import { useEffect, useState, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
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
import { AuthContext } from "../context/AuthContext";
import { format } from "date-fns";
import { MdDelete, MdReply } from "react-icons/md";
import GroupSettings from "./GroupSettings";

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

  // 🔁 Cargar perfiles de los miembros
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

  // ✅ Obtener foto del usuario
  const getPhoto = (username) => {
    return usersData.find((u) => u.username === username)?.photoURL || null;
  };

  const handleSend = async () => {
    if (!text.trim()) return;

    await addDoc(collection(db, "groupMessages", groupId, "messages"), {
      from: userData.username,
      text,
      timestamp: serverTimestamp(),
      replyTo: replyTo ? { from: replyTo.from, text: replyTo.text } : null
    });

    setText("");
    setReplyTo(null);
  };

  const handleDelete = async (msgId) => {
    const confirm = window.confirm("¿Eliminar este mensaje?");
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "groupMessages", groupId, "messages", msgId));
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded shadow min-h-[60vh] flex flex-col">
      {kickedOut ? (
        <div className="text-center text-red-600 font-semibold mt-20">
          Ya no eres parte de este grupo. Serás redirigido en unos segundos...
        </div>
      ) : (
        <>
          {/* Encabezado fijo */}
          <div className="sticky top-0 z-10 bg-white border-b py-2">
            <div className="flex justify-center items-center gap-2">
              <h2 className="text-xl font-semibold">
                Grupo: {groupInfo?.name || "Cargando..."}
              </h2>
              {groupInfo && (
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

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto h-[55vh] px-1 space-y-2">
            {messages.map((msg) => {
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
                  <div className="flex items-center gap-2">
                    {!isMine && (
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                        {photo ? (
                          <img
                            src={photo}
                            alt="pfp"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-sm text-center mt-1">😶</div>
                        )}
                      </div>
                    )}

                    <div
                      className={`px-3 py-2 rounded-lg max-w-[75%] ${
                        isMine
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-black"
                      }`}
                    >
                      <p className="text-sm font-semibold mb-1">{msg.from}</p>
                      {msg.replyTo && (
                        <div className="text-xs italic border-l-2 pl-2 mb-1 text-gray-600">
                          {msg.replyTo.from}: "{msg.replyTo.text}"
                        </div>
                      )}
                      <p className="break-words">{msg.text}</p>
                      <p className="text-[10px] text-right mt-1 opacity-70">
                        {msg.timestamp?.toDate
                          ? format(msg.timestamp.toDate(), "p")
                          : "..."}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setReplyTo({ from: msg.from, text: msg.text })
                        }
                        title="Responder"
                        className="opacity-0 group-hover:opacity-100 transition text-gray-500 hover:text-gray-700"
                      >
                        <MdReply size={18} />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition"
                          title="Eliminar"
                        >
                          <MdDelete size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef}></div>
          </div>

          {/* Mensaje citado */}
          {replyTo && (
            <div className="bg-gray-100 border-l-4 border-blue-500 px-2 py-1 mb-2 text-sm text-gray-700 rounded">
              Respondiendo a <strong>{replyTo.from}</strong>: "{replyTo.text}"
              <button
                onClick={() => setReplyTo(null)}
                className="ml-2 text-red-500 text-xs hover:underline"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Input */}
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              className="flex-1 border rounded px-3 py-2"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={kickedOut}
            />
            <button
              onClick={handleSend}
              disabled={kickedOut}
              className={`px-4 py-2 rounded ${
                kickedOut
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Enviar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
