"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

const termsContent = {
  en: {
    title: "Terms of Service",
    updated: "Last updated: May 23, 2026",
    intro:
      "Welcome to SpeakFlow. These Terms of Service explain the rules for using SpeakFlow, including our language learning, speech practice, vocabulary, course creation, AI-assisted learning, invite friends and referral rewards, interface language, notification inbox, phone transfer, and account management features.",
    sections: [
      {
        title: "1. Acceptance of These Terms",
        body: [
          "By creating an account, signing in, subscribing, or using SpeakFlow, you agree to these Terms of Service. If you do not agree, please do not use the app.",
          "If you use SpeakFlow on behalf of another person or organization, you confirm that you have authority to accept these terms for them.",
        ],
      },
      {
        title: "2. What SpeakFlow Provides",
        body: [
          "SpeakFlow is an English speaking practice app. It may help users generate practice sentences, transform user input into English expressions, create learning courses, review vocabulary, practice pronunciation, and save expressions or words to a personal library.",
          "Some content may be generated or assisted by AI. AI-generated content can be useful for practice, but it may be incomplete, inaccurate, or unsuitable for a particular situation. You are responsible for checking important information before relying on it.",
          "SpeakFlow may also provide account settings such as Invite Friends, interface language, notification inbox, phone transfer backup and restore, subscription management, and account deletion request flows.",
        ],
      },
      {
        title: "3. Accounts and Eligibility",
        body: [
          "You may need an account to use certain features. You are responsible for keeping your login information secure and for activity under your account.",
          "You agree to provide accurate information and to update it when necessary. Do not use another person's account without permission.",
          "Account deletion requests may require identity verification before records are removed, especially when subscription or payment records are involved.",
        ],
      },
      {
        title: "4. User Content",
        body: [
          "You may submit text, speech, audio, course material, vocabulary, profile information, or other content to SpeakFlow. You keep ownership of your content.",
          "You give SpeakFlow permission to process your content as needed to provide the app's features, such as transcription, translation, feedback, pronunciation practice, course generation, vocabulary storage, and syncing where available.",
          "If you use phone transfer backup or restore, you are responsible for choosing where to save or share the backup file and for keeping it secure.",
          "Do not submit content that is illegal, harmful, abusive, deceptive, infringing, or that violates another person's privacy or rights.",
        ],
      },
      {
        title: "5. Learning and Speech Features",
        body: [
          "SpeakFlow is designed for language learning and communication practice. It is not a professional translation, legal, medical, financial, immigration, tax, or emergency advice service.",
          "Practice dialogues and example scenarios are for education only. For decisions involving law, taxes, immigration, health, money, safety, or official government procedures, consult a qualified professional or the relevant official source.",
        ],
      },
      {
        title: "6. Subscriptions and Payments",
        body: [
          "Some features may require a paid subscription or one-time payment. Prices, features, and billing periods will be shown before purchase.",
          "Subscriptions may renew automatically unless canceled through the relevant app store, payment provider, or account settings. Refunds, cancellations, and billing disputes may be handled according to the rules of the payment provider you used.",
          "Referral or bonus Pro rewards, when offered, are account-based, limited, non-transferable, and may require successful registration or payment events before they are applied.",
        ],
      },
      {
        title: "7. Acceptable Use",
        body: [
          "You agree not to misuse SpeakFlow, interfere with the service, attempt unauthorized access, copy or scrape the app at scale, reverse engineer protected parts of the service, or use the app to generate or distribute harmful or unlawful content.",
          "We may limit, suspend, or terminate access if we believe your use violates these Terms, creates risk, or harms other users or the service.",
        ],
      },
      {
        title: "8. Intellectual Property",
        body: [
          "SpeakFlow, including its design, interface, software, trademarks, and original content, is owned by us or our licensors and is protected by applicable intellectual property laws.",
          "These Terms do not transfer ownership of SpeakFlow to you. You receive a limited, personal, non-transferable right to use the app according to these Terms.",
        ],
      },
      {
        title: "9. Privacy",
        body: [
          "Your use of SpeakFlow is also governed by our Privacy Policy. The Privacy Policy explains how information may be collected, used, stored, and protected.",
          "If you use speech, audio, AI, account, invite rewards, notification inbox, interface language, or phone transfer features, your content or account status may need to be processed to provide those features.",
        ],
      },
      {
        title: "10. Service Changes and Availability",
        body: [
          "We may update, add, remove, pause, or discontinue features at any time. We may also release improvements, bug fixes, pricing changes, or limits to protect the quality and safety of the service.",
          "We try to keep SpeakFlow reliable, but we do not guarantee that it will always be available, uninterrupted, secure, or error-free.",
        ],
      },
      {
        title: "11. Disclaimers",
        body: [
          "SpeakFlow is provided on an 'as is' and 'as available' basis. To the maximum extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, and any warranties arising from course of dealing or usage of trade.",
          "We do not guarantee that learning results, pronunciation scores, AI suggestions, translations, or saved vocabulary will meet your expectations or be correct in every context.",
        ],
      },
      {
        title: "12. Limitation of Liability",
        body: [
          "To the maximum extent permitted by law, SpeakFlow and its owners, employees, contractors, and partners will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, goodwill, or business opportunities.",
          "Where liability cannot be excluded, our liability will be limited to the amount you paid for SpeakFlow during the twelve months before the claim, or the minimum amount permitted by law.",
        ],
      },
      {
        title: "13. Termination",
        body: [
          "You may stop using SpeakFlow at any time. We may suspend or terminate your access if you violate these Terms, create security risk, or use the service in a way that may harm others or the app.",
          "After termination, some provisions of these Terms will continue to apply, including intellectual property, disclaimers, limitation of liability, and dispute-related terms.",
        ],
      },
      {
        title: "14. Changes to These Terms",
        body: [
          "We may update these Terms from time to time. If changes are material, we will try to provide reasonable notice in the app or by other appropriate means.",
          "Your continued use of SpeakFlow after changes become effective means you accept the updated Terms.",
        ],
      },
      {
        title: "15. Contact",
        body: [
          "If you have questions about these Terms, please contact SpeakFlow support through the app's help or report issue options.",
        ],
      },
    ],
    back: "Back",
  },
  "zh-CN": {
    title: "用户协议",
    updated: "最后更新日期：2026 年 5 月 23 日",
    intro:
      "欢迎使用 SpeakFlow。本用户协议说明您使用 SpeakFlow 时需要遵守的规则，包括语言学习、口语练习、表达库、课程生成、AI 辅助学习、邀请好友与邀请奖励、界面语言、通知收件箱、更换手机和账号管理等功能。",
    sections: [
      {
        title: "1. 接受本协议",
        body: [
          "当您创建账户、登录、订阅或使用 SpeakFlow 时，即表示您同意本用户协议。如果您不同意，请不要使用本应用。",
          "如果您代表他人或某个组织使用 SpeakFlow，您确认您有权代表其接受本协议。",
        ],
      },
      {
        title: "2. SpeakFlow 提供的服务",
        body: [
          "SpeakFlow 是一款英语口语练习应用。它可以帮助用户生成练习句子、把用户输入转换成英文表达、创建学习课程、复习词汇、练习发音，并把表达或单词保存到个人表达库。",
          "部分内容可能由 AI 生成或辅助生成。AI 内容适合用于学习练习，但可能不完整、不准确，或不适合特定场景。重要信息请您自行核实。",
          "SpeakFlow 也可能提供邀请好友、界面语言、通知收件箱、更换手机备份与恢复、订阅管理和删除账号请求等账户设置功能。",
        ],
      },
      {
        title: "3. 账户与使用资格",
        body: [
          "部分功能可能需要账户。您需要妥善保管登录信息，并对您账户下的活动负责。",
          "您同意提供准确的信息，并在需要时及时更新。未经允许，请勿使用他人的账户。",
          "删除账号请求可能需要先核对身份，尤其是在涉及订阅或付款记录时。",
        ],
      },
      {
        title: "4. 用户内容",
        body: [
          "您可能会向 SpeakFlow 提交文字、语音、音频、课程材料、词汇、头像资料或其他内容。您仍然拥有您提交内容的权利。",
          "为了提供应用功能，您授权 SpeakFlow 在必要范围内处理您的内容，例如转写、翻译、反馈、发音练习、课程生成、词汇保存以及可用情况下的数据同步。",
          "如果您使用更换手机的备份或恢复功能，您需要自行选择备份文件保存或分享的位置，并妥善保管备份文件。",
          "请勿提交违法、有害、骚扰、欺骗、侵权，或侵犯他人隐私和权利的内容。",
        ],
      },
      {
        title: "5. 学习与语音功能",
        body: [
          "SpeakFlow 用于语言学习和沟通练习，不是专业翻译、法律、医疗、金融、移民、税务或紧急事务建议服务。",
          "练习对话和场景示例仅供学习使用。涉及法律、税务、移民、医疗、金钱、安全或政府正式流程的事项，请咨询合格专业人士或官方渠道。",
        ],
      },
      {
        title: "6. 订阅与付款",
        body: [
          "部分功能可能需要付费订阅或一次性购买。价格、功能和计费周期会在购买前展示。",
          "订阅可能会自动续费，除非您通过对应应用商店、支付服务商或账户设置取消。退款、取消和账单争议可能按照您所使用支付渠道的规则处理。",
          "邀请或奖励 Pro 权限如有提供，通常绑定账户、次数有限、不可转让，并可能需要成功注册或成功付款事件后才会生效。",
        ],
      },
      {
        title: "7. 合理使用",
        body: [
          "您同意不滥用 SpeakFlow，不干扰服务运行，不尝试未经授权访问，不大规模复制或抓取应用内容，不逆向工程受保护的服务部分，也不使用本应用生成或传播有害、违法内容。",
          "如果我们认为您的使用违反本协议、造成风险，或损害其他用户或服务，我们可以限制、暂停或终止您的访问。",
        ],
      },
      {
        title: "8. 知识产权",
        body: [
          "SpeakFlow 的设计、界面、软件、商标和原创内容归我们或授权方所有，并受适用知识产权法律保护。",
          "本协议不会把 SpeakFlow 的所有权转让给您。您仅获得依照本协议使用本应用的个人、有限、不可转让的权利。",
        ],
      },
      {
        title: "9. 隐私",
        body: [
          "您使用 SpeakFlow 也受我们的隐私政策约束。隐私政策说明信息如何被收集、使用、存储和保护。",
          "如果您使用语音、音频、AI、账户、邀请奖励、通知收件箱、界面语言或更换手机功能，您的内容或账户状态可能需要被处理，以便提供相应功能。",
        ],
      },
      {
        title: "10. 服务变更与可用性",
        body: [
          "我们可能随时更新、增加、删除、暂停或停止某些功能。我们也可能发布改进、修复、价格调整或使用限制，以保护服务质量和安全。",
          "我们会努力保持 SpeakFlow 稳定可靠，但不保证服务始终可用、不中断、安全或完全无错误。",
        ],
      },
      {
        title: "11. 免责声明",
        body: [
          "SpeakFlow 按“现状”和“可用”提供。在法律允许的最大范围内，我们不对适销性、特定用途适用性、不侵权，以及交易过程或商业惯例产生的任何保证承担责任。",
          "我们不保证学习效果、发音评分、AI 建议、翻译或保存的词汇在所有情况下都符合您的期望或完全正确。",
        ],
      },
      {
        title: "12. 责任限制",
        body: [
          "在法律允许的最大范围内，SpeakFlow 及其所有者、员工、承包方和合作方不对间接、附带、特殊、后果性、惩罚性损害，或数据、利润、商誉、商业机会损失承担责任。",
          "如果法律不允许完全排除责任，我们的责任以您在索赔前十二个月内为 SpeakFlow 支付的金额，或法律允许的最低金额为限。",
        ],
      },
      {
        title: "13. 终止",
        body: [
          "您可以随时停止使用 SpeakFlow。如果您违反本协议、造成安全风险，或以可能伤害他人或应用的方式使用服务，我们可以暂停或终止您的访问。",
          "终止后，本协议中有关知识产权、免责声明、责任限制和争议处理的条款仍可继续适用。",
        ],
      },
      {
        title: "14. 协议变更",
        body: [
          "我们可能不时更新本协议。如果变更较为重要，我们会尽量通过应用内或其他适当方式提前通知。",
          "变更生效后您继续使用 SpeakFlow，即表示您接受更新后的协议。",
        ],
      },
      {
        title: "15. 联系我们",
        body: [
          "如果您对本用户协议有任何问题，请通过应用内帮助或报告问题入口联系 SpeakFlow 支持。",
        ],
      },
    ],
    back: "返回",
  },
} as const;

export default function TermsPage() {
  const { language } = useLanguage();
  const copy = termsContent[language];

  return (
    <main className="responsive-page-shell min-h-[100dvh] bg-[linear-gradient(180deg,#d9d1ff_0%,#eeeaff_48%,#f8f6ff_100%)] px-5 py-6 font-[var(--font-sora)] text-[#201833]">
      <div className="mx-auto w-full max-w-3xl pb-16">
        <Link
          href="/speak-english?account=1"
          className="inline-flex min-h-11 items-center rounded-full bg-white/60 px-5 text-sm font-extrabold text-[#5b63ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_24px_rgba(84,72,146,0.12)]"
        >
          {copy.back}
        </Link>

        <header className="pt-9">
          <p className="text-sm font-extrabold text-[#7460e8]">
            SpeakFlow
          </p>
          <h1 className="mt-3 text-[clamp(2.25rem,8vw,4.4rem)] font-black leading-tight text-[#201833]">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm font-bold text-[#7f7896]">
            {copy.updated}
          </p>
          <p className="mt-6 rounded-[24px] bg-white/58 px-5 py-5 text-[1.02rem] font-semibold leading-8 text-[#4b4267] shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
            {copy.intro}
          </p>
        </header>

        <div className="mt-8 grid gap-5">
          {copy.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-[24px] bg-white/52 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_12px_28px_rgba(84,72,146,0.08)]"
            >
              <h2 className="text-[1.18rem] font-black leading-7 text-[#201833]">
                {section.title}
              </h2>
              <div className="mt-3 grid gap-3">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-[0.98rem] font-semibold leading-7 text-[#4b4267]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
