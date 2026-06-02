type ExpressionLearningLimitModalProps = {
  onDismiss: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onUnlockPro: () => void;
};

const proBenefits = [
  "学习更多重要表达",
  "建立长期英语记忆",
  "随时复习与跟读",
];

export default function ExpressionLearningLimitModal({
  onDismiss,
  onLogin,
  onRegister,
  onUnlockPro,
}: ExpressionLearningLimitModalProps) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#171129]/72 p-4 text-[#201833] backdrop-blur-[10px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expression-learning-limit-title"
    >
      <div className="w-full max-w-[360px] rounded-[30px] border border-white/80 bg-[#fbf9ff] px-6 py-7 text-center shadow-[0_28px_80px_rgba(28,18,62,0.42)]">
        <h2
          id="expression-learning-limit-title"
          className="text-[1.55rem] font-black leading-tight"
        >
          今天的学习试用已用完
        </h2>
        <p className="mt-4 text-[1.05rem] font-extrabold leading-7 text-[#6f6685]">
          SpeakFlow Pro 可以帮你继续学习和复习表达。
        </p>

        <div className="mt-5 px-5 text-left">
          <div className="grid gap-3">
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
            className="sf-expression-learning-limit-primary min-h-12 rounded-[18px] bg-[linear-gradient(135deg,#6f55ff_0%,#a549ff_58%,#c85cff_100%)] px-4 text-[1.02rem] font-black shadow-[0_16px_34px_rgba(126,92,255,0.3)]"
          >
            解锁 Pro
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
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-12 rounded-[18px] border border-[#d8d0f4] bg-white px-4 text-[1.02rem] font-extrabold text-[#6f668a] hover:bg-[#efeaff]"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}
