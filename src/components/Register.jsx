import { useState, useEffect } from "react";
import { auth, db } from "../firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { 
  MdCheck, 
  MdClose, 
  MdEmail, 
  MdLock, 
  MdPerson,
  MdArrowForward
} from "react-icons/md";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verificar disponibilidad del nombre de usuario
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const q = query(collection(db, "users"), where("username", "==", username));
        const snapshot = await getDocs(q);
        setUsernameAvailable(snapshot.empty);
      } catch (err) {
        console.error("Error al verificar nombre de usuario:", err);
      } finally {
        setCheckingUsername(false);
      }
    }, 700); 
    
    return () => clearTimeout(delayDebounce);
  }, [username]);

  // Calcular fortaleza de la contraseña
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    
    // Longitud mínima
    if (password.length >= 8) strength += 1;
    
    // Contiene números
    if (/\d/.test(password)) strength += 1;
    
    // Contiene letras minúsculas y mayúsculas
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    
    // Contiene caracteres especiales
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [password]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (!usernameAvailable) {
      setError("Ese nombre de usuario ya está en uso");
      setLoading(false);
      return;
    }

    if (username.length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres");
      setLoading(false);
      return;
    }

    try {
      // Crear cuenta de usuario
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Guardar información adicional del usuario
      await setDoc(doc(db, "users", user.uid), {
        email,
        username,
        joinDate: new Date(),
        online: true,
        friends: []
      });

      // Redirigir al chat
      navigate("/chat");
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      
      // Mostrar mensaje de error amigable según el código
      switch(error.code) {
        case 'auth/email-already-in-use':
          setError('Ya existe una cuenta con este correo electrónico');
          break;
        case 'auth/invalid-email':
          setError('El formato del correo electrónico no es válido');
          break;
        case 'auth/weak-password':
          setError('La contraseña es demasiado débil');
          break;
        default:
          setError('Error al crear la cuenta. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para renderizar indicador de fortaleza de contraseña
  const renderPasswordStrength = () => {
    if (!password) return null;
    
    const getColorClass = () => {
      switch (passwordStrength) {
        case 0: return "bg-red-600";
        case 1: return "bg-red-500";
        case 2: return "bg-yellow-500";
        case 3: return "bg-green-400";
        case 4: return "bg-green-500";
        default: return "bg-gray-400";
      }
    };
    
    return (
      <div className="mt-1">
        <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColorClass()} transition-all duration-300`} 
            style={{ width: `${(passwordStrength / 4) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Débil</span>
          <span>{['Débil', 'Aceptable', 'Buena', 'Fuerte', 'Excelente'][passwordStrength]}</span>
          <span>Fuerte</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 relative">
        {/* Decoraciones gráficas */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full opacity-10 blur-xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full opacity-10 blur-xl"></div>
        
        {/* Card principal */}
        <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700 p-8 relative z-10">
          {/* Encabezado */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-full mb-4">
              <MdPerson className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Crear Cuenta
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Únete a DogiCord para chatear con amigos
            </p>
          </div>
          
          {/* Formulario */}
          <form className="mt-6 space-y-5" onSubmit={handleRegister}>
            {/* Mostrar error si existe */}
            {error && (
              <div className="bg-red-900/30 text-red-400 px-4 py-3 rounded-lg text-sm border border-red-800">
                {error}
              </div>
            )}
            
            {/* Campo de Nombre de usuario */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                Nombre de usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MdPerson className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 py-3 rounded-lg"
                  placeholder="Ej: dogito123"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {checkingUsername && (
                    <AiOutlineLoading3Quarters className="animate-spin h-5 w-5 text-gray-400" />
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <MdCheck className="h-5 w-5 text-green-500" />
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <MdClose className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
              {username.length > 0 && username.length < 3 && (
                <p className="mt-1 text-xs text-red-400">El nombre debe tener al menos 3 caracteres</p>
              )}
              {!checkingUsername && usernameAvailable === false && (
                <p className="mt-1 text-xs text-red-400">Este nombre de usuario ya está en uso</p>
              )}
            </div>
            
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-3 py-3 rounded-lg"
                  placeholder="••••••••"
                />
              </div>
              {renderPasswordStrength()}
            </div>
            
            {/* Campo de Confirmar Contraseña */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirmar contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MdLock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-3 py-3 rounded-lg"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {confirmPassword && (
                    password === confirmPassword ? (
                      <MdCheck className="h-5 w-5 text-green-500" />
                    ) : (
                      <MdClose className="h-5 w-5 text-red-500" />
                    )
                  )}
                </div>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-400">Las contraseñas no coinciden</p>
              )}
            </div>

            {/* Botón de registro */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !usernameAvailable || password !== confirmPassword || username.length < 3}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2">Creando cuenta...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span>Crear Cuenta</span>
                    <MdArrowForward className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </div>
          </form>
          
          {/* Enlace para iniciar sesión */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              ¿Ya tienes una cuenta?{" "}
              <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}