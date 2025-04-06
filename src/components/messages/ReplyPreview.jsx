import Staff from "../Staff";

export default function ReplyPreview({ replyTo, onCancel }) {
  return (
    <div className="bg-gray-800 border-l-4 border-indigo-500 px-3 py-2 mx-2 mb-2 text-sm rounded flex justify-between items-center text-gray-200">
      <div className="flex items-center">
        Respondiendo a <strong className="mx-1">{replyTo.from}</strong>
        <Staff username={replyTo.from} className="w-3 h-3 mr-1" />
        : "{replyTo.text}"
      </div>
      <button
        onClick={onCancel}
        className="text-red-400 text-xs hover:underline"
      >
        Cancelar
      </button>
    </div>
  );
}