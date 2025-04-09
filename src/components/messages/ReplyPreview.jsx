import Staff from "../Staff";
import { MdClose } from "react-icons/md";

export default function ReplyPreview({ replyTo, onCancel }) {
  // Función para truncar el texto si es muy largo (para móvil)
  const truncateText = (text, maxLength = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-gray-800 border-l-4 border-indigo-500 px-3 py-2 mx-2 mb-2 text-sm rounded flex justify-between items-center text-gray-200 reply-preview">
      <div className="flex items-center flex-wrap max-w-[85%]">
        <span className="text-gray-400 mr-1">Respondiendo a</span>
        <strong className="mr-1 text-white truncate max-w-[80px] sm:max-w-none">{replyTo.from}</strong>
        <Staff username={replyTo.from} className="w-3 h-3 mr-1" />
        <span className="truncate max-w-[120px] sm:max-w-none italic">
          {truncateText(replyTo.text, window.innerWidth < 640 ? 20 : 40)}
        </span>
      </div>
      <button
        onClick={onCancel}
        className="text-red-400 hover:text-red-300 p-1 rounded-full"
        aria-label="Cancelar respuesta"
      >
        <MdClose size={16} />
      </button>
    </div>
  );
}