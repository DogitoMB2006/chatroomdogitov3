import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { auth, db } from "../firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config"; 
import { useNavigate } from "react-router-dom";
import { MdArrowBack, MdPhoto } from "react-icons/md";

export default function EditProfile() {
  const { user, userData } = useContext(AuthContext);
  const [imageFile, setImageFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(userData?.photoURL || null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreviewURL(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!imageFile) return;
    setLoading(true);

    try {
      const storageRef = ref(storage, `profileImages/${user.uid}`);
      await uploadBytes(storageRef, imageFile);
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", user.uid), {
        photoURL: url
      });

      alert("Foto actualizada correctamente");
      navigate("/chat");
    } catch (error) {
      alert("Error al subir imagen: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center border-b border-gray-700">
        <button 
          onClick={() => navigate("/chat")}
          className="text-gray-300 hover:text-white mr-4"
        >
          <MdArrowBack size={24} />
        </button>
        <h1 className="text-xl font-semibold">Editar perfil</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg w-full max-w-md text-center">
          <h2 className="text-xl font-bold mb-6 text-gray-100">Actualizar foto de perfil</h2>

          {/* Círculo preview */}
          <div className="relative w-40 h-40 mx-auto rounded-full bg-gray-700 mb-6 overflow-hidden group">
            {previewURL ? (
              <img src={previewURL} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                <span className="text-gray-400">😶</span>
              </div>
            )}
            
            {/* Overlay al hacer hover */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => document.getElementById("fileInput").click()}
            >
              <div className="flex flex-col items-center">
                <MdPhoto size={32} className="text-white mb-2" />
                <span className="text-sm text-white">Cambiar foto</span>
              </div>
            </div>
          </div>

          <input
            type="file"
            id="fileInput"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />

          {imageFile && (
            <div className="mb-4 text-sm text-gray-400">
              Imagen seleccionada: {imageFile.name}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleUpload}
              disabled={loading || !imageFile}
              className="bg-indigo-600 text-white px-4 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Subiendo...
                </span>
              ) : "Actualizar imagen"}
            </button>
            
            <button
              onClick={() => navigate("/chat")}
              className="text-gray-400 hover:text-gray-300 px-4 py-2 rounded-md border border-gray-700 hover:border-gray-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-gray-400 text-sm text-center">
          <p>Esta imagen te representará en chats y grupos.</p>
          <p>Se recomienda usar una imagen cuadrada para mejores resultados.</p>
        </div>
      </div>
    </div>
  );
}