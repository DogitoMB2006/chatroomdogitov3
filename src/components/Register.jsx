import { useState, useEffect } from "react";
import { auth, db } from "../firebase/config";
import {
  createUserWithEmailAndPassword
} from "firebase/auth";
import {
  doc, setDoc, getDocs, collection, query, where
} from "firebase/firestore";
import { AiOutlineLoading3Quarters, AiOutlineCheck } from "react-icons/ai";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setCheckingUsername(true);
      const q = query(collection(db, "users"), where("username", "==", username));
      const snapshot = await getDocs(q);
      setUsernameAvailable(snapshot.empty);
      setCheckingUsername(false);
    }, 700); 
    return () => clearTimeout(delayDebounce);
  }, [username]);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!usernameAvailable) {
      alert("Ese nombre de usuario ya está en uso.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email,
        username
      });

      alert("Cuenta creada exitosamente 🎉");
      navigate("/");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">Crear Cuenta</h2>

        <input
          type="email"
          placeholder="Correo electrónico"
          className="w-full p-2 mb-4 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="w-full p-2 mb-4 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Nombre de usuario"
            className="w-full p-2 border rounded pr-10"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            {checkingUsername && <AiOutlineLoading3Quarters className="animate-spin text-gray-500" />}
            {usernameAvailable && !checkingUsername && <AiOutlineCheck className="text-green-500" />}
            {usernameAvailable === false && !checkingUsername && (
              <span className="text-red-500 text-sm">❌</span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!usernameAvailable}
          className={`w-full py-2 rounded text-white ${
            usernameAvailable ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Crear cuenta
        </button>
      </form>
    </div>
  );
}
