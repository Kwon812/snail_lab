/**
 * Loading spinner — the snail's shell (the orange spiral from logo-symbol.svg)
 * rotating on its own axis.
 */
export function Spinner({
  size = 40,
  className = "",
  label = "불러오는 중",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-label={label} className={`inline-block ${className}`}>
      {/* viewBox centered on the shell (~55,42) so it spins in place */}
      <svg
        width={size}
        height={size}
        viewBox="26 13 58 58"
        className="snail-spin"
        aria-hidden
      >
        <path
          d="M 81 42 A 26 26 0 1 1 29 42 A 19.5 19.5 0 1 1 68 42 A 13 13 0 1 1 42 42 A 6.5 6.5 0 1 1 55 42"
          fill="none"
          stroke="#CF4500"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
