import { useState, useEffect, useRef } from "react";
import emojiList from "emoji.json";
import { MdOutlineEmojiEmotions, MdClose } from "react-icons/md";

export default function EmojiSelector({ onEmojiClick, buttonRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [emojiCategories, setEmojiCategories] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [recentEmojis, setRecentEmojis] = useState([]);
  const selectorRef = useRef(null);

  useEffect(() => {
    const categories = {
      "Sonrisas": [],
      "Gestos": [],
      "Animales": [],
      "Comida": [],
      "Objetos": [],
      "Símbolos": [],
    };

    emojiList.forEach((emoji) => {
      const cat = emoji.category || "";
      if (cat.includes("Smileys")) categories["Sonrisas"].push(emoji.char);
      else if (cat.includes("People") || cat.includes("Body")) categories["Gestos"].push(emoji.char);
      else if (cat.includes("Animals")) categories["Animales"].push(emoji.char);
      else if (cat.includes("Food")) categories["Comida"].push(emoji.char);
      else if (cat.includes("Objects")) categories["Objetos"].push(emoji.char);
      else if (cat.includes("Symbols")) categories["Símbolos"].push(emoji.char);
    });

    setEmojiCategories(categories);
    setActiveCategory("Sonrisas");
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentEmojis");
      if (stored) {
        setRecentEmojis(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading recent emojis:", e);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [buttonRef]);

  const toggleSelector = () => {
    setIsOpen(!isOpen);
  };

  const handleEmojiSelect = (emoji) => {
    onEmojiClick(emoji);
    const newRecents = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 16);
    setRecentEmojis(newRecents);
    try {
      localStorage.setItem("recentEmojis", JSON.stringify(newRecents));
    } catch (e) {
      console.error("Error saving recent emojis:", e);
    }
  };

  const renderEmojiButton = () => (
    <button
      type="button"
      onClick={toggleSelector}
      className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700"
      title="Insertar emoji"
      ref={buttonRef}
    >
      <MdOutlineEmojiEmotions size={20} />
    </button>
  );

  if (!isOpen) return renderEmojiButton();

  return (
    <>
      {renderEmojiButton()}

      <div
        className="absolute bottom-16 left-0 sm:left-auto bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 w-72 max-h-72 overflow-hidden"
        ref={selectorRef}
      >
        {/* Barra superior */}
        <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700 bg-gray-750">
          <h3 className="text-sm font-medium text-gray-200">Emojis</h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-200 p-1 rounded"
          >
            <MdClose size={16} />
          </button>
        </div>

        {/* Contenido principal */}
        <div className="overflow-y-auto max-h-48 p-2">
          {recentEmojis.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs text-gray-400 mb-1 px-2">Recientes</h4>
              <div className="grid grid-cols-8 gap-1">
                {recentEmojis.map((emoji, idx) => (
                  <button
                    type="button"
                    key={`recent-${idx}`}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="p-1 text-xl hover:bg-gray-700 rounded"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {emojiCategories[activeCategory] && (
            <div>
              <h4 className="text-xs text-gray-400 mb-1 px-2">{activeCategory}</h4>
              <div className="grid grid-cols-8 gap-1">
                {emojiCategories[activeCategory].map((emoji, idx) => (
                  <button
                    type="button"
                    key={`emoji-${idx}`}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="p-1 text-xl hover:bg-gray-700 rounded"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Categorías */}
        <div className="border-t border-gray-700 px-2 py-1 flex overflow-x-auto scrollbar-none">
          {Object.keys(emojiCategories).map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                activeCategory === category
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
