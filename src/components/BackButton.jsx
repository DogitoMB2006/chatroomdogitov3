
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";

export default function BackButton({ className = "" }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium ${className}`}
    >
      <IoArrowBack size={20} />
      Atrás
    </button>
  );
}
