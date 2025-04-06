import { MdBlock } from "react-icons/md";

export default function BlockedBanner({ iHaveBlocked, hasBlockedMe }) {
  return (
    <div className="bg-red-900 bg-opacity-75 p-4 text-white text-center">
      {iHaveBlocked ? (
        <div className="flex items-center justify-center space-x-2">
          <MdBlock size={20} />
          <span>Has bloqueado a este usuario. No puedes enviar ni recibir mensajes.</span>
        </div>
      ) : hasBlockedMe ? (
        <div className="flex items-center justify-center space-x-2">
          <MdBlock size={20} />
          <span>Este usuario te ha bloqueado. No puedes enviar mensajes.</span>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2">
          <MdBlock size={20} />
          <span>No puedes interactuar con este usuario.</span>
        </div>
      )}
    </div>
  );
}