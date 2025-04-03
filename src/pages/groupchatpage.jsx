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
      <div className="min-h-screen flex items-center justify-center text-gray-500 bg-gray-900">
        Verificando acceso al grupo...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {allowed ? <GroupChat /> : null}
    </div>
  );
}