import { useState, useRef } from "react";
import { db, storage } from "../../firebase/config";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import { 
  MdImage, 
  MdSend, 
  MdEmojiEmotions,
  MdGif,
  MdDelete
} from "react-icons/md";
import { toast } from "react-toastify";

// Expresión regular para detectar hashtags de rutas
const HASHTAG_REGEX = /#(home|login|register|chat|editprofile)\b/g;

export default function MessageInput({ 
  receiver, 
  userData, 
  replyTo, 
  setReplyTo, 
  onCantSendMessage,
  scrollToBottom
}) {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const fileInputRef = useRef(null);

  const sendMessage = async (e) => {
    e?.preventDefault();
    
    // Verificar bloqueo una vez más antes de enviar (consulta en tiempo real)
    try {
      const myBlockDocRef = doc(db, "blockedUsers", `${userData.username}_${receiver}`);
      const theirBlockDocRef = doc(db, "blockedUsers", `${receiver}_${userData.username}`);
      
      const [myBlockDoc, theirBlockDoc] = await Promise.all([
        getDoc(myBlockDocRef),
        getDoc(theirBlockDocRef)
      ]);
      
      if (myBlockDoc.exists() || theirBlockDoc.exists()) {
        onCantSendMessage();
        return;
      }
    } catch (error) {
      console.error("Error al verificar bloqueo:", error);
    }
    
    if (text.trim() === '' && !image) return;
  
    let imageUrl = null;
  
    if (image) {
      const imageRef = ref(storage, `chatImages/${Date.now()}-${image.name}`);
      await uploadBytes(imageRef, image);
      imageUrl = await getDownloadURL(imageRef);
    }
  
    await addDoc(collection(db, "messages"), {
      from: userData.username,
      to: receiver,
      text: text.trim(),
      image: imageUrl,
      timestamp: serverTimestamp(),
      participants: [userData.username, receiver],
      read: false,
      replyTo: replyTo ? { from: replyTo.from, text: replyTo.text } : null
    });
  
    setText('');
    setImage(null);
    setReplyTo(null);
    scrollToBottom();
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  return (
    <form onSubmit={sendMessage} className="border-t border-gray-700 px-3 py-3 bg-gray-800">
      {image && (
        <div className="mb-2 bg-gray-750 p-2 rounded text-sm text-gray-300 flex justify-between items-center">
          <span>
            Imagen: <strong className="text-gray-200">{image.name}</strong> 
            ({Math.round(image.size / 1024)} KB)
          </span>
          <button 
            type="button"
            onClick={() => setImage(null)}
            className="text-red-400 hover:text-red-300"
          >
            <MdDelete />
          </button>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={handleImageClick}
            className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700"
            title="Adjuntar imagen"
          >
            <MdImage size={20} />
          </button>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700"
            title="Insertar emoji"
          >
            <MdEmojiEmotions size={20} />
          </button>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700"
            title="Añadir GIF"
          >
            <MdGif size={20} />
          </button>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <input
          type="text"
          placeholder="Envía un mensaje... Usa #home o #chat para navegación"
          className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          type="submit"
          className={`p-2 rounded-full ${
            text.trim() || image
              ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!text.trim() && !image}
        >
          <MdSend size={20} />
        </button>
      </div>
    </form>
  );
}