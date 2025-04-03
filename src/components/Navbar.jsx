import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { auth } from "../firebase/config";
import { 
  MdHome, 
  MdChat, 
  MdLogout, 
  MdLogin, 
  MdPersonAdd, 
  MdMenuOpen,
  MdClose,
  MdNotifications,
  MdSettings
} from "react-icons/md";
import Staff from "./Staff";

export default function Navbar() {
  const { user, userData } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const isActive = (path) => {
    return location.pathname === path ? "text-indigo-400" : "text-gray-400";
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  return (
    <nav className="bg-gray-900 text-white border-b border-gray-800 px-4 py-2 flex justify-between items-center shadow-md z-10">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Link to="/" className="font-bold text-xl text-indigo-400 flex items-center">
          DogiCord
        </Link>
      </div>

    
      <div className="hidden md:flex items-center space-x-6">
        <Link to="/" className={`flex items-center gap-1 hover:text-indigo-400 transition-colors ${isActive('/')}`}>
          <MdHome size={20} />
          <span>Inicio</span>
        </Link>

        {user && (
          <Link to="/chat" className={`flex items-center gap-1 hover:text-indigo-400 transition-colors ${isActive('/chat')}`}>
            <MdChat size={20} />
            <span>Chat</span>
          </Link>
        )}

        {!user && (
          <>
            <Link to="/login" className={`flex items-center gap-1 hover:text-indigo-400 transition-colors ${isActive('/login')}`}>
              <MdLogin size={20} />
              <span>Login</span>
            </Link>
            
            <Link to="/register" className={`flex items-center gap-1 hover:text-indigo-400 transition-colors ${isActive('/register')}`}>
              <MdPersonAdd size={20} />
              <span>Registro</span>
            </Link>
          </>
        )}
      </div>


      <div className="flex items-center space-x-3">
        {user && (
          <>
          
            <button className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800">
              <MdNotifications size={20} />
            </button>
            
           
            <button className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800">
              <MdSettings size={20} />
            </button>
            
        
            <div className="relative">
              <div
                onClick={toggleUserMenu}
                className="w-9 h-9 rounded-full overflow-hidden bg-gray-700 cursor-pointer border border-gray-600 hover:border-indigo-500 transition-colors"
                title="Perfil"
              >
                {userData?.photoURL ? (
                  <img
                    src={userData.photoURL}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                    😶
                  </div>
                )}
              </div>
              
           
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg overflow-hidden z-20 animate-fade-in-down">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-sm text-gray-200 font-medium flex items-center">
                      {userData?.username || user.email}
                      <Staff username={userData?.username} />
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-1">{user.email}</p>
                  </div>
                  
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate("/editprofile");
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                    >
                      Editar perfil
                    </button>
                    
                    <button
                      onClick={() => {
                        handleLogout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <MdLogout size={16} />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

       
        <button
          className="md:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800"
          onClick={toggleMobileMenu}
        >
          {mobileMenuOpen ? <MdClose size={24} /> : <MdMenuOpen size={24} />}
        </button>
      </div>

   
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 bg-gray-900 z-10 animate-fade-in-down">
          <div className="flex flex-col p-4 space-y-4">
            <Link 
              to="/" 
              className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-800 ${isActive('/')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <MdHome size={24} />
              <span>Inicio</span>
            </Link>

            {user && (
              <Link 
                to="/chat" 
                className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-800 ${isActive('/chat')}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MdChat size={24} />
                <span>Chat</span>
              </Link>
            )}

            {!user && (
              <>
                <Link 
                  to="/login" 
                  className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-800 ${isActive('/login')}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MdLogin size={24} />
                  <span>Login</span>
                </Link>
                
                <Link 
                  to="/register" 
                  className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-800 ${isActive('/register')}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MdPersonAdd size={24} />
                  <span>Registro</span>
                </Link>
              </>
            )}

            {user && (
              <>
                <Link 
                  to="/editprofile" 
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-800 text-gray-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700">
                    {userData?.photoURL ? (
                      <img
                        src={userData.photoURL}
                        alt="profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                        😶
                      </div>
                    )}
                  </div>
                  <span>Editar perfil</span>
                </Link>
                
                <button 
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-800 text-red-400 w-full text-left"
                >
                  <MdLogout size={24} />
                  <span>Cerrar sesión</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}