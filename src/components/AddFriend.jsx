import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/config";
import {
  getDocs, query, collection, where, addDoc
} from "firebase/firestore";
import { AiOutlineUserAdd } from "react-icons/ai";

export default function AddFriend() {
  const { userData } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [message, setMessage] = useState('');

  const handleSearch = async () => {
    setMessage('');
    setFoundUser(null);
    if (searchUsername === userData.username) {
      setMessage("No puedes enviarte una solicitud a ti misma.");
      return;
    }

    const q = query(collection(db, "users"), where("username", "==", searchUsername));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const userFound = snap.docs[0].data();

      // esto e pa verificar si ya son amigos
      if (userFound.friends?.includes(userData.username)) {
        setMessage("¡Ya son amigos!");
        return;
      }

      // verificar si ya hay solicitud pendiente
      const requests = await getDocs(
        query(
          collection(db, "friendRequests"),
          where("from", "==", userData.username),
          where("to", "==", searchUsername),
        )
      );
      if (!requests.empty) {
        setMessage("Ya enviaste una solicitud a esta persona.");
        return;
      }

      setFoundUser(userFound);
    } else {
      setMessage("No se encontró ese usuario.");
    }
  };

  const sendRequest = async () => {
    await addDoc(collection(db, "friendRequests"), {
      from: userData.username,
      to: searchUsername,
      status: "pending"
    });
    setMessage("Solicitud enviada ✅");
    setFoundUser(null);
    setSearchUsername('');
  };

  return (
    <div className="mb-4 text-center">
      
      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-blue-700"
      >
        <AiOutlineUserAdd /> Agregar amigo
      </button>

      {/* el tieto de modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-md shadow">
            <h2 className="text-xl font-bold mb-4 text-center">Agregar amigo</h2>

            <input
              type="text"
              className="w-full p-2 border rounded mb-2"
              placeholder="Nombre de usuario"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
            />

            <button
              onClick={handleSearch}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded w-full"
            >
              Buscar
            </button>

            {foundUser && (
              <div className="mt-4 bg-gray-100 p-3 rounded flex justify-between items-center">
                <span>{foundUser.username}</span>
                <button
                  onClick={sendRequest}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  Enviar solicitud
                </button>
              </div>
            )}

            {message && <p className="mt-3 text-center text-sm text-gray-600">{message}</p>}

            <div className="text-right mt-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSearchUsername('');
                  setFoundUser(null);
                  setMessage('');
                }}
                className="text-sm text-gray-500 hover:underline"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
