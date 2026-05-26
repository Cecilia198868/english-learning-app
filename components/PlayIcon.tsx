type PlayIconProps = {
  className?: string;
};

export default function PlayIcon({ className = "" }: PlayIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path d="M8 5.25v13.5L18.75 12 8 5.25Z" />
    </svg>
  );
}
