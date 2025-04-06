export default function CantSendMessage() {
    return (
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-800 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in">
        No puedes enviar mensajes a este usuario debido a un bloqueo
      </div>
    );
  }