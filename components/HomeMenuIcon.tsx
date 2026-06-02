type HomeMenuIconProps = {
  className?: string;
  label?: string | null;
};

export default function HomeMenuIcon({
  className = "",
  label = "首页",
}: HomeMenuIconProps) {
  const classNames = ["sf-home-menu-icon", className].filter(Boolean).join(" ");

  return (
    <span aria-hidden="true" className={classNames}>
      <svg viewBox="0 0 32 32" focusable="false">
        <path d="M6.5 15.2 16 7.6l9.5 7.6v9.6a2.4 2.4 0 0 1-2.4 2.4h-4.7v-7.1h-4.8v7.1H8.9a2.4 2.4 0 0 1-2.4-2.4v-9.6Z" />
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
}
