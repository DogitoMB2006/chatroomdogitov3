import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { auth, db } from "../firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config"; 
import { useNavigate } from "react-router-dom";

export default function EditProfile() {
  const { user, userData } = useContext(AuthContext);
  const [imageFile, setImageFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
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

      alert("Foto actualizada 🎉");
      navigate("/chat");
    } catch (error) {
      alert("Error al subir imagen: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-xl font-bold mb-4">Editar perfil</h2>

        {/* Círculo preview */}
        <div
          className="w-32 h-32 mx-auto rounded-full bg-gray-300 mb-4 overflow-hidden cursor-pointer"
          onClick={() => document.getElementById("fileInput").click()}
        >
          {previewURL ? (
            <img src={previewURL} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm text-gray-500 flex items-center justify-center h-full">Haz clic para seleccionar</span>
          )}
        </div>

        <input
          type="file"
          id="fileInput"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />

        <button
          onClick={handleUpload}
          disabled={loading || !imageFile}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Subiendo..." : "Actualizar imagen"}
        </button>
      </div>
    </div>
  );
}
