import { MdBlock } from "react-icons/md";

export default function BlockedMessageInput({ iHaveBlocked, hasBlockedMe }) {
  return (
    <div className="border-t border-gray-700 px-3 py-4 bg-gray-800">
      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center">
        <MdBlock className="text-red-500 mr-2" size={20} />
        <span className="text-gray-400">
          {iHaveBlocked 
            ? "Has bloqueado a este usuario" 
            : hasBlockedMe 
              ? "Este usuario te ha bloqueado" 
              : "No puedes enviar mensajes"
          }
        </span>
      </div>
    </div>
  );
}