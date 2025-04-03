import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/config";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { FaUserPlus } from "react-icons/fa";

export default function AddFriend({ className }) {
  const { userData } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const resetState = () => {
    setUsername("");
    setError("");
    setSuccess(false);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!username.trim()) {
      setError("Por favor ingresa un nombre de usuario");
      setLoading(false);
      return;
    }

    try {
    
      if (username === userData.username) {
        setError("No puedes agregarte a ti mismo");
        setLoading(false);
        return;
      }

 
      const q = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("El usuario no existe");
        setLoading(false);
        return;
      }


      if (userData.friends && userData.friends.includes(username)) {
        setError("Ya son amigos");
        setLoading(false);
        return;
      }

  
      const q2 = query(
        collection(db, "friendRequests"),
        where("from", "==", userData.username),
        where("to", "==", username),
        where("status", "==", "pending")
      );
      const snapshot2 = await getDocs(q2);

      if (!snapshot2.empty) {
        setError("Ya enviaste una solicitud a ese usuario");
        setLoading(false);
        return;
      }

      const requestData = {
        from: userData.username,
        to: username,
        status: "pending",
        timestamp: serverTimestamp()
      };
      

      if (userData.photoURL) {
        requestData.photoURL = userData.photoURL;
      }

      await addDoc(collection(db, "friendRequests"), requestData);

      setSuccess(true);
      setUsername("");
    } catch (error) {
      console.error("Error al enviar solicitud:", error);
      setError("Error al enviar solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (className) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={className}
          title="Agregar amigo"
        >
          <FaUserPlus size={20} />
        </button>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg w-full max-w-md shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-gray-100">Agregar un amigo</h2>

              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                {success && (
                  <p className="text-green-400 text-sm mb-2">
                    Solicitud enviada correctamente
                  </p>
                )}

                <div className="flex justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetState();
                    }}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {loading ? "Enviando..." : "Enviar solicitud"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  
  return (
    <div className="text-center">
      <button
        onClick={() => setShowModal(true)}
        className="mt-2 text-blue-500 hover:text-blue-400 flex items-center justify-center gap-1"
      >
        <FaUserPlus /> Agregar amigo
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-100">Agregar un amigo</h2>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Nombre de usuario"
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
              {success && (
                <p className="text-green-400 text-sm mb-2">
                  Solicitud enviada correctamente
                </p>
              )}

              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetState();
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}