import Image from "next/image";

type SpeakFlowBrandMarkProps = {
  className?: string;
};

export default function SpeakFlowBrandMark({
  className = "",
}: SpeakFlowBrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-8 w-8 shrink-0 place-items-center ${className}`}
    >
      <Image
        src="/brand/speakflow-app-icon.png"
        alt=""
        width={64}
        height={64}
        sizes="32px"
        className="h-full w-full object-contain drop-shadow-[0_8px_16px_rgba(91,140,255,0.18)]"
      />
    </span>
  );
}
