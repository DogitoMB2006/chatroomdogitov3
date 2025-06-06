import { deleteDoc, doc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { MdDelete, MdReply } from "react-icons/md";
import { db, storage } from "../../firebase/config";
import MessageContent from "./MessageContent";
import Staff from "../Staff";
import "./MessageStyles.css"; // Importamos los nuevos estilos

export default function MessageGroup({ 
  messages, 
  userData, 
  receiverData, 
  onReplyClick, 
  onImageClick,
  isAnyBlockActive,
  navigate
}) {
  const handleDelete = async (msg) => {
    const confirm = window.confirm("¿Eliminar este mensaje?");
    if (!confirm) return;
  
    try {
      if (msg.image) {
        const isGifFromTenor = msg.image.includes("tenor.com");
  
        if (!isGifFromTenor) {
          const imagePath = decodeURIComponent(new URL(msg.image).pathname.split("/o/")[1]);
          const imageRef = ref(storage, imagePath);
          await deleteObject(imageRef);
        }
      }
  
      await deleteDoc(doc(db, "messages", msg.id));
    } catch (err) {
      alert("Error al eliminar mensaje: " + err.message);
    }
  };

  // Agrupar mensajes consecutivos del mismo remitente
  const renderMessageGroups = () => {
    return messages.map((msg, idx) => {
      const isMine = msg.from === userData.username;
      const photoURL = isMine ? userData?.photoURL : receiverData?.photoURL;
      
      // Determinar si es parte de un grupo consecutivo
      const isFirstInGroup = idx === 0 || messages[idx - 1].from !== msg.from;
      const isLastInGroup = idx === messages.length - 1 || messages[idx + 1].from !== msg.from;
      
      // Clases adicionales según posición
      const positionClass = isFirstInGroup && isLastInGroup 
        ? "" 
        : isFirstInGroup 
          ? "message-first" 
          : isLastInGroup 
            ? "message-last" 
            : "message-middle";
      
      return (
        <div
          key={msg.id || idx}
          className={`flex items-start gap-2 group message-group-container ${isMine ? 'justify-end' : 'justify-start'} ${
            isFirstInGroup ? '' : 'message-consecutive'
          }`}
        >
          {/* Avatar (solo mostrar en el primer mensaje del grupo) */}
          {!isMine && isFirstInGroup && (
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex-shrink-0 mt-1 avatar-mobile">
              {photoURL ? (
                <img src={photoURL} alt="pfp" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">😶</div>
              )}
            </div>
          )}
          
          {/* Espacio para alinear cuando no hay avatar */}
          {!isMine && !isFirstInGroup && <div className="w-8 flex-shrink-0 avatar-mobile"></div>}

          <div className={`max-w-[80%] flex flex-col message-content ${isMine ? 'my-message' : ''}`}>
            {/* Nombre de usuario (solo en el primer mensaje del grupo) */}
            {!isMine && isFirstInGroup && (
              <div className="flex items-center mb-1 ml-1 username-label">
                <span className="text-xs font-medium text-gray-300">{msg.from}</span>
                <Staff username={msg.from} />
              </div>
            )}
            
            <div className={`message-bubble ${positionClass}`}>
              <MessageContent 
                message={msg}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                isMine={isMine}
                onImageClick={onImageClick}
                navigate={navigate}
              />
            </div>
          </div>

          {/* Botones de acción (deshabilitados si hay bloqueo) */}
          {!isAnyBlockActive && (
            <div className="flex flex-col gap-1 message-actions opacity-0 group-hover:opacity-100 transition message-actions-mobile">
              <button
                onClick={() => onReplyClick({ from: msg.from, text: msg.text || (msg.image ? "[Imagen]" : "") })}
                className="bg-gray-800 text-gray-300 p-1 rounded hover:bg-gray-700 transition-colors"
                title="Responder"
              >
                <MdReply size={16} />
              </button>
              
              {isMine && (
                <button
                  onClick={() => handleDelete(msg)}
                  className="bg-red-900 text-red-100 p-1 rounded hover:bg-red-800 transition-colors"
                  title="Eliminar mensaje"
                >
                  <MdDelete size={16} />
                </button>
              )}
            </div>
          )}

          {/* Avatar propio (solo en el primer mensaje del grupo) */}
          {isMine && isFirstInGroup && (
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex-shrink-0 mt-1 avatar-mobile">
              {photoURL ? (
                <img src={photoURL} alt="pfp" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">😶</div>
              )}
            </div>
          )}
          
          {/* Espacio para alinear cuando no hay avatar */}
          {isMine && !isFirstInGroup && <div className="w-8 flex-shrink-0 avatar-mobile"></div>}
        </div>
      );
    });
  };

  return (
    <div className="message-group">
      {renderMessageGroups()}
    </div>
  );
}