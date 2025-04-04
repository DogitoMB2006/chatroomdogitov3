import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { MdBlock, MdRemoveCircle } from "react-icons/md";
import { toast } from "react-toastify";

export default function BlockUser({ username, onBlockStatusChange }) {
  const { userData } = useContext(AuthContext);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Verificar si el usuario ya está bloqueado al cargar el componente
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!userData || !username) return;
      
      try {
        const blockDocRef = doc(db, "blockedUsers", `${userData.username}_${username}`);
        const blockDoc = await getDoc(blockDocRef);
        
        setIsBlocked(blockDoc.exists());
        
        // Notificar al componente padre del estado inicial
        if (onBlockStatusChange) {
          onBlockStatusChange(blockDoc.exists());
        }
      } catch (error) {
        console.error("Error al verificar estado de bloqueo:", error);
      }
    };

    checkBlockStatus();
  }, [userData, username, onBlockStatusChange]);

  const handleBlockUser = async () => {
    if (!userData || !username) return;
    
    setIsLoading(true);
    
    try {
      if (isBlocked) {
        // Desbloquear usuario
        await deleteDoc(doc(db, "blockedUsers", `${userData.username}_${username}`));
        setIsBlocked(false);
        toast.success(`Has desbloqueado a ${username}`);
        
        // Notificar al componente padre sobre el cambio
        if (onBlockStatusChange) {
          onBlockStatusChange(false);
        }
      } else {
        // Bloquear usuario
        await setDoc(doc(db, "blockedUsers", `${userData.username}_${username}`), {
          blocker: userData.username,
          blocked: username,
          timestamp: new Date().toISOString()
        });
        setIsBlocked(true);
        toast.success(`Has bloqueado a ${username}`);
        
        // Notificar al componente padre sobre el cambio
        if (onBlockStatusChange) {
          onBlockStatusChange(true);
        }
        
        // Redirigir al usuario a la página de chats
        navigate("/chat");
      }
    } catch (error) {
      console.error("Error al bloquear/desbloquear usuario:", error);
      toast.error("Error al procesar la solicitud. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      className={`w-full py-2 ${
        isBlocked 
          ? "bg-gray-600 hover:bg-gray-700" 
          : "bg-red-600 hover:bg-red-700"
      } rounded text-white transition-colors flex items-center justify-center space-x-2`}
      onClick={handleBlockUser}
      disabled={isLoading}
    >
      {isLoading ? (
        <span>Procesando...</span>
      ) : (
        <>
          {isBlocked ? (
            <>
              <MdRemoveCircle size={20} />
              <span>Desbloquear usuario</span>
            </>
          ) : (
            <>
              <MdBlock size={20} />
              <span>Bloquear usuario</span>
            </>
          )}
        </>
      )}
    </button>
  );
}