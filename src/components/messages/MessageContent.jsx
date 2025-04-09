import { format } from "date-fns";
import Staff from "../Staff";

// Mapa de hashtags a rutas
const ROUTE_HASHTAGS = {
  '#home': '/',
  '#login': '/login',
  '#register': '/register',
  '#chat': '/chat',
  '#editprofile': '/editprofile'
};

// Expresión regular para detectar hashtags de rutas
const HASHTAG_REGEX = /#(home|login|register|chat|editprofile)\b/g;

export default function MessageContent({ 
  message, 
  isFirstInGroup, 
  isLastInGroup, 
  isMine,
  onImageClick,
  navigate
}) {
  // Función para navegar al hacer clic en un hashtag
  const handleHashtagClick = (route) => {
    navigate(route);
  };

  // Función para renderizar el texto con hashtags clickeables
  const renderMessageWithHashtags = (text) => {
    // Primero manejamos los enlaces regulares
    const urlParts = text.split(/(https?:\/\/[^\s]+)/g);

    return urlParts.map((part, i) => {
      // Si es una URL, la manejamos como antes
      if (part.match(/^https?:\/\/[^\s]+$/)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-300"
          >
            {part}
          </a>
        );
      } 
      
      // Si no es una URL, buscamos hashtags
      const hashtagParts = part.split(HASHTAG_REGEX);
      
      if (hashtagParts.length === 1) {
        // No hay hashtags, devolver el texto normal
        return <span key={i}>{part}</span>;
      }
      
      // Reconstruir el texto con los hashtags convertidos en enlaces
      const result = [];
      let index = 0;
      
      part.replace(HASHTAG_REGEX, (match, hashtag, offset) => {
        // Añadir el texto antes del hashtag
        if (offset > index) {
          result.push(<span key={`${i}-${index}`}>{part.substring(index, offset)}</span>);
        }
        
        // Añadir el hashtag como enlace
        result.push(
          <span
            key={`${i}-${offset}`}
            className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer font-medium"
            onClick={() => handleHashtagClick(ROUTE_HASHTAGS[`#${hashtag}`])}
          >
            {match}
          </span>
        );
        
        index = offset + match.length;
        return match;
      });
      
      // Añadir el texto restante después del último hashtag
      if (index < part.length) {
        result.push(<span key={`${i}-end`}>{part.substring(index)}</span>);
      }
      
      return <span key={i}>{result}</span>;
    });
  };

  return (
    <div
      className={`px-3 py-2 rounded-lg relative message-text ${
        isMine 
          ? `bg-indigo-600 text-white ${isFirstInGroup ? 'rounded-tr-none' : ''} ${isLastInGroup ? 'rounded-br-none' : ''}`
          : `bg-gray-700 text-gray-100 ${isFirstInGroup ? 'rounded-tl-none' : ''} ${isLastInGroup ? 'rounded-bl-none' : ''}`
      }`}
    >
      {/* Mensaje al que responde */}
      {message.replyTo && (
        <div className="text-xs border-l-2 pl-2 mb-2 opacity-75 rounded py-1 bg-black bg-opacity-20 reply-preview">
          <span className="font-medium">{message.replyTo.from}</span>
          <Staff username={message.replyTo.from} className="w-3 h-3" />
          <span>: "{message.replyTo.text}"</span>
        </div>
      )}

      {/* Imagen */}
      {message.image && (
        <div className="mb-2">
          <img
            src={message.image}
            alt="media"
            className="rounded max-w-full max-h-60 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onImageClick(message.image)}
          />
        </div>
      )}

      {/* Texto del mensaje con hashtags clickeables */}
      {message.text && (
        <p className="break-words">
          {renderMessageWithHashtags(message.text)}
        </p>
      )}

      {/* Hora */}
      <span className="block text-[10px] mt-1 text-right opacity-70 message-time">
        {message.timestamp?.toDate ? format(message.timestamp.toDate(), 'p') : '...'}
      </span>
    </div>
  );
}