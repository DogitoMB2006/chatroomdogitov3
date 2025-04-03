import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  const showToast = (toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000); // 5 segundos
  };

  const handleToastClick = (toast) => {
    // Eliminar el toast cuando se hace clic
    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    
    // Navegar al chat correspondiente
    if (toast.type === "group") {
      navigate(`/chat/group/${toast.chatId}`);
    } else {
      // Chat privado, navegar al chat con el usuario
      navigate(`/chat/${toast.from}`);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-white border shadow-lg rounded-lg p-4 flex items-center gap-3 animate-fade-in-down cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => handleToastClick(t)}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300">
              {t.photoURL ? (
                <img src={t.photoURL} alt="pfp" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">😶</div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{t.username}</span>
              <span className="text-xs text-gray-700">
                {t.text || "📷 Imagen"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}