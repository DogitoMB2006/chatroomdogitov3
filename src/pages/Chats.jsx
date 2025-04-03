import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate, Link } from "react-router-dom";
import AddFriend from "../components/AddFriend";
import FriendRequests from "../components/FriendRequests";
import CreateGroupButton from "../components/CreateGroupButton";

export default function Chats() {
  const { user, userData } = useContext(AuthContext);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
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
          friendData.push(snapshot.docs[0].data());
        }
      }

      setFriends(friendData);
    };

    if (userData) {
      fetchFriends();
    }
  }, [userData]);

  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, "groups"),
      where("miembros", "array-contains", userData.username)
    );

    const unsub = onSnapshot(q, (snap) => {
      const results = [];
      snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
      setGroups(results);
    });

    return () => unsub();
  }, [userData]);

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
        <AddFriend />
        <FriendRequests />
        <CreateGroupButton />
      </div>

      <h2 className="text-2xl font-bold mb-4 text-center">Tus amigos</h2>

      <div className="max-w-md mx-auto bg-white shadow rounded p-4 space-y-2">
        {friends.map((f, index) => (
          <div
            key={index}
            onClick={() => navigate(`/chat/${f.username}`)}
            className="cursor-pointer px-4 py-2 rounded hover:bg-gray-200 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
              {f.photoURL ? (
                <img src={f.photoURL} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                  😶
                </div>
              )}
            </div>
            <div className="flex justify-between items-center w-full">
              <span>{f.username}</span>
              <span className="text-xs text-gray-400">Ver chat</span>
            </div>
          </div>
        ))}
        {friends.length === 0 && (
          <p className="text-center text-gray-500">No tienes amigos agregados todavía.</p>
        )}
      </div>

      {groups.length > 0 && (
        <div className="max-w-md mx-auto mt-8 bg-white shadow rounded p-4 space-y-2">
          <h2 className="text-lg font-semibold mb-2">📁 Grupos</h2>
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/chat/group/${group.id}`}
              className="block px-4 py-2 rounded hover:bg-gray-200"
            >
              {group.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
