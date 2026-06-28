type FreeUsageMeterProps = {
  actionLabel?: string;
  className?: string;
  isPro?: boolean;
  limit: number;
  unitLabel?: string;
  used: number;
};

const toneStyles = {
  default: {
    active: "bg-[#7c55ff]",
    card: "border-[#d9d0ff]/78 bg-white/38 text-[#201833]",
    count: "bg-white/56 text-[#6b4dff]",
    inactive: "bg-white/62",
    label: "text-[#6f668a]",
  },
  full: {
    active: "bg-[#d84d7f]",
    card: "border-[#ffc4db]/78 bg-[#fff0f6]/58 text-[#201833]",
    count: "bg-white/68 text-[#b92f64]",
    inactive: "bg-white/68",
    label: "text-[#b92f64]",
  },
  warning: {
    active: "bg-[#d9941e]",
    card: "border-[#f5d39a]/78 bg-[#fff8e9]/58 text-[#201833]",
    count: "bg-white/68 text-[#a96f08]",
    inactive: "bg-white/68",
    label: "text-[#a96f08]",
  },
};

export default function FreeUsageMeter({
  actionLabel = "练习",
  className = "",
  isPro = false,
  limit,
  unitLabel = "句",
  used,
}: FreeUsageMeterProps) {
  if (isPro || limit <= 0) return null;

  const clampedUsed = Math.min(Math.max(used, 0), limit);
  const remaining = Math.max(limit - clampedUsed, 0);
  const tone =
    remaining === 0 ? toneStyles.full : remaining === 1 ? toneStyles.warning : toneStyles.default;
  const statusText =
    remaining === 0
      ? "免费试用额度已用完"
      : remaining === 1
        ? `还可体验 1 ${unitLabel}`
        : `免费${actionLabel} ${clampedUsed}/${limit}`;

  return (
    <div
      aria-label={`累计免费进度 ${clampedUsed}/${limit}`}
      className={`mx-auto w-full max-w-[360px] rounded-[18px] border px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_10px_24px_rgba(84,72,146,0.08)] backdrop-blur-md ${tone.card} ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[0.82rem] font-extrabold leading-5 ${tone.label}`}>
          {statusText}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[0.76rem] font-black leading-none ${tone.count}`}
        >
          {clampedUsed}/{limit}
        </span>
      </div>
      <div
        className="mt-2 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${limit}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: limit }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full ${
              index < clampedUsed ? tone.active : tone.inactive
            }`}
          />
        ))}
      </div>
    </div>
  );
}
