export default function ImagePreview({ imageUrl, onClose }) {
    return (
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      >
        <img
          src={imageUrl}
          alt="Vista previa"
          className="max-w-[90%] max-h-[90%] rounded"
        />
      </div>
    );
  }