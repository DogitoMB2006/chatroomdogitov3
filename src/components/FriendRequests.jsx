import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/config";
import {
  getDocs, query, collection, where, updateDoc, doc, deleteDoc
} from "firebase/firestore";
import { FaInbox } from "react-icons/fa";

export default function FriendRequests() {
  const { userData } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    const q = query(
      collection(db, "friendRequests"),
      where("to", "==", userData.username),
      where("status", "==", "pending")
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setRequests(list);
  };

  useEffect(() => {
    if (showModal) {
      fetchRequests();
    }
  }, [showModal]);

  const handleAccept = async (req) => {
    const ref = doc(db, "friendRequests", req.id);


    await updateDoc(ref, { status: "accepted" });


    const usersRef = collection(db, "users");

    const q1 = query(usersRef, where("username", "==", userData.username));
    const q2 = query(usersRef, where("username", "==", req.from));

    const [meSnap, senderSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);

    if (!meSnap.empty && !senderSnap.empty) {
      const meDoc = meSnap.docs[0];
      const senderDoc = senderSnap.docs[0];

      const meFriends = meDoc.data().friends || [];
      const senderFriends = senderDoc.data().friends || [];

      await updateDoc(doc(db, "users", meDoc.id), {
        friends: [...new Set([...meFriends, req.from])]
      });

      await updateDoc(doc(db, "users", senderDoc.id), {
        friends: [...new Set([...senderFriends, userData.username])]
      });

      fetchRequests(); 
    }
  };

  const handleReject = async (req) => {
    await deleteDoc(doc(db, "friendRequests", req.id));
    fetchRequests();
  };

  return (
    <div className="text-center">
    
      <button
        onClick={() => setShowModal(true)}
        className="mt-2 text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
      >
        <FaInbox /> Ver solicitudes
      </button>

      
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-md shadow">
            <h2 className="text-xl font-bold mb-4 text-center">Solicitudes recibidas</h2>

            {requests.length === 0 ? (
              <p className="text-center text-gray-500">No tienes solicitudes pendientes.</p>
            ) : (
              <ul className="space-y-3">
                {requests.map((req) => (
                <li
                key={req.id}
                className="flex justify-between items-center bg-gray-100 p-2 rounded gap-3"
              >
             
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
                  {req.photoURL ? (
                    <img src={req.photoURL} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">😶</div>
                  )}
                </div>
              
              
                <div className="flex justify-between items-center w-full">
                  <span>{req.from}</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleAccept(req)}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </li>
              
                
                ))}
              </ul>
            )}

            <div className="text-right mt-4">
              <button
                onClick={() => setShowModal(false)}
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
