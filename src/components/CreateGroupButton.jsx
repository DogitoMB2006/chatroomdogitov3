import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/config";
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function CreateGroupButton() {
  const { userData } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFriends = async () => {
      if (!userData?.friends || userData.friends.length === 0) {
        setFriends([]);
        return;
      }
  
      const friendData = [];
  
      for (let uname of userData.friends) {
        const q = query(collection(db, "users"), where("username", "==", uname));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          friendData.push({ username: data.username, photoURL: data.photoURL || null });
        }
      }
  
      setFriends(friendData);
    };
  
    if (userData) fetchFriends();
  }, [userData]);
  
  const toggleSelect = (friend) => {
    setSelected((prev) =>
      prev.includes(friend)
        ? prev.filter((f) => f !== friend)
        : [...prev, friend]
    );
  };

  const handleCreate = async () => {
    const groupRef = await addDoc(collection(db, "groups"), {
      name: groupName,
      miembros: [userData.username, ...selected],
      admin: userData.username,
      timestamp: Timestamp.now()
    });

    setShowModal(false);
    setGroupName("");
    setSelected([]);
    setStep(1);
    navigate(`/chat/group/${groupRef.id}`);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
      >
        ➕ Crear grupo
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[90%] max-w-md rounded-lg shadow p-4 space-y-4">
            {step === 1 && (
              <>
                <h2 className="text-lg font-semibold">Selecciona amigos</h2>
                <div className="max-h-64 overflow-y-auto">
                {friends.map((f) => (
  <label key={f.username} className="flex items-center gap-2 py-1">
    <input
      type="checkbox"
      className="mr-2"
      checked={selected.includes(f.username)}
      onChange={() => toggleSelect(f.username)}
    />
    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-300">
      {f.photoURL ? (
        <img src={f.photoURL} alt="pfp" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">😶</div>
      )}
    </div>
    {f.username}
  </label>
))}

                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={selected.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Siguiente
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-lg font-semibold">Nombre del grupo</h2>
                <input
                  type="text"
                  placeholder="Ej: Panas del gym"
                  className="w-full border rounded px-3 py-2"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setStep(1)}
                    className="text-gray-500 hover:underline"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!groupName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Crear grupo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
