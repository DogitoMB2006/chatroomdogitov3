import { useEffect, useState, useContext } from "react";
import { db } from "../firebase/config";
import {
  doc,
  updateDoc,
  getDoc,
  query,
  deleteDoc,
  writeBatch,
  collection,
  where,
  getDocs
} from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { MdSettings, MdPersonRemove } from "react-icons/md";

export default function GroupSettings({ groupId, groupInfo, onChange }) {
  const { userData } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [friendsToAdd, setFriendsToAdd] = useState([]);

  const isAdmin = groupInfo?.admin === userData.username;

  useEffect(() => {
    const fetchEligibleFriends = async () => {
      const currentMembers = groupInfo?.miembros || [];
      const eligible = [];

      for (let uname of userData.friends || []) {
        if (!currentMembers.includes(uname)) {
          const q = query(collection(db, "users"), where("username", "==", uname));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            eligible.push({ username: data.username, photoURL: data.photoURL || null });
          }
        }
      }

      setFriendsToAdd(eligible);
    };

    if (showModal) fetchEligibleFriends();
  }, [showModal, groupInfo, userData]);

  const handleRemove = async (uname) => {
    const confirm = window.confirm(`¿Eliminar a ${uname} del grupo?`);
    if (!confirm) return;

    const groupRef = doc(db, "groups", groupId);
    const updated = groupInfo.miembros.filter((u) => u !== uname);

    await updateDoc(groupRef, { miembros: updated });

    // Callback opcional para refrescar
    onChange && onChange();
  };

  const handleAdd = async (uname) => {
    const confirm = window.confirm(`¿Agregar a ${uname} al grupo?`);
    if (!confirm) return;

    const groupRef = doc(db, "groups", groupId);
    const updated = [...groupInfo.miembros, uname];

    await updateDoc(groupRef, { miembros: updated });

    // Refrescar posibles amigos
    setFriendsToAdd((prev) => prev.filter((f) => f.username !== uname));
    onChange && onChange();
  };

  if (!isAdmin) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Configuración del grupo"
        className="text-gray-600 hover:text-gray-800 ml-2"
      >
        <MdSettings size={22} />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md space-y-4">
            <h2 className="text-xl font-semibold mb-2">👥 Miembros del grupo</h2>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {groupInfo.miembros.map((member) => (
                <li key={member} className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded">
                  <span>{member}</span>
                  {member !== userData.username && (
                    <button
                      onClick={() => handleRemove(member)}
                      className="text-red-500 hover:text-red-700"
                      title="Eliminar"
                    >
                      <MdPersonRemove size={18} />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <div>
              <h3 className="mt-4 mb-2 font-semibold">➕ Agregar amigos</h3>
              {friendsToAdd.length === 0 ? (
                <p className="text-sm text-gray-500">No hay amigos disponibles para agregar.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {friendsToAdd.map((f) => (
                    <li key={f.username} className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-300">
                          {f.photoURL ? (
                            <img src={f.photoURL} alt="pfp" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">😶</div>
                          )}
                        </div>
                        <span>{f.username}</span>
                      </div>
                      <button
                        onClick={() => handleAdd(f.username)}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Agregar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="text-right">
            {isAdmin && (
  <div className="mt-4 text-right">
    <button
      onClick={async () => {
        const confirm = window.confirm("¿Estás seguro de eliminar este grupo?");
        if (!confirm) return;

        try {
          // Eliminar grupo
          await deleteDoc(doc(db, "groups", groupId));

          // Eliminar todos los mensajes del grupo
          const q = query(collection(db, "groupMessages", groupId, "messages"));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.forEach((docu) => batch.delete(docu.ref));
          await batch.commit();

          alert("Grupo eliminado correctamente.");
          window.location.href = "/chat";
        } catch (err) {
          alert("Error al eliminar grupo: " + err.message);
        }
      }}
      className="text-red-600 hover:text-red-800 font-semibold text-sm"
    >
      🗑️ Eliminar grupo
    </button>
  </div>
)}

              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
