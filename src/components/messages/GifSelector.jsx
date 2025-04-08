import { useState, useEffect, useRef } from "react";
import { MdClose } from "react-icons/md";

const TENOR_API_KEY = "AIzaSyD7GrVWz4mx4Htd_i0XgSduLRs1qbFwBdA";

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function GifSelector({ onGifClick, buttonRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("trending");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const selectorRef = useRef(null);
  const debouncedTerm = useDebounce(searchTerm);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [buttonRef]);

  useEffect(() => {
    const fetchGifs = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
            debouncedTerm
          )}&key=${TENOR_API_KEY}&limit=20&media_filter=gif`
        );
        const data = await res.json();
        setGifs(data.results || []);
      } catch (err) {
        console.error("Error fetching gifs:", err);
      }
      setLoading(false);
    };

    if (debouncedTerm.trim() !== "") {
      fetchGifs();
    }
  }, [debouncedTerm]);

  const handleGifClick = (gif) => {
    const gifUrl = gif.media_formats?.gif?.url || gif.media[0]?.gif?.url;
    if (gifUrl) {
      onGifClick(gifUrl);
      setIsOpen(false);
    }
  };

  const toggleSelector = () => setIsOpen(!isOpen);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // evitar recarga
      setSearchTerm(e.target.value);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleSelector}
        className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700"
        title="Insertar GIF"
        ref={buttonRef}
      >
        <span role="img" aria-label="GIF">🎞️</span>
      </button>

      {isOpen && (
        <div
          ref={selectorRef}
          className="absolute bottom-16 left-0 sm:left-auto bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 w-80 max-h-80 overflow-hidden"
        >
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700 bg-gray-750">
            <input
              type="text"
              placeholder="Buscar GIF..."
              defaultValue={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyPress}
              className="bg-gray-700 text-sm text-gray-200 px-2 py-1 rounded w-full mr-2"
            />
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-200 p-1 rounded"
              type="button"
            >
              <MdClose size={16} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-64 p-2">
            {loading ? (
              <p className="text-center text-sm text-gray-400">Cargando...</p>
            ) : gifs.length === 0 ? (
              <p className="text-center text-sm text-gray-400">No se encontraron resultados.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {gifs.map((gif, idx) => {
                  const url = gif.media_formats?.gif?.url || gif.media[0]?.gif?.url;
                  return (
                    <img
                      key={idx}
                      src={url}
                      alt="gif"
                      onClick={() => handleGifClick(gif)}
                      className="w-full h-auto cursor-pointer hover:opacity-80 rounded"
                      type="button"
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
