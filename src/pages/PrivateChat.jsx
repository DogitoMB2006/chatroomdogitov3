import { useParams } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import MessageHandler from "../components/MessageHandler";

export default function PrivateChat() {
  const { username } = useParams(); 
  const { userData } = useContext(AuthContext); 

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-2">
      <h2 className="text-xl font-bold text-center mb-4">
        Chat con <span className="text-indigo-600">{username}</span>
      </h2>
      <MessageHandler receiver={username} />
    </div>
  );
}
