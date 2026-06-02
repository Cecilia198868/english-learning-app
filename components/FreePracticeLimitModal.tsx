type FreePracticeLimitModalProps = {
  isSignedIn?: boolean;
  onDismiss: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onUnlockPro: () => void;
};

const proBenefits = ["继续无限练习", "保存学习记录", "解锁完整课程"];

export default function FreePracticeLimitModal({
  isSignedIn = false,
  onDismiss,
  onLogin,
  onRegister,
  onUnlockPro,
}: FreePracticeLimitModalProps) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#171129]/72 p-4 text-[#201833] backdrop-blur-[10px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-practice-limit-title"
    >
      <div className="w-full max-w-[360px] rounded-[30px] border border-white/80 bg-[#fbf9ff] px-6 py-7 text-center shadow-[0_28px_80px_rgba(28,18,62,0.42)]">
        <h2
          id="free-practice-limit-title"
          className="text-[1.55rem] font-black leading-tight"
        >
          已完成 5 句免费体验
        </h2>
        <p className="mt-3 text-[1rem] font-bold leading-7 text-[#6f6685]">
          注册或登录后可以保存记录；开通 SpeakFlow Pro 后，可以继续无限练习。
        </p>

        <div className="mt-6 rounded-[24px] bg-white px-5 py-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#ebe4ff]">
          <p className="text-center text-[1.55rem] font-black leading-none">
            SpeakFlow Pro
          </p>
          <div className="mt-5 grid gap-3">
            {proBenefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 text-[1.05rem] font-extrabold"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#efeaff] text-[0.86rem] text-[#7460e8]">
                  ✓
                </span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={onUnlockPro}
            className="sf-free-practice-limit-primary min-h-12 rounded-[18px] bg-[linear-gradient(135deg,#6f55ff_0%,#a549ff_58%,#c85cff_100%)] px-4 text-[1.02rem] font-black shadow-[0_16px_34px_rgba(126,92,255,0.3)]"
          >
            订阅 Pro，继续练习
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onLogin}
              className="min-h-12 rounded-[18px] border border-[#d8d0f4] bg-white px-4 text-[1.02rem] font-extrabold text-[#5f4bea] hover:bg-[#efeaff]"
            >
              登录
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="min-h-12 rounded-[18px] border border-[#d8d0f4] bg-white px-4 text-[1.02rem] font-extrabold text-[#5f4bea] hover:bg-[#efeaff]"
            >
              注册
            </button>
          </div>
          {isSignedIn ? (
            <p className="text-[0.82rem] font-bold leading-5 text-[#8a829f]">
              当前已登录，也可以直接订阅 Pro。
            </p>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 rounded-[16px] px-4 text-[0.96rem] font-extrabold text-[#8a829f] hover:bg-[#efeaff]"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}
