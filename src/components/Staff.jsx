import staffBadge from "../assets/staff.png";

export default function Staff({ username, className = "" }) {
  if (username !== "Dogito") return null;

  return (
    <img
      src={staffBadge}
      alt="staff"
      className={`w-4 h-4 inline-block ml-1 ${className}`}
      title="Staff"
    />
  );
}
