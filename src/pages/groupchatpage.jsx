import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import GroupChat from "../components/GroupChat";

export default function GroupChatPage() {
  const { userData } = useContext(AuthContext);
  const { groupId } = useParams();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyMembership = async () => {
      if (!userData) return;

      try {
        const ref = doc(db, "groups", groupId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const group = snap.data();

          if (group.miembros.includes(userData.username)) {
            setAllowed(true);
          } else {
            setAllowed(false);
            navigate("/chat", { replace: true });
          }
        } else {
          setAllowed(false);
          navigate("/chat", { replace: true });
        }
      } catch (error) {
        console.error("Error al verificar grupo:", error);
        setAllowed(false);
        navigate("/chat", { replace: true });
      } finally {
        setChecking(false);
      }
    };

    verifyMembership();
  }, [userData, groupId, navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-400">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Verificando acceso al grupo...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {allowed ? <GroupChat /> : null}
    </div>
  );
}