type FreePracticeLimitModalProps = {
  isSignedIn?: boolean;
  onDismiss: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onUnlockPro: () => void;
};

const guestBenefits = ["保存你的练习记录", "查看学习历史与进度", "在所有设备上同步"];
const proBenefits = ["无限 AI 口语练习", "解锁完整课程", "随时复习与跟读"];

function CloudCheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 120 96">
      <path
        d="M38 72H91c12 0 21-9 21-21s-9-21-21-21h-2C83 15 69 5 53 5 31 5 14 22 14 44v2C6 49 1 56 1 65c0 11 8 19 19 19h18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="8"
      />
      <path
        d="m45 48 13 13 28-31"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="9"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 48 48">
      <circle cx="24" cy="16" r="7" stroke="currentColor" strokeWidth="3.4" />
      <path
        d="M10 40c2.4-8 7.2-12 14-12s11.6 4 14 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.4"
      />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 48 48">
      <path d="M9 17.5 18.2 26 24 11l5.8 15L39 17.5l-3.2 22H12.2L9 17.5Z" />
      <path d="M14 42h20" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f0ecff] text-[1.05rem] font-black text-[#392f6d]">
      ✓
    </span>
  );
}

export default function FreePracticeLimitModal({
  isSignedIn = false,
  onDismiss,
  onLogin,
  onUnlockPro,
}: FreePracticeLimitModalProps) {
  const benefits = isSignedIn ? proBenefits : guestBenefits;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#171129]/72 p-3 text-[#201833] backdrop-blur-[10px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-practice-limit-title"
    >
      <div className="w-full max-w-[392px] rounded-[30px] border border-white/80 bg-[#fbfaff] px-6 py-7 text-center shadow-[0_28px_80px_rgba(28,18,62,0.42)] sm:max-w-[420px] sm:px-7">
        <h2
          id="free-practice-limit-title"
          className="text-[clamp(1.65rem,7vw,2.12rem)] font-black leading-tight text-[#171633]"
        >
          今天的学习试用已用完
        </h2>
        <p className="mx-auto mt-4 max-w-[20rem] text-[clamp(1.02rem,4.6vw,1.28rem)] font-semibold leading-8 text-[#4f4b70]">
          {isSignedIn
            ? "订阅 SpeakFlow Pro 后，可以继续无限练习和复习表达。"
            : "登录后可保存你的练习记录，随时继续学习。"}
        </p>

        <div className="mt-7 grid grid-cols-[0.9fr_1.15fr] items-center gap-3 text-left">
          <div className="relative grid min-h-[6.5rem] place-items-center text-[#7754ff]">
            <span className="absolute left-[10%] top-[9%] text-[1.35rem] text-[#a693ff]">
              ✦
            </span>
            <span className="absolute right-[8%] top-[1%] text-[1.1rem] text-[#b5a7ff]">
              ✦
            </span>
            <span className="absolute bottom-[4%] h-3 w-28 rounded-full bg-[#ded7ff]/58 blur-[1px]" />
            <CloudCheckIcon />
          </div>
          <div className="grid gap-4">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 text-[clamp(1rem,4.2vw,1.18rem)] font-bold leading-6 text-[#343052]"
              >
                <CheckIcon />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          <button
            type="button"
            onClick={isSignedIn ? onUnlockPro : onLogin}
            className="sf-free-practice-limit-primary flex min-h-[74px] items-center justify-center gap-4 rounded-[24px] bg-[linear-gradient(135deg,#6f55ff_0%,#944eff_55%,#c854ff_100%)] px-5 text-left text-white shadow-[0_18px_38px_rgba(126,92,255,0.32)]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center text-white">
              {isSignedIn ? <CrownIcon /> : <UserIcon />}
            </span>
            <span className="min-w-0">
              <span className="block text-[clamp(1.18rem,5.2vw,1.48rem)] font-black leading-tight text-white">
                {isSignedIn ? "订阅 Pro，继续无限练" : "注册/登录，保存记录"}
              </span>
              <span className="mt-1 block text-[0.88rem] font-bold leading-5 text-white/82">
                {isSignedIn
                  ? "解锁全部功能，畅享无限练习"
                  : "免费登录后即可保存你的学习进度"}
              </span>
            </span>
          </button>

          {!isSignedIn ? (
            <button
              type="button"
              onClick={onUnlockPro}
              className="flex min-h-[70px] items-center justify-center gap-4 rounded-[23px] border border-[#ded7fb] bg-white/64 px-5 text-left text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center text-[#7a55ff]">
                <CrownIcon />
              </span>
              <span className="min-w-0">
                <span className="block text-[clamp(1.08rem,4.7vw,1.35rem)] font-black leading-tight">
                  订阅 Pro，继续无限练
                </span>
                <span className="mt-1 block text-[0.86rem] font-bold leading-5 text-[#7d7899]">
                  解锁全部功能，畅享无限练习
                </span>
              </span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 rounded-[16px] px-4 text-[clamp(1rem,4.3vw,1.12rem)] font-black text-[#77738e] hover:bg-[#efeaff]"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}
