export const SUPPORTED_LANGUAGES = [
  "en",
  "zh-CN",
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "en";
export const LANGUAGE_COOKIE_NAME = "english-app-language";
export const LANGUAGE_STORAGE_KEY = "english-app-language";

export type TranslationValue = string | string[];

export const translations = {
  en: {
    appTitle: "Speak English Out Loud",
    chooseBaseLanguage: "Choose Your Base Language",
    popular: "Popular",
    launchLanguages: "Launch Languages",
    dashboard: "Dashboard",
    signedInUser: "Signed-in user",
    welcomeBack: "Welcome back",
    languageMode: "Language mode",
    currentLanguage: "Current language",
    chineseSimplified: "Chinese (Simplified)",
    english: "English",
    loginTitle: "Sign in",
    signInWithGoogle: "Sign in with Google",
    signInWithEmail: "Sign in with Email",
    createAccount: "Create a new account",
    emailEntryTitle: "Sign in with Email",
    registerTitle: "Create your account",
    emailAddress: "Email Address",
    emailPlaceholder: "Enter your email",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Enter your password again",
    continue: "Continue",
    register: "Create Account",
    back: "Back",
    emailRequired: "Please enter a valid email address.",
    passwordRequired: "Please enter at least 6 characters for your password.",
    passwordMismatch: "The two passwords do not match.",
    emailLoginFailed: "Email sign-in failed. Please try again.",
    emailRegisterFailed: "Registration failed. Please try again.",
    userExists: "This email is already registered.",
    learningWorkspace: "English learning workspace",
    languageIntro:
      "Your selected base language now controls the interface language. We can keep expanding the learning flow from here.",
    quickActions: "Quick Actions",
    quickActionCards: [
      "Build my course",
      "Practice speaking",
      "Vocabulary review",
    ],
    savedLanguage: "Saved preference",
    savedLanguageHint:
      "This choice is stored in your browser and reused on later pages.",
    goHome: "Back to Home",
    signOut: "Sign Out",
  },
  "zh-CN": {
    appTitle: "开口说英语",
    chooseBaseLanguage: "选择你的基础语言",
    popular: "热门语言",
    launchLanguages: "首发语言",
    dashboard: "学习主页",
    signedInUser: "已登录用户",
    welcomeBack: "欢迎回来",
    languageMode: "语言模式",
    currentLanguage: "当前语言",
    chineseSimplified: "简体中文",
    english: "英文",
    loginTitle: "登录",
    signInWithGoogle: "用谷歌登录",
    signInWithEmail: "用邮箱登录",
    createAccount: "新用户注册",
    emailEntryTitle: "用邮箱登录",
    registerTitle: "创建你的账号",
    emailAddress: "邮箱地址",
    emailPlaceholder: "请输入你的邮箱",
    password: "密码",
    passwordPlaceholder: "请输入你的密码",
    confirmPassword: "确认密码",
    confirmPasswordPlaceholder: "请再次输入你的密码",
    continue: "继续",
    register: "注册",
    back: "返回",
    emailRequired: "请输入有效的邮箱地址。",
    passwordRequired: "请输入至少 6 位密码。",
    passwordMismatch: "两次输入的密码不一致。",
    emailLoginFailed: "邮箱登录失败，请重试。",
    emailRegisterFailed: "注册失败，请重试。",
    userExists: "这个邮箱已经注册过了。",
    learningWorkspace: "英语学习工作台",
    languageIntro:
      "你选择的基础语言现在会控制界面语言。后续学习流程也可以继续按这套语言体系扩展。",
    quickActions: "快捷入口",
    quickActionCards: ["制作我的课程", "口语练习", "单词复习"],
    savedLanguage: "已保存偏好",
    savedLanguageHint: "这个选择会保存在浏览器里，后续页面会继续沿用。",
    goHome: "返回首页",
    signOut: "退出登录",
  },
} satisfies Record<AppLanguage, Record<string, TranslationValue>>;

type TranslationMap = typeof translations.en;

export type StringTranslationKey = {
  [K in keyof TranslationMap]: TranslationMap[K] extends string ? K : never;
}[keyof TranslationMap];

export type ArrayTranslationKey = {
  [K in keyof TranslationMap]: TranslationMap[K] extends string[] ? K : never;
}[keyof TranslationMap];

export function isSupportedLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

export function normalizeLanguage(value: string | undefined | null): AppLanguage {
  if (value && isSupportedLanguage(value)) {
    return value;
  }

  return DEFAULT_LANGUAGE;
}
