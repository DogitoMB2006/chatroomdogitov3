import { useState, useRef } from "react";
import { 
  MdImage, 
  MdSend, 
  MdDelete
} from "react-icons/md";
import EmojiSelector from "./EmojiSelector";
import GifSelector from "./GifSelector"; // 👈 importado

export default function GroupMessageInput({ 
  text, 
  setText, 
  handleSend, 
  image, 
  setImage, 
  handleImageClick, 
  fileInputRef, 
  kickedOut,
  handleKeyDown,
  handleSendGif // 👈 si usas función externa para enviar gif
}) {
  const emojiButtonRef = useRef(null);
  const gifButtonRef = useRef(null); // 👈 nuevo ref
  const textInputRef = useRef(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleEmojiClick = (emoji) => {
    if (textInputRef.current) {
      const start = textInputRef.current.selectionStart || cursorPosition;
      const end = textInputRef.current.selectionEnd || cursorPosition;
      const beforeEmoji = text.substring(0, start);
      const afterEmoji = text.substring(end);
      const newText = beforeEmoji + emoji + afterEmoji;
      
      setText(newText);
      
      const newPosition = start + emoji.length;
      setCursorPosition(newPosition);
      
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
          textInputRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 10);
    } else {
      setText(text + emoji);
    }
  };

  const handleInputClick = () => {
    if (textInputRef.current) {
      setCursorPosition(textInputRef.current.selectionStart || 0);
    }
  };

  const handleInputKeyUp = () => {
    if (textInputRef.current) {
      setCursorPosition(textInputRef.current.selectionStart || 0);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const handleGifClick = (gifUrl) => {
    handleSendGif(gifUrl); // 👈 función para enviar el gif
  };

  return (
    <div className="bg-gray-900 border-t border-gray-800 shadow-lg">
      {image && (
        <div className="mb-2 bg-gray-800 p-2 rounded mx-2 sm:mx-3 text-sm text-gray-300 flex justify-between items-center">
          <span className="truncate max-w-[180px] sm:max-w-none">
            Imagen: <strong className="text-gray-200">{image.name}</strong> 
            ({Math.round(image.size / 1024)} KB)
          </span>
          <button 
            onClick={() => setImage(null)}
            className="text-red-400 hover:text-red-300 ml-2"
          >
            <MdDelete />
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-1 sm:gap-2 items-center p-2 sm:p-3 relative">
        <div className="flex">
          <button
            type="button"
            onClick={handleImageClick}
            className="text-gray-400 hover:text-gray-200 p-1 sm:p-2 rounded-full hover:bg-gray-800"
            title="Adjuntar imagen"
          >
            <MdImage size={20} />
          </button>
          
          <EmojiSelector 
            onEmojiClick={handleEmojiClick} 
            buttonRef={emojiButtonRef}
          />

          <GifSelector 
            onGifClick={handleGifClick}
            buttonRef={gifButtonRef}
          />
        </div>
        
        <textarea
          ref={textInputRef}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-gray-800 text-gray-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[40px] max-h-24 text-sm sm:text-base"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          onKeyUp={handleInputKeyUp}
          disabled={kickedOut}
          rows={1}
        />
        
        <button
          type="submit"
          disabled={(!text.trim() && !image) || kickedOut}
          className={`p-1 sm:p-2 rounded-full ${
            (!text.trim() && !image) || kickedOut
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : "bg-indigo-700 hover:bg-indigo-800 text-white"
          }`}
        >
          <MdSend size={20} />
        </button>
      </form>
    </div>
  );
}
