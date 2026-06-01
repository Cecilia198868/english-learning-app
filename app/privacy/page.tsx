"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

const privacyContent = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: May 23, 2026",
    intro:
      "This Privacy Policy explains how SpeakFlow collects, uses, shares, stores, and protects information when you use our English speaking practice app, including speech practice, AI-assisted expressions, course creation, vocabulary cloud sync, account, subscription, invite friends and referral rewards, interface language, notification inbox, and account management features.",
    sections: [
      {
        title: "1. Information We Collect",
        body: [
          "Account information: your name, email address, profile photo, login provider, and account identifiers when you sign in or create an account.",
          "Learning content: text you type, speech or audio you record, transcripts, generated English expressions, course materials, saved words, saved expressions, practice history, learning progress, and pronunciation or answer feedback.",
          "Device and usage information: app pages you open, feature interactions, invite link and reward interactions, interface language preference, notification inbox interactions, selected voice settings, expression library sync interactions, error information, browser or device type, and similar technical data.",
          "Payment information: if you subscribe or purchase paid features, payment details may be processed by an app store or payment provider. SpeakFlow does not need to store your full card number.",
        ],
      },
      {
        title: "2. How We Use Information",
        body: [
          "We use information to provide SpeakFlow features, including speech recognition, pronunciation practice, AI-assisted expression suggestions, course generation, vocabulary review, account access, saved progress, and customer support.",
          "We may use information to improve app reliability, personalize your learning experience, remember your selected language, show account and referral reward notifications, sync saved vocabulary and expressions, prevent misuse, debug issues, and understand which features are helpful.",
          "We may use account, subscription, and referral reward information to manage billing status, Pro access, purchase restoration, invite rewards, and related notices.",
        ],
      },
      {
        title: "3. Speech, Audio, and AI Features",
        body: [
          "When you use speech or audio features, your audio or transcript may be processed to convert speech to text, generate English practice content, provide feedback, or create learning materials.",
          "When you use AI-assisted features, the text, transcript, or learning context you provide may be sent to AI service providers so they can generate expressions, highlights, definitions, course content, or feedback.",
          "Please do not submit sensitive information that you do not want processed for learning features, such as passwords, government identification numbers, financial account numbers, private medical details, or confidential information.",
        ],
      },
      {
        title: "4. Saved Vocabulary and Learning Records",
        body: [
          "SpeakFlow may save words, expressions, examples, course progress, and review history so you can continue learning across sessions.",
          "Some learning data may be stored locally on your device or browser. If account sync or cloud features are enabled, some data may also be stored through our service providers.",
        ],
      },
      {
        title: "5. How We Share Information",
        body: [
          "We may share information with service providers who help operate SpeakFlow, such as authentication providers, hosting providers, AI providers, speech processing providers, analytics or error monitoring services, and payment processors.",
          "We may share information if required by law, legal process, or a valid government request, or if necessary to protect the rights, safety, and security of users, SpeakFlow, or others.",
          "We do not sell your personal information. We do not use your saved vocabulary or private practice content to show third-party behavioral advertising inside SpeakFlow.",
        ],
      },
      {
        title: "6. Cookies and Local Storage",
        body: [
          "SpeakFlow uses cookies and local storage to remember your selected language, login state, app preferences, voice settings, free usage status, saved vocabulary, progress, expression library sync status, and similar app settings.",
          "You can clear browser storage or cookies through your device or browser settings, but some app features may stop working or reset if you do.",
        ],
      },
      {
        title: "7. Data Retention",
        body: [
          "We keep information for as long as needed to provide the app, maintain your account, comply with legal obligations, resolve disputes, prevent misuse, and improve the service.",
          "Local data stored on your device may remain until you delete it, clear browser storage, remove the app, or use any in-app deletion features that may be available.",
        ],
      },
      {
        title: "8. Your Choices and Rights",
        body: [
          "You may update certain account information, share or stop sharing invite links, change language preferences, review notification inbox messages, delete local browser data, request account deletion, sign out, or stop using SpeakFlow at any time.",
          "Depending on where you live, you may have rights to request access, correction, deletion, portability, or restriction of certain personal information. You may also have the right to object to some processing or withdraw consent where applicable.",
          "To make a privacy request, contact SpeakFlow support through the app's help or report issue options. We may need to verify your identity before fulfilling a request.",
        ],
      },
      {
        title: "9. Security",
        body: [
          "We use reasonable technical and organizational measures designed to protect information. However, no app, website, transmission, or storage system can be guaranteed to be completely secure.",
          "You are responsible for keeping your account credentials secure and for using trusted devices and networks when accessing SpeakFlow.",
        ],
      },
      {
        title: "10. Children",
        body: [
          "SpeakFlow is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information, please contact us so we can take appropriate action.",
        ],
      },
      {
        title: "11. International Users",
        body: [
          "If you use SpeakFlow outside the country where our service providers operate, your information may be processed or stored in another country. Privacy laws may differ from those in your location.",
        ],
      },
      {
        title: "12. Changes to This Policy",
        body: [
          "We may update this Privacy Policy from time to time. If changes are material, we will try to provide reasonable notice in the app or by other appropriate means.",
          "Your continued use of SpeakFlow after an updated Privacy Policy becomes effective means you acknowledge the updated policy.",
        ],
      },
      {
        title: "13. Contact",
        body: [
          "If you have questions about this Privacy Policy or want to make a privacy request, please contact SpeakFlow support through the app's help or report issue options.",
        ],
      },
    ],
    back: "Back",
  },
  "zh-CN": {
    title: "隐私政策",
    updated: "最后更新日期：2026 年 5 月 23 日",
    intro:
      "本隐私政策说明您使用 SpeakFlow 英语口语练习应用时，我们如何收集、使用、共享、存储和保护信息，包括口语练习、AI 辅助表达、课程生成、表达库云同步、账户、订阅、邀请好友与邀请奖励、界面语言、通知收件箱和账号管理功能。",
    sections: [
      {
        title: "1. 我们收集的信息",
        body: [
          "账户信息：当您登录或创建账户时，我们可能收集您的姓名、邮箱地址、头像、登录服务提供商和账户标识符。",
          "学习内容：您输入的文字、录制的语音或音频、转写文本、生成的英文表达、课程材料、保存的单词、保存的表达、练习记录、学习进度、发音或答题反馈。",
          "设备和使用信息：您打开的页面、功能交互、邀请链接和奖励交互、界面语言偏好、通知收件箱交互、选择的语音设置、表达库同步操作、错误信息、浏览器或设备类型，以及类似技术数据。",
          "付款信息：如果您订阅或购买付费功能，付款详情可能由应用商店或支付服务商处理。SpeakFlow 不需要保存您的完整银行卡号。",
        ],
      },
      {
        title: "2. 我们如何使用信息",
        body: [
          "我们使用信息来提供 SpeakFlow 功能，包括语音识别、发音练习、AI 辅助表达建议、课程生成、词汇复习、账户访问、进度保存和客户支持。",
          "我们可能使用信息来提升应用稳定性、个性化学习体验、记住您的语言选择、显示账户和邀请奖励通知、同步保存的词汇和表达、防止滥用、排查问题，并了解哪些功能对用户有帮助。",
          "我们可能使用账户、订阅和邀请奖励信息来管理账单状态、Pro 权限、恢复购买、邀请奖励以及相关通知。",
        ],
      },
      {
        title: "3. 语音、音频与 AI 功能",
        body: [
          "当您使用语音或音频功能时，您的音频或转写文本可能会被处理，用于语音转文字、生成英文练习内容、提供反馈或创建学习材料。",
          "当您使用 AI 辅助功能时，您提供的文字、转写内容或学习上下文可能会发送给 AI 服务提供商，以生成表达、重点词组、释义、课程内容或反馈。",
          "请不要提交您不希望被用于学习功能处理的敏感信息，例如密码、政府身份证号码、金融账户号码、私人医疗细节或机密信息。",
        ],
      },
      {
        title: "4. 表达库与学习记录",
        body: [
          "SpeakFlow 可能保存单词、表达、例句、课程进度和复习记录，方便您下次继续学习。",
          "部分学习数据可能保存在您的设备或浏览器本地。如果启用了账户同步或云端功能，部分数据也可能通过我们的服务提供商保存。",
        ],
      },
      {
        title: "5. 我们如何共享信息",
        body: [
          "我们可能与帮助运营 SpeakFlow 的服务提供商共享信息，例如身份验证服务、托管服务、AI 服务、语音处理服务、分析或错误监控服务以及支付处理方。",
          "如果法律、法律程序或有效政府请求要求，或为了保护用户、SpeakFlow 或他人的权利、安全和保障，我们也可能共享信息。",
          "我们不会出售您的个人信息。我们不会使用您保存的词汇或私人练习内容在 SpeakFlow 内展示第三方行为广告。",
        ],
      },
      {
        title: "6. Cookie 与本地存储",
        body: [
          "SpeakFlow 使用 Cookie 和本地存储来记住您的语言选择、登录状态、应用偏好、语音设置、免费使用状态、保存的词汇、学习进度、表达库同步状态和类似应用设置。",
          "您可以通过设备或浏览器设置清除浏览器存储或 Cookie，但清除后部分功能可能停止工作或被重置。",
        ],
      },
      {
        title: "7. 数据保留",
        body: [
          "我们会在提供应用、维护账户、履行法律义务、解决争议、防止滥用和改进服务所需的期间内保留信息。",
          "保存在您设备上的本地数据可能会一直保留，直到您删除、清除浏览器存储、移除应用，或使用应用内可能提供的删除功能。",
        ],
      },
      {
        title: "8. 您的选择和权利",
        body: [
          "您可以更新部分账户信息、分享或停止分享邀请链接、更改语言偏好、查看通知收件箱消息、删除本地浏览器数据、申请删除账号、退出登录，或随时停止使用 SpeakFlow。",
          "根据您所在地区的法律，您可能有权请求访问、更正、删除、导出或限制处理某些个人信息，也可能有权反对某些处理或在适用情况下撤回同意。",
          "如需提出隐私请求，请通过应用内帮助或报告问题入口联系 SpeakFlow 支持。我们可能需要先验证您的身份。",
        ],
      },
      {
        title: "9. 安全",
        body: [
          "我们采用合理的技术和组织措施来保护信息。但任何应用、网站、传输或存储系统都无法保证绝对安全。",
          "您需要妥善保管账户凭证，并尽量使用可信设备和网络访问 SpeakFlow。",
        ],
      },
      {
        title: "10. 儿童",
        body: [
          "SpeakFlow 不面向 13 岁以下儿童。我们不会故意收集 13 岁以下儿童的个人信息。如果您认为儿童向我们提供了个人信息，请联系我们，以便我们采取适当措施。",
        ],
      },
      {
        title: "11. 国际用户",
        body: [
          "如果您在我们的服务提供商所在国家以外使用 SpeakFlow，您的信息可能会在其他国家被处理或存储。当地隐私法律可能与您所在地区不同。",
        ],
      },
      {
        title: "12. 本政策的变更",
        body: [
          "我们可能不时更新本隐私政策。如果变更较为重要，我们会尽量通过应用内或其他适当方式提前通知。",
          "更新后的隐私政策生效后，您继续使用 SpeakFlow 即表示您知悉更新后的政策。",
        ],
      },
      {
        title: "13. 联系我们",
        body: [
          "如果您对本隐私政策有疑问，或希望提出隐私请求，请通过应用内帮助或报告问题入口联系 SpeakFlow 支持。",
        ],
      },
    ],
    back: "返回",
  },
} as const;

export default function PrivacyPage() {
  const { language } = useLanguage();
  const copy = privacyContent[language];

  return (
    <main className="responsive-page-shell min-h-[100dvh] bg-[linear-gradient(180deg,#d9d1ff_0%,#eeeaff_48%,#f8f6ff_100%)] px-5 py-6 font-[var(--font-sora)] text-[#201833]">
      <div className="mx-auto w-full max-w-3xl pb-16">
        <Link
          href="/account"
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
