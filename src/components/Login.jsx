import { useState } from "react";
import { auth } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { MdLock, MdEmail, MdArrowForward } from "react-icons/md";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/chat");
    } catch (error) {
      console.error("Error de inicio de sesión:", error);
      
      // Mostrar mensaje de error más amigable según el código
      switch(error.code) {
        case 'auth/invalid-credential':
          setError('Correo o contraseña incorrectos');
          break;
        case 'auth/user-not-found':
          setError('No existe una cuenta con este correo');
          break;
        case 'auth/wrong-password':
          setError('Contraseña incorrecta');
          break;
        default:
          setError('Error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 relative">
        {/* Círculos decorativos con gradiente */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full opacity-10 blur-xl"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full opacity-10 blur-xl"></div>
        
        {/* Card principal */}
        <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700 p-8 relative z-10">
          {/* Encabezado */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-full mb-4">
              <MdLock className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Iniciar Sesión
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Ingresa tus datos para continuar
            </p>
          </div>
          
          {/* Formulario */}
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {/* Mostrar error si existe */}
            {error && (
              <div className="bg-red-900/30 text-red-400 px-4 py-3 rounded-lg text-sm border border-red-800">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              {/* Campo de Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MdEmail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-3 py-3 rounded-lg"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              
              {/* Campo de Contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MdLock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-3 py-3 rounded-lg"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Botón de inicio de sesión */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition hover:shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2">Iniciando sesión...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span>Iniciar Sesión</span>
                    <MdArrowForward className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </div>
          </form>
          
          {/* Enlace a registro */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              ¿No tienes una cuenta?{" "}
              <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300 transition">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}