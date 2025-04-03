import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { auth } from "../firebase/config";

export default function Navbar() {
  const { user, userData } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <span className="font-bold text-lg">Chatroom</span>

      <div className="flex items-center space-x-4">
        <Link to="/" className="hover:underline">Inicio</Link>

        {!user && (
          <>
            <Link to="/login" className="hover:underline">Login</Link>
            <Link to="/register" className="hover:underline">Registro</Link>
          </>
        )}

        {user && (
          <>
            <Link to="/chat" className="hover:underline">Chat</Link>

            {/* pa la Foto de perfil */}
            <div
              onClick={() => navigate("/editprofile")}
              className="w-10 h-10 rounded-full overflow-hidden bg-white cursor-pointer border border-gray-300"
              title="Editar perfil"
            >
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  Foto
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm"
            >
              Cerrar sesión
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
