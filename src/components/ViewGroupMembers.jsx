import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import {
  doc,
  updateDoc,
  arrayRemove,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { FaTimes, FaUserCircle, FaCrown, FaSignOutAlt } from "react-icons/fa";
import Staff from "../components/Staff";

export default function ViewGroupMembers({ groupInfo, groupId, onClose }) {
  const { userData } = useContext(AuthContext);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [membersData, setMembersData] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  

  const isAdmin = groupInfo?.admin === userData?.username;
  
 
  useEffect(() => {
    const fetchMembersData = async () => {
      if (!groupInfo || !groupInfo.miembros?.length) {
        setLoading(false);
        return;
      }
      
      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("username", "in", groupInfo.miembros)
        );
        
        const snap = await getDocs(q);
        const memberProfiles = {};
        
        snap.docs.forEach(doc => {
          const data = doc.data();
          memberProfiles[data.username] = data;
        });
        
        setMembersData(memberProfiles);
      } catch (error) {
        console.error("Error al cargar perfiles de miembros:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMembersData();
  }, [groupInfo]);
  

  const getProfilePhoto = (username) => {
    return membersData[username]?.photoURL || null;
  };
  

  const handleLeaveGroup = async () => {
    if (isAdmin) {
    
      alert("Eres el administrador del grupo. No puedes salir sin eliminar el grupo o transferir la administración.");
      return;
    }
    
    const confirmLeave = window.confirm("¿Estás seguro que deseas salir del grupo?");
    if (!confirmLeave) return;
    
    setLeavingGroup(true);
    
    try {
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        miembros: arrayRemove(userData.username)
      });
      
    
      navigate("/chat");
    } catch (error) {
      console.error("Error al salir del grupo:", error);
      alert("Error al salir del grupo: " + error.message);
      setLeavingGroup(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div 
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
  
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-full z-10"
        >
          <FaTimes size={18} />
        </button>
        
        
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 rounded-t-lg">
          <h2 className="text-xl font-bold text-white">Miembros del grupo</h2>
          <p className="text-indigo-200 mt-1">{groupInfo?.name || "Cargando..."}</p>
          <div className="text-indigo-200 text-sm mt-1">
            {groupInfo?.miembros?.length || 0} participantes
          </div>
        </div>
        
       
        <div className="max-h-72 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : groupInfo?.miembros?.length > 0 ? (
            <ul className="space-y-3">
            
              {groupInfo.miembros
                .filter(member => member === groupInfo.admin)
                .map((member) => {
                  const photoURL = getProfilePhoto(member);
                  
                  return (
                    <li key={member} className="flex items-center bg-indigo-900 bg-opacity-20 p-3 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 mr-3">
                        {photoURL ? (
                          <img 
                            src={photoURL} 
                            alt={`${member} profile`} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FaUserCircle size={24} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-200">{member}</span>
                          <Staff username={member} />
                          <span className="ml-2 bg-indigo-600 text-xs px-2 py-0.5 rounded-full flex items-center">
                            <FaCrown className="mr-1" size={10} />
                            Admin
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              
        
              {groupInfo.miembros
                .filter(member => member !== groupInfo.admin)
                .map((member) => {
                  const photoURL = getProfilePhoto(member);
                  
                  return (
                    <li key={member} className="flex items-center hover:bg-gray-700 hover:bg-opacity-30 p-3 rounded-lg transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 mr-3">
                        {photoURL ? (
                          <img 
                            src={photoURL} 
                            alt={`${member} profile`} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FaUserCircle size={24} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-200">{member}</span>
                          <Staff username={member} />
                          {member === userData.username && (
                            <span className="ml-2 bg-gray-600 text-xs px-2 py-0.5 rounded-full">
                              Tú
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p className="text-center text-gray-400 py-4">No hay miembros en este grupo.</p>
          )}
        </div>
        
    
        {!isAdmin && (
          <div className="border-t border-gray-700 p-4">
            <button
              onClick={handleLeaveGroup}
              disabled={leavingGroup}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {leavingGroup ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Saliendo...
                </>
              ) : (
                <>
                  <FaSignOutAlt className="mr-2" />
                  Salir del grupo
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}