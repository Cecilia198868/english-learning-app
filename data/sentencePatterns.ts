import { confidentExpressionSections } from "@/data/confidentExpressionSentencePatterns";
import { idiomaticAdvancedSections } from "@/data/idiomaticAdvancedSentencePatterns";
import { dailyOpeningSections } from "@/data/dailyOpeningSentencePatterns";
import { normalizeExpressionVariantMap } from "@/lib/expressionVariantFallbacks";

export type SentencePatternLevelId = "basic" | "intermediate" | "advanced";

export type SentencePatternTone = "green" | "purple" | "orange";

export type SentencePattern = {
  examples?: SentencePatternPracticeExample[];
  id: number;
  practices?: SentencePatternPractice[];
  text: string;
};

export type SentencePatternPracticeExample = {
  chinese: string;
  sceneKey?: string;
  targetEnglish: string;
  theme?: string;
};

export type SentencePatternPractice = {
  chinese: string;
  id: number;
  idiomatic: string;
  natural: string;
  recommended: string;
  sceneKey?: string;
  simple: string;
  targetEnglish: string;
  theme?: string;
};

export type SentencePatternSection = {
  englishTitle: string;
  id: string;
  range: string;
  title: string;
  patterns: SentencePattern[];
};

export type SentencePatternLevel = {
  id: SentencePatternLevelId;
  badge: string;
  benefit: string;
  cardTitle: string;
  exampleCount: number;
  heroTitle: string;
  icon: "sprout" | "rocket" | "trophy";
  menuTitle: string;
  sectionSubtitle: string;
  stats: [string, string, string];
  subtitle: string;
  suggestion: string;
  tone: SentencePatternTone;
  totalPatterns: number;
  sections: SentencePatternSection[];
};

const basicSections: SentencePatternSection[] = dailyOpeningSections;

type BasicPracticeDraft = {
  chinese: string;
  sceneKey?: string;
  targetEnglish: string;
  theme?: string;
};

const sentencePatternManualExamples: Partial<
  Record<SentencePatternLevelId, Partial<Record<number, SentencePatternPracticeExample[]>>>
> = {
  basic: {
    2: [
      {
        chinese: "我想学游泳。",
        sceneKey: "hobby-learn-swimming",
        targetEnglish: "I'd like to learn how to swim.",
        theme: "兴趣爱好",
      },
      {
        chinese: "我想喝杯咖啡。",
        sceneKey: "food-have-coffee",
        targetEnglish: "I'd like to have a cup of coffee.",
        theme: "饮食",
      },
      {
        chinese: "我想早点回家。",
        sceneKey: "housing-go-home-early",
        targetEnglish: "I'd like to go home early.",
        theme: "住房生活",
      },
      {
        chinese: "我想换个工作。",
        sceneKey: "work-change-jobs",
        targetEnglish: "I'd like to change jobs.",
        theme: "工作",
      },
      {
        chinese: "我想周末去海边。",
        sceneKey: "travel-weekend-beach",
        targetEnglish: "I'd like to go to the beach this weekend.",
        theme: "旅游",
      },
      {
        chinese: "我想试试这件外套。",
        sceneKey: "shopping-try-jacket",
        targetEnglish: "I'd like to try on this jacket.",
        theme: "购物",
      },
      {
        chinese: "我想预订一张火车票。",
        sceneKey: "traffic-book-train-ticket",
        targetEnglish: "I'd like to book a train ticket.",
        theme: "交通",
      },
      {
        chinese: "我想和朋友吃晚饭。",
        sceneKey: "friends-dinner",
        targetEnglish: "I'd like to have dinner with my friends.",
        theme: "朋友社交",
      },
      {
        chinese: "我想把手机照片备份一下。",
        sceneKey: "phone-backup-photos",
        targetEnglish: "I'd like to back up my phone photos.",
        theme: "手机电脑",
      },
      {
        chinese: "我想报名瑜伽课。",
        sceneKey: "sports-yoga-class",
        targetEnglish: "I'd like to sign up for a yoga class.",
        theme: "运动",
      },
    ],
  },
};

type BasicPracticeTopic = {
  action: string;
  apologyAction: string;
  benefit: string;
  clause: string;
  difficultNoun: string;
  emotion: string;
  gerund: string;
  idiomatic: string;
  method: string;
  moreFirst: string;
  moreSecond: string;
  noun: string;
  optionA: string;
  optionB: string;
  pastParticiple: string;
  pastSimple: string;
  problem: string;
  reason: string;
  result: string;
  sceneKey?: string;
  simple: string;
  theme?: string;
  timePoint: string;
  whenClause: string;
  zhAction: string;
  zhApologyAction: string;
  zhBenefit: string;
  zhClause: string;
  zhDifficultNoun: string;
  zhEmotion: string;
  zhGerund: string;
  zhMethod: string;
  zhMoreFirst: string;
  zhMoreSecond: string;
  zhNoun: string;
  zhOptionA: string;
  zhOptionB: string;
  zhPastParticiple: string;
  zhPastSimple: string;
  zhProblem: string;
  zhReason: string;
  zhResult: string;
  zhTimePoint: string;
  zhWhenClause: string;
};

type PracticeSceneSeed = {
  action: string;
  benefit: string;
  category: string;
  clause: string;
  emotion: string;
  key: string;
  noun: string;
  problem: string;
  reason: string;
  result: string;
  zhAction: string;
  zhBenefit: string;
  zhClause: string;
  zhEmotion: string;
  zhNoun: string;
  zhProblem: string;
  zhReason: string;
  zhResult: string;
};

const COURSE_PRACTICES_PER_PATTERN = 10;
const MIN_MANUAL_EXAMPLES_PER_PATTERN = 10;

const basicPracticeTopics: BasicPracticeTopic[] = [
  {
    action: "finish this project before Friday",
    apologyAction: "keep you waiting for the update",
    benefit: "gives the whole team peace of mind",
    clause: "we can finish this project before Friday",
    difficultNoun: "a stressful deadline at work",
    emotion: "nervous",
    gerund: "finishing this project before Friday",
    idiomatic: "I need a little more breathing room on this project.",
    method: "sending a short message every Friday",
    moreFirst: "I plan ahead",
    moreSecond: "relaxed I feel",
    noun: "more time for this project",
    optionA: "planning ahead",
    optionB: "rushing at the last minute",
    pastParticiple: "finished a project under pressure",
    pastSimple: "stayed late to finish a report",
    problem: "the deadline is too close",
    reason: "the deadline is getting close",
    result: "we can avoid extra stress",
    simple: "I need more time for this project.",
    timePoint: "a new employee",
    whenClause: "my deadline gets close",
    zhAction: "在周五前完成这个项目",
    zhApologyAction: "让你一直等更新",
    zhBenefit: "让整个团队更安心",
    zhClause: "我们能在周五前完成这个项目",
    zhDifficultNoun: "一个压力很大的工作截止日期",
    zhEmotion: "紧张",
    zhGerund: "在周五前完成这个项目",
    zhMethod: "每周五发一条简短消息",
    zhMoreFirst: "我提前计划",
    zhMoreSecond: "我越放松",
    zhNoun: "这个项目更多的时间",
    zhOptionA: "提前计划",
    zhOptionB: "最后一刻匆忙完成",
    zhPastParticiple: "在压力下完成过一个项目",
    zhPastSimple: "加班完成了一份报告",
    zhProblem: "截止日期太近了",
    zhReason: "截止日期越来越近",
    zhResult: "我们可以避免额外压力",
    zhTimePoint: "刚入职的时候",
    zhWhenClause: "截止日期临近时",
  },
  {
    action: "get honest feedback on my presentation",
    apologyAction: "send the slides so late",
    benefit: "helps me speak more clearly next time",
    clause: "I can improve my presentation before the meeting",
    difficultNoun: "a presentation in front of senior managers",
    emotion: "anxious",
    gerund: "getting honest feedback on my presentation",
    idiomatic: "I could really use some honest feedback on my presentation.",
    method: "sharing comments in the document",
    moreFirst: "I practice my presentation",
    moreSecond: "confident I become",
    noun: "honest feedback on my presentation",
    optionA: "clear feedback",
    optionB: "polite silence",
    pastParticiple: "given a presentation in English",
    pastSimple: "presented my idea to the team",
    problem: "my presentation is not clear enough",
    reason: "I want to make my message easier to understand",
    result: "I can make the slides stronger",
    simple: "I need feedback on my presentation.",
    timePoint: "in my first month at work",
    whenClause: "people ask questions after my presentation",
    zhAction: "得到关于我演讲的诚实反馈",
    zhApologyAction: "这么晚才发幻灯片",
    zhBenefit: "帮助我下次说得更清楚",
    zhClause: "我可以在会议前改进我的演讲",
    zhDifficultNoun: "在高层经理面前做演讲",
    zhEmotion: "焦虑",
    zhGerund: "得到关于我演讲的诚实反馈",
    zhMethod: "在文档里分享评论",
    zhMoreFirst: "我越练习演讲",
    zhMoreSecond: "我越自信",
    zhNoun: "关于我演讲的诚实反馈",
    zhOptionA: "清楚的反馈",
    zhOptionB: "礼貌地沉默",
    zhPastParticiple: "用英语做过演讲",
    zhPastSimple: "向团队展示了我的想法",
    zhProblem: "我的演讲还不够清楚",
    zhReason: "我想让信息更容易理解",
    zhResult: "我可以把幻灯片做得更好",
    zhTimePoint: "入职第一个月的时候",
    zhWhenClause: "演讲后有人提问时",
  },
  {
    action: "find a new apartment closer to my office",
    apologyAction: "cancel the apartment visit",
    benefit: "saves me a lot of commuting time",
    clause: "I can move closer to my office this summer",
    difficultNoun: "a long commute every morning",
    emotion: "frustrated",
    gerund: "finding a new apartment closer to my office",
    idiomatic: "I am trying to find a place closer to work.",
    method: "checking apartment listings online",
    moreFirst: "I compare different apartments",
    moreSecond: "sure I feel about the choice",
    noun: "a new apartment closer to my office",
    optionA: "living near work",
    optionB: "spending hours commuting",
    pastParticiple: "moved to a new apartment before",
    pastSimple: "visited three apartments in one afternoon",
    problem: "my current apartment is too far from work",
    reason: "my commute takes too much time",
    result: "I can have more time after work",
    simple: "I want an apartment near my office.",
    timePoint: "when I lived far from work",
    whenClause: "traffic is heavy in the morning",
    zhAction: "找到一套离办公室更近的新公寓",
    zhApologyAction: "取消看房",
    zhBenefit: "节省我很多通勤时间",
    zhClause: "我今年夏天可以搬到离办公室更近的地方",
    zhDifficultNoun: "每天早上的长时间通勤",
    zhEmotion: "沮丧",
    zhGerund: "找到一套离办公室更近的新公寓",
    zhMethod: "在网上查看公寓信息",
    zhMoreFirst: "我比较的公寓越多",
    zhMoreSecond: "我对选择越确定",
    zhNoun: "一套离办公室更近的新公寓",
    zhOptionA: "住在公司附近",
    zhOptionB: "花几个小时通勤",
    zhPastParticiple: "以前搬过新公寓",
    zhPastSimple: "一个下午看了三套公寓",
    zhProblem: "我现在的公寓离公司太远",
    zhReason: "我的通勤花太多时间",
    zhResult: "我下班后能有更多时间",
    zhTimePoint: "我住得离公司很远的时候",
    zhWhenClause: "早上交通拥堵时",
  },
  {
    action: "learn how to cook healthy meals",
    apologyAction: "make dinner so late",
    benefit: "makes my daily routine healthier",
    clause: "I can cook healthier meals at home",
    difficultNoun: "eating takeout every day",
    emotion: "motivated",
    gerund: "learning how to cook healthy meals",
    idiomatic: "I want to get better at making healthy food at home.",
    method: "sharing simple recipes with each other",
    moreFirst: "I cook at home",
    moreSecond: "healthier I feel",
    noun: "a simple healthy meal plan",
    optionA: "cooking at home",
    optionB: "ordering takeout every night",
    pastParticiple: "cooked a healthy dinner before",
    pastSimple: "made a healthy lunch for myself",
    problem: "I eat too much takeout",
    reason: "I want to take better care of my health",
    result: "I can feel better every day",
    simple: "I want to cook healthy meals.",
    timePoint: "when I first lived alone",
    whenClause: "I have time after work",
    zhAction: "学习如何做健康餐",
    zhApologyAction: "这么晚才做晚饭",
    zhBenefit: "让我的日常生活更健康",
    zhClause: "我可以在家做更健康的饭",
    zhDifficultNoun: "每天吃外卖",
    zhEmotion: "有动力",
    zhGerund: "学习如何做健康餐",
    zhMethod: "互相分享简单食谱",
    zhMoreFirst: "我在家做饭越多",
    zhMoreSecond: "我感觉越健康",
    zhNoun: "一个简单的健康饮食计划",
    zhOptionA: "在家做饭",
    zhOptionB: "每天晚上点外卖",
    zhPastParticiple: "以前做过健康晚餐",
    zhPastSimple: "给自己做了一份健康午餐",
    zhProblem: "我吃太多外卖",
    zhReason: "我想更好地照顾自己的健康",
    zhResult: "我每天都能感觉更好",
    zhTimePoint: "我第一次独居的时候",
    zhWhenClause: "下班后有时间时",
  },
  {
    action: "get a good night’s sleep",
    apologyAction: "miss your call last night",
    benefit: "helps me focus the next day",
    clause: "I can sleep earlier tonight",
    difficultNoun: "a week with very little sleep",
    emotion: "exhausted",
    gerund: "getting a good night’s sleep",
    idiomatic: "I really need a solid night of sleep.",
    method: "turning off my phone before bed",
    moreFirst: "I sleep earlier",
    moreSecond: "focused I am the next day",
    noun: "a good night’s sleep",
    optionA: "sleeping early",
    optionB: "staying up late",
    pastParticiple: "slept well after a busy week",
    pastSimple: "went to bed before ten",
    problem: "I have not been sleeping enough",
    reason: "I have been tired all week",
    result: "I can focus better tomorrow",
    simple: "I need a good night’s sleep.",
    timePoint: "during a busy week",
    whenClause: "I stay up too late",
    zhAction: "好好睡一觉",
    zhApologyAction: "昨晚没接到你的电话",
    zhBenefit: "帮助我第二天集中注意力",
    zhClause: "我今晚可以早点睡",
    zhDifficultNoun: "睡眠很少的一周",
    zhEmotion: "疲惫",
    zhGerund: "好好睡一觉",
    zhMethod: "睡前关掉手机",
    zhMoreFirst: "我睡得越早",
    zhMoreSecond: "第二天越专注",
    zhNoun: "一晚好觉",
    zhOptionA: "早点睡觉",
    zhOptionB: "熬夜",
    zhPastParticiple: "忙碌一周后睡过好觉",
    zhPastSimple: "十点前上床睡觉",
    zhProblem: "我最近睡得不够",
    zhReason: "我这一周都很累",
    zhResult: "我明天能更专注",
    zhTimePoint: "忙碌的一周里",
    zhWhenClause: "我熬夜太晚时",
  },
  {
    action: "improve my English speaking skills",
    apologyAction: "speak too fast in English",
    benefit: "makes daily conversations easier",
    clause: "I can speak English more confidently",
    difficultNoun: "speaking English in a real conversation",
    emotion: "hopeful",
    gerund: "improving my English speaking skills",
    idiomatic: "I want to get more comfortable speaking English.",
    method: "practicing voice messages every day",
    moreFirst: "I practice speaking",
    moreSecond: "natural my English sounds",
    noun: "better English speaking skills",
    optionA: "daily speaking practice",
    optionB: "only memorizing words",
    pastParticiple: "spoken English with a stranger before",
    pastSimple: "joined an English conversation group",
    problem: "I feel shy when I speak English",
    reason: "I want to communicate more naturally",
    result: "I can join more conversations",
    simple: "I want to speak English better.",
    timePoint: "when I started learning English",
    whenClause: "someone asks me a question in English",
    zhAction: "提高我的英语口语能力",
    zhApologyAction: "英语说得太快",
    zhBenefit: "让日常对话更轻松",
    zhClause: "我可以更自信地说英语",
    zhDifficultNoun: "在真实对话中说英语",
    zhEmotion: "有希望",
    zhGerund: "提高我的英语口语能力",
    zhMethod: "每天练习语音消息",
    zhMoreFirst: "我练口语越多",
    zhMoreSecond: "我的英语听起来越自然",
    zhNoun: "更好的英语口语能力",
    zhOptionA: "每天练口语",
    zhOptionB: "只背单词",
    zhPastParticiple: "以前和陌生人说过英语",
    zhPastSimple: "加入了一个英语对话小组",
    zhProblem: "我说英语时会害羞",
    zhReason: "我想更自然地交流",
    zhResult: "我可以参与更多对话",
    zhTimePoint: "刚开始学英语的时候",
    zhWhenClause: "有人用英语问我问题时",
  },
  {
    action: "spend more quality time with my parents",
    apologyAction: "forget our family dinner",
    benefit: "brings my family closer",
    clause: "I can spend more quality time with my parents",
    difficultNoun: "being away from my family for months",
    emotion: "grateful",
    gerund: "spending more quality time with my parents",
    idiomatic: "I want to make more real time for my family.",
    method: "having a video call every Sunday",
    moreFirst: "I talk with my parents",
    moreSecond: "connected I feel",
    noun: "more quality time with my parents",
    optionA: "family time",
    optionB: "being busy all weekend",
    pastParticiple: "visited my parents for a weekend before",
    pastSimple: "called my parents after dinner",
    problem: "I do not see my parents often enough",
    reason: "family time matters to me",
    result: "we can feel closer",
    simple: "I want more time with my parents.",
    timePoint: "when I moved away from home",
    whenClause: "my parents need help",
    zhAction: "和父母多一些高质量相处时间",
    zhApologyAction: "忘了家庭聚餐",
    zhBenefit: "让我的家人更亲近",
    zhClause: "我可以和父母多一些高质量相处时间",
    zhDifficultNoun: "几个月不能陪伴家人",
    zhEmotion: "感激",
    zhGerund: "和父母多一些高质量相处时间",
    zhMethod: "每周日视频通话",
    zhMoreFirst: "我和父母交流越多",
    zhMoreSecond: "我越有连接感",
    zhNoun: "和父母更多的高质量时间",
    zhOptionA: "家庭时间",
    zhOptionB: "整个周末都很忙",
    zhPastParticiple: "以前周末回去看过父母",
    zhPastSimple: "晚饭后给父母打了电话",
    zhProblem: "我见父母不够频繁",
    zhReason: "家庭时间对我很重要",
    zhResult: "我们会感觉更亲近",
    zhTimePoint: "我离家生活的时候",
    zhWhenClause: "父母需要帮助时",
  },
  {
    action: "get financial advice about my savings",
    apologyAction: "forget to bring the bank documents",
    benefit: "helps me manage my money better",
    clause: "I can manage my savings more wisely",
    difficultNoun: "making a big financial decision alone",
    emotion: "careful",
    gerund: "getting financial advice about my savings",
    idiomatic: "I need some guidance on how to handle my savings.",
    method: "checking my budget once a week",
    moreFirst: "I track my spending",
    moreSecond: "control I have over my money",
    noun: "financial advice about my savings",
    optionA: "saving regularly",
    optionB: "spending without a plan",
    pastParticiple: "opened a savings account before",
    pastSimple: "made a monthly budget",
    problem: "I do not have a clear savings plan",
    reason: "I want to manage my money better",
    result: "I can save more each month",
    simple: "I need financial advice.",
    timePoint: "when I got my first salary",
    whenClause: "I have to make a money decision",
    zhAction: "得到关于储蓄的理财建议",
    zhApologyAction: "忘了带银行文件",
    zhBenefit: "帮助我更好地管理钱",
    zhClause: "我可以更明智地管理储蓄",
    zhDifficultNoun: "独自做一个重大的财务决定",
    zhEmotion: "谨慎",
    zhGerund: "得到关于储蓄的理财建议",
    zhMethod: "每周检查一次预算",
    zhMoreFirst: "我记录开支越多",
    zhMoreSecond: "我对钱越有掌控感",
    zhNoun: "关于储蓄的理财建议",
    zhOptionA: "定期储蓄",
    zhOptionB: "没有计划地花钱",
    zhPastParticiple: "以前开过储蓄账户",
    zhPastSimple: "做了一个月度预算",
    zhProblem: "我没有清晰的储蓄计划",
    zhReason: "我想更好地管理钱",
    zhResult: "我每个月能存更多钱",
    zhTimePoint: "我拿到第一份工资的时候",
    zhWhenClause: "我必须做金钱决定时",
  },
  {
    action: "buy a reliable car",
    apologyAction: "arrive late because of my car",
    benefit: "makes my commute safer",
    clause: "I can buy a reliable car this year",
    difficultNoun: "a car that breaks down often",
    emotion: "worried",
    gerund: "buying a reliable car",
    idiomatic: "I need a car I can actually count on.",
    method: "reading real owner reviews",
    moreFirst: "I compare car reviews",
    moreSecond: "confident I feel about buying",
    noun: "a reliable car",
    optionA: "a reliable used car",
    optionB: "a cheap car with problems",
    pastParticiple: "driven an old car before",
    pastSimple: "took my car to the repair shop",
    problem: "my car breaks down too often",
    reason: "I need a safe way to commute",
    result: "I can get to work on time",
    simple: "I need a reliable car.",
    timePoint: "when I first bought a car",
    whenClause: "my car makes a strange noise",
    zhAction: "买一辆可靠的车",
    zhApologyAction: "因为车的问题迟到",
    zhBenefit: "让我的通勤更安全",
    zhClause: "我今年可以买一辆可靠的车",
    zhDifficultNoun: "一辆经常出故障的车",
    zhEmotion: "担心",
    zhGerund: "买一辆可靠的车",
    zhMethod: "阅读真实车主评价",
    zhMoreFirst: "我比较车评越多",
    zhMoreSecond: "我买车时越有信心",
    zhNoun: "一辆可靠的车",
    zhOptionA: "一辆可靠的二手车",
    zhOptionB: "一辆便宜但问题很多的车",
    zhPastParticiple: "以前开过旧车",
    zhPastSimple: "把车送去了修理店",
    zhProblem: "我的车太经常出故障",
    zhReason: "我需要安全的通勤方式",
    zhResult: "我可以准时上班",
    zhTimePoint: "我第一次买车的时候",
    zhWhenClause: "我的车发出奇怪声音时",
  },
  {
    action: "take a short break from social media",
    apologyAction: "reply to your message so late",
    benefit: "helps me clear my mind",
    clause: "I can take a short break from social media",
    difficultNoun: "too much time on social media",
    emotion: "overwhelmed",
    gerund: "taking a short break from social media",
    idiomatic: "I need to step away from social media for a bit.",
    method: "checking messages only twice a day",
    moreFirst: "I spend less time online",
    moreSecond: "peaceful my mind feels",
    noun: "a short break from social media",
    optionA: "offline time",
    optionB: "scrolling all night",
    pastParticiple: "deleted social apps for a week before",
    pastSimple: "turned off my notifications",
    problem: "social media takes too much of my attention",
    reason: "I need to clear my mind",
    result: "I can focus on real life",
    simple: "I need a break from social media.",
    timePoint: "during a stressful month",
    whenClause: "I scroll for too long",
    zhAction: "短暂远离社交媒体",
    zhApologyAction: "这么晚才回复你的消息",
    zhBenefit: "帮助我清理思绪",
    zhClause: "我可以短暂远离社交媒体",
    zhDifficultNoun: "在社交媒体上花太多时间",
    zhEmotion: "不堪重负",
    zhGerund: "短暂远离社交媒体",
    zhMethod: "每天只查看两次消息",
    zhMoreFirst: "我上网时间越少",
    zhMoreSecond: "我的心越平静",
    zhNoun: "短暂远离社交媒体",
    zhOptionA: "离线时间",
    zhOptionB: "整晚刷手机",
    zhPastParticiple: "以前删除过社交软件一周",
    zhPastSimple: "关掉了通知",
    zhProblem: "社交媒体占用了我太多注意力",
    zhReason: "我需要清理思绪",
    zhResult: "我可以专注于真实生活",
    zhTimePoint: "压力很大的一个月里",
    zhWhenClause: "我刷手机太久时",
  },
  {
    action: "find a partner who supports my dreams",
    apologyAction: "hide my feelings from you",
    benefit: "makes me feel understood",
    clause: "I can be with someone who supports my dreams",
    difficultNoun: "a relationship without real support",
    emotion: "hopeful",
    gerund: "finding a partner who supports my dreams",
    idiomatic: "I want someone who is truly on my side.",
    method: "talking honestly about our goals",
    moreFirst: "we talk honestly",
    moreSecond: "secure I feel",
    noun: "a partner who supports my dreams",
    optionA: "honest support",
    optionB: "empty promises",
    pastParticiple: "shared my dream with someone before",
    pastSimple: "talked about my future plans",
    problem: "I do not feel fully supported",
    reason: "support matters in a relationship",
    result: "I can be more confident about my dreams",
    simple: "I want a supportive partner.",
    timePoint: "when I started a serious relationship",
    whenClause: "I talk about my dreams",
    zhAction: "找到一个支持我梦想的伴侣",
    zhApologyAction: "对你隐藏我的感受",
    zhBenefit: "让我感觉被理解",
    zhClause: "我可以和支持我梦想的人在一起",
    zhDifficultNoun: "一段没有真正支持的关系",
    zhEmotion: "有希望",
    zhGerund: "找到一个支持我梦想的伴侣",
    zhMethod: "诚实地谈论我们的目标",
    zhMoreFirst: "我们越诚实交流",
    zhMoreSecond: "我越有安全感",
    zhNoun: "一个支持我梦想的伴侣",
    zhOptionA: "真诚的支持",
    zhOptionB: "空洞的承诺",
    zhPastParticiple: "以前和别人分享过我的梦想",
    zhPastSimple: "谈过我的未来计划",
    zhProblem: "我感觉没有被完全支持",
    zhReason: "支持在关系里很重要",
    zhResult: "我可以对自己的梦想更有信心",
    zhTimePoint: "我开始一段认真关系的时候",
    zhWhenClause: "我谈论梦想时",
  },
  {
    action: "make a clear plan for my future career",
    apologyAction: "change my career plan again",
    benefit: "keeps me moving in the right direction",
    clause: "I can make a clear plan for my future career",
    difficultNoun: "choosing a career path",
    emotion: "uncertain",
    gerund: "making a clear plan for my future career",
    idiomatic: "I need a clearer roadmap for my career.",
    method: "reviewing my goals every month",
    moreFirst: "I understand my goals",
    moreSecond: "clear my next step becomes",
    noun: "a clear plan for my future career",
    optionA: "a clear career plan",
    optionB: "waiting without direction",
    pastParticiple: "changed my career direction before",
    pastSimple: "asked a mentor for career advice",
    problem: "my career direction is not clear",
    reason: "I want to grow with purpose",
    result: "I can choose my next step more wisely",
    simple: "I need a clear career plan.",
    timePoint: "after graduation",
    whenClause: "I think about my future",
    zhAction: "为未来职业做一个清晰计划",
    zhApologyAction: "又改变职业计划",
    zhBenefit: "让我朝正确方向前进",
    zhClause: "我可以为未来职业做一个清晰计划",
    zhDifficultNoun: "选择职业道路",
    zhEmotion: "不确定",
    zhGerund: "为未来职业做一个清晰计划",
    zhMethod: "每个月回顾我的目标",
    zhMoreFirst: "我越了解自己的目标",
    zhMoreSecond: "下一步越清楚",
    zhNoun: "未来职业的清晰计划",
    zhOptionA: "清晰的职业计划",
    zhOptionB: "没有方向地等待",
    zhPastParticiple: "以前改变过职业方向",
    zhPastSimple: "向导师请教了职业建议",
    zhProblem: "我的职业方向不清楚",
    zhReason: "我想有目标地成长",
    zhResult: "我可以更明智地选择下一步",
    zhTimePoint: "毕业之后",
    zhWhenClause: "我思考未来时",
  },
  {
    action: "solve this customer issue quickly",
    apologyAction: "make the customer wait",
    benefit: "protects the customer’s trust",
    clause: "we can solve this customer issue quickly",
    difficultNoun: "an unhappy customer on the phone",
    emotion: "responsible",
    gerund: "solving this customer issue quickly",
    idiomatic: "We need to get this customer issue sorted out quickly.",
    method: "following up by email after the call",
    moreFirst: "we listen carefully",
    moreSecond: "trust the customer feels",
    noun: "a quick solution for this customer issue",
    optionA: "a quick follow-up",
    optionB: "ignoring the complaint",
    pastParticiple: "handled a customer complaint before",
    pastSimple: "called the customer back right away",
    problem: "the customer has not received an answer",
    reason: "the customer needs help now",
    result: "we can keep the customer’s trust",
    simple: "We need to help the customer quickly.",
    timePoint: "during my first customer service shift",
    whenClause: "a customer sounds upset",
    zhAction: "快速解决这个客户问题",
    zhApologyAction: "让客户等待",
    zhBenefit: "保护客户的信任",
    zhClause: "我们可以快速解决这个客户问题",
    zhDifficultNoun: "电话里一位不满意的客户",
    zhEmotion: "有责任感",
    zhGerund: "快速解决这个客户问题",
    zhMethod: "通话后用邮件跟进",
    zhMoreFirst: "我们听得越认真",
    zhMoreSecond: "客户越信任我们",
    zhNoun: "这个客户问题的快速解决方案",
    zhOptionA: "快速跟进",
    zhOptionB: "忽视投诉",
    zhPastParticiple: "以前处理过客户投诉",
    zhPastSimple: "马上给客户回了电话",
    zhProblem: "客户还没有得到答复",
    zhReason: "客户现在需要帮助",
    zhResult: "我们可以保持客户的信任",
    zhTimePoint: "我第一次做客服班的时候",
    zhWhenClause: "客户听起来很不满时",
  },
  {
    action: "make a doctor’s appointment this week",
    apologyAction: "miss my appointment",
    benefit: "helps me take care of my health early",
    clause: "I can make a doctor’s appointment this week",
    difficultNoun: "waiting too long to see a doctor",
    emotion: "concerned",
    gerund: "making a doctor’s appointment this week",
    idiomatic: "I should get this checked by a doctor this week.",
    method: "booking the appointment online",
    moreFirst: "I take care of small symptoms early",
    moreSecond: "safe I feel",
    noun: "a doctor’s appointment this week",
    optionA: "seeing a doctor early",
    optionB: "ignoring the symptoms",
    pastParticiple: "visited a clinic before",
    pastSimple: "booked a doctor’s appointment online",
    problem: "my cough has not gone away",
    reason: "I do not want the symptom to get worse",
    result: "I can get proper advice early",
    simple: "I need a doctor’s appointment.",
    timePoint: "when I felt sick last winter",
    whenClause: "my symptoms last for several days",
    zhAction: "这周预约医生",
    zhApologyAction: "错过我的预约",
    zhBenefit: "帮助我及早照顾健康",
    zhClause: "我这周可以预约医生",
    zhDifficultNoun: "拖太久才去看医生",
    zhEmotion: "担忧",
    zhGerund: "这周预约医生",
    zhMethod: "在线预约",
    zhMoreFirst: "我越早处理小症状",
    zhMoreSecond: "我越安心",
    zhNoun: "这周的医生预约",
    zhOptionA: "早点看医生",
    zhOptionB: "忽视症状",
    zhPastParticiple: "以前去过诊所",
    zhPastSimple: "在线预约了医生",
    zhProblem: "我的咳嗽还没有好",
    zhReason: "我不想让症状变严重",
    zhResult: "我可以早点得到合适的建议",
    zhTimePoint: "去年冬天我生病的时候",
    zhWhenClause: "症状持续好几天时",
  },
  {
    action: "plan a trip to Europe next summer",
    apologyAction: "change our travel plan",
    benefit: "makes the trip less stressful",
    clause: "we can plan a trip to Europe next summer",
    difficultNoun: "planning a long trip on a tight budget",
    emotion: "excited",
    gerund: "planning a trip to Europe next summer",
    idiomatic: "I’d love to plan a Europe trip for next summer.",
    method: "creating a shared travel document",
    moreFirst: "we plan the trip early",
    moreSecond: "fun the trip becomes",
    noun: "a trip to Europe next summer",
    optionA: "planning early",
    optionB: "booking everything at the last minute",
    pastParticiple: "traveled abroad before",
    pastSimple: "planned a weekend trip with friends",
    problem: "we have not booked anything yet",
    reason: "good tickets sell out quickly",
    result: "we can save money on the trip",
    simple: "I want to travel to Europe next summer.",
    timePoint: "when I first traveled alone",
    whenClause: "I think about next summer",
    zhAction: "计划明年夏天去欧洲旅行",
    zhApologyAction: "改变我们的旅行计划",
    zhBenefit: "让旅行压力更小",
    zhClause: "我们可以计划明年夏天去欧洲旅行",
    zhDifficultNoun: "预算紧张时计划长途旅行",
    zhEmotion: "兴奋",
    zhGerund: "计划明年夏天去欧洲旅行",
    zhMethod: "创建共享旅行文档",
    zhMoreFirst: "我们越早计划旅行",
    zhMoreSecond: "旅行越有趣",
    zhNoun: "明年夏天去欧洲的旅行",
    zhOptionA: "提前计划",
    zhOptionB: "最后一刻预订所有东西",
    zhPastParticiple: "以前出国旅行过",
    zhPastSimple: "和朋友计划了一次周末旅行",
    zhProblem: "我们还没有预订任何东西",
    zhReason: "好票很快会卖完",
    zhResult: "我们可以节省旅行费用",
    zhTimePoint: "我第一次独自旅行的时候",
    zhWhenClause: "我想到明年夏天时",
  },
  {
    action: "talk to my neighbor about the noise",
    apologyAction: "raise my voice about the noise",
    benefit: "keeps the conversation respectful",
    clause: "I can talk to my neighbor about the noise calmly",
    difficultNoun: "a noisy neighbor upstairs",
    emotion: "annoyed",
    gerund: "talking to my neighbor about the noise",
    idiomatic: "I need to have a calm word with my neighbor about the noise.",
    method: "leaving a polite note first",
    moreFirst: "I stay calm",
    moreSecond: "easier the conversation becomes",
    noun: "a calm conversation with my neighbor",
    optionA: "a polite conversation",
    optionB: "an angry argument",
    pastParticiple: "talked to a neighbor about noise before",
    pastSimple: "left a polite note on the door",
    problem: "the noise upstairs is too loud at night",
    reason: "I cannot sleep well with the noise",
    result: "we can solve the problem peacefully",
    simple: "I need to talk to my neighbor.",
    timePoint: "when I lived in an apartment",
    whenClause: "the noise continues after midnight",
    zhAction: "和邻居谈谈噪音问题",
    zhApologyAction: "因为噪音问题提高了声音",
    zhBenefit: "让对话保持尊重",
    zhClause: "我可以冷静地和邻居谈噪音问题",
    zhDifficultNoun: "楼上很吵的邻居",
    zhEmotion: "恼火",
    zhGerund: "和邻居谈谈噪音问题",
    zhMethod: "先留一张礼貌的便条",
    zhMoreFirst: "我越保持冷静",
    zhMoreSecond: "对话越容易",
    zhNoun: "和邻居的一次冷静对话",
    zhOptionA: "礼貌的对话",
    zhOptionB: "生气的争论",
    zhPastParticiple: "以前和邻居谈过噪音",
    zhPastSimple: "在门上留了一张礼貌便条",
    zhProblem: "楼上的噪音晚上太大",
    zhReason: "有噪音时我睡不好",
    zhResult: "我们可以和平解决问题",
    zhTimePoint: "我住公寓的时候",
    zhWhenClause: "噪音持续到午夜以后时",
  },
  {
    action: "resolve the conflict with my teammate",
    apologyAction: "ignore your side of the story",
    benefit: "helps the team work together again",
    clause: "we can resolve the conflict with my teammate",
    difficultNoun: "a conflict with a teammate",
    emotion: "uncomfortable",
    gerund: "resolving the conflict with my teammate",
    idiomatic: "We need to clear the air with my teammate.",
    method: "having a short honest meeting",
    moreFirst: "we listen to each other",
    moreSecond: "respectful the discussion becomes",
    noun: "a fair conversation with my teammate",
    optionA: "talking directly",
    optionB: "avoiding the problem",
    pastParticiple: "resolved a team conflict before",
    pastSimple: "apologized to a teammate",
    problem: "my teammate and I are not communicating well",
    reason: "we misunderstood each other",
    result: "we can work together again",
    simple: "We need to solve the team conflict.",
    timePoint: "during a difficult team project",
    whenClause: "my teammate disagrees with me",
    zhAction: "解决我和队友之间的冲突",
    zhApologyAction: "忽视了你的说法",
    zhBenefit: "帮助团队重新合作",
    zhClause: "我们可以解决我和队友之间的冲突",
    zhDifficultNoun: "和队友之间的冲突",
    zhEmotion: "不舒服",
    zhGerund: "解决我和队友之间的冲突",
    zhMethod: "开一次简短而诚实的会",
    zhMoreFirst: "我们越互相倾听",
    zhMoreSecond: "讨论越尊重彼此",
    zhNoun: "和队友的一次公平对话",
    zhOptionA: "直接沟通",
    zhOptionB: "回避问题",
    zhPastParticiple: "以前解决过团队冲突",
    zhPastSimple: "向队友道歉了",
    zhProblem: "我和队友沟通得不好",
    zhReason: "我们误解了彼此",
    zhResult: "我们可以再次合作",
    zhTimePoint: "一个困难的团队项目中",
    zhWhenClause: "队友不同意我时",
  },
  {
    action: "build a calmer morning routine",
    apologyAction: "rush out without saying goodbye",
    benefit: "starts my day with less stress",
    clause: "I can build a calmer morning routine",
    difficultNoun: "a rushed morning before work",
    emotion: "peaceful",
    gerund: "building a calmer morning routine",
    idiomatic: "I want my mornings to feel less rushed.",
    method: "preparing my bag the night before",
    moreFirst: "I prepare the night before",
    moreSecond: "calmer my morning feels",
    noun: "a calmer morning routine",
    optionA: "preparing the night before",
    optionB: "rushing every morning",
    pastParticiple: "started my day calmly before",
    pastSimple: "woke up thirty minutes earlier",
    problem: "my mornings always feel rushed",
    reason: "I start the day too late",
    result: "I can leave home calmly",
    simple: "I want a calmer morning.",
    timePoint: "when my schedule was very busy",
    whenClause: "I wake up late",
    zhAction: "建立更从容的早晨习惯",
    zhApologyAction: "匆忙出门没有道别",
    zhBenefit: "让我以更少压力开始一天",
    zhClause: "我可以建立更从容的早晨习惯",
    zhDifficultNoun: "上班前匆忙的早晨",
    zhEmotion: "平静",
    zhGerund: "建立更从容的早晨习惯",
    zhMethod: "前一天晚上准备好包",
    zhMoreFirst: "我前一晚准备得越好",
    zhMoreSecond: "早晨越从容",
    zhNoun: "更从容的早晨习惯",
    zhOptionA: "前一晚准备",
    zhOptionB: "每天早上匆忙",
    zhPastParticiple: "以前从容地开始过一天",
    zhPastSimple: "早起了三十分钟",
    zhProblem: "我的早晨总是很匆忙",
    zhReason: "我开始一天太晚",
    zhResult: "我可以从容出门",
    zhTimePoint: "我的日程很忙的时候",
    zhWhenClause: "我起晚时",
  },
  {
    action: "save money for an emergency fund",
    apologyAction: "spend more than I planned",
    benefit: "makes unexpected costs easier to handle",
    clause: "I can save money for an emergency fund",
    difficultNoun: "an unexpected expense",
    emotion: "secure",
    gerund: "saving money for an emergency fund",
    idiomatic: "I want to build up a safety cushion.",
    method: "moving money to savings every payday",
    moreFirst: "I save a little each month",
    moreSecond: "secure I feel",
    noun: "an emergency fund",
    optionA: "saving a little every month",
    optionB: "spending everything right away",
    pastParticiple: "saved money for an emergency before",
    pastSimple: "put part of my salary into savings",
    problem: "I do not have enough emergency savings",
    reason: "unexpected costs can happen anytime",
    result: "I can handle emergencies better",
    simple: "I need an emergency fund.",
    timePoint: "when I had my first full-time job",
    whenClause: "an unexpected bill arrives",
    zhAction: "为应急基金存钱",
    zhApologyAction: "花得比计划多",
    zhBenefit: "让意外开支更容易处理",
    zhClause: "我可以为应急基金存钱",
    zhDifficultNoun: "一笔意外开支",
    zhEmotion: "有安全感",
    zhGerund: "为应急基金存钱",
    zhMethod: "每次发薪日把钱转入储蓄",
    zhMoreFirst: "我每月存一点越久",
    zhMoreSecond: "我越有安全感",
    zhNoun: "应急基金",
    zhOptionA: "每月存一点",
    zhOptionB: "马上花光所有钱",
    zhPastParticiple: "以前为应急情况存过钱",
    zhPastSimple: "把一部分工资存了起来",
    zhProblem: "我的应急储蓄不够",
    zhReason: "意外开支随时可能发生",
    zhResult: "我可以更好地应对紧急情况",
    zhTimePoint: "我有第一份全职工作的时候",
    zhWhenClause: "意外账单出现时",
  },
  {
    action: "join a language exchange group",
    apologyAction: "forget our language exchange meeting",
    benefit: "gives me more real speaking practice",
    clause: "I can join a language exchange group",
    difficultNoun: "speaking with native speakers for the first time",
    emotion: "curious",
    gerund: "joining a language exchange group",
    idiomatic: "I want to get more real conversation practice.",
    method: "meeting online twice a week",
    moreFirst: "I speak with real people",
    moreSecond: "comfortable I feel",
    noun: "a friendly language exchange group",
    optionA: "real conversation practice",
    optionB: "studying alone all the time",
    pastParticiple: "joined an online class before",
    pastSimple: "met a language partner online",
    problem: "I do not have enough real speaking practice",
    reason: "real conversations help me improve faster",
    result: "I can speak more naturally",
    simple: "I want more speaking practice.",
    timePoint: "when I began practicing English seriously",
    whenClause: "I meet a new language partner",
    zhAction: "加入一个语言交换小组",
    zhApologyAction: "忘了我们的语言交换会议",
    zhBenefit: "给我更多真实口语练习",
    zhClause: "我可以加入一个语言交换小组",
    zhDifficultNoun: "第一次和母语者交流",
    zhEmotion: "好奇",
    zhGerund: "加入一个语言交换小组",
    zhMethod: "每周在线见面两次",
    zhMoreFirst: "我和真人交流越多",
    zhMoreSecond: "我越自在",
    zhNoun: "一个友好的语言交换小组",
    zhOptionA: "真实对话练习",
    zhOptionB: "一直独自学习",
    zhPastParticiple: "以前参加过在线课程",
    zhPastSimple: "在网上认识了一个语言伙伴",
    zhProblem: "我没有足够的真实口语练习",
    zhReason: "真实对话帮助我更快进步",
    zhResult: "我可以说得更自然",
    zhTimePoint: "我认真练英语的时候",
    zhWhenClause: "我见到新的语言伙伴时",
  },
];

const sentencePatternSceneSeeds: PracticeSceneSeed[] = [
  {
    action: "call my mom after dinner",
    benefit: "keeps my family close",
    category: "家庭",
    clause: "my mom wants to hear from me tonight",
    emotion: "warm",
    key: "family-call-mom",
    noun: "time to call my mom",
    problem: "I have not called my family this week",
    reason: "my mom is waiting for my call",
    result: "my family feels cared for",
    zhAction: "晚饭后给妈妈打电话",
    zhBenefit: "让家人更亲近",
    zhClause: "妈妈今晚想听听我的声音",
    zhEmotion: "温暖",
    zhNoun: "给妈妈打电话的时间",
    zhProblem: "这周还没给家里打电话",
    zhReason: "妈妈在等我的电话",
    zhResult: "家人会觉得被关心",
  },
  {
    action: "organize my desk before the meeting",
    benefit: "helps me work more clearly",
    category: "工作",
    clause: "my desk is too messy for the meeting",
    emotion: "focused",
    key: "work-organize-desk",
    noun: "a clean desk before the meeting",
    problem: "my desk is covered with papers",
    reason: "the meeting starts soon",
    result: "I can find my notes quickly",
    zhAction: "开会前整理书桌",
    zhBenefit: "让我工作更清楚",
    zhClause: "我的书桌太乱，不适合开会",
    zhEmotion: "专注",
    zhNoun: "开会前整洁的书桌",
    zhProblem: "桌上堆满了文件",
    zhReason: "会议马上开始",
    zhResult: "我能很快找到笔记",
  },
  {
    action: "review my notes before class",
    benefit: "helps me follow the lesson",
    category: "学校",
    clause: "there is a quiz in class today",
    emotion: "prepared",
    key: "school-review-notes",
    noun: "time to review my notes",
    problem: "I forgot some key points",
    reason: "class starts in twenty minutes",
    result: "I feel ready for the quiz",
    zhAction: "上课前复习笔记",
    zhBenefit: "帮助我跟上课程",
    zhClause: "今天课上有小测验",
    zhEmotion: "有准备",
    zhNoun: "复习笔记的时间",
    zhProblem: "我忘了一些重点",
    zhReason: "二十分钟后就上课",
    zhResult: "我对小测验更有把握",
  },
  {
    action: "compare prices before buying shoes",
    benefit: "helps me spend wisely",
    category: "购物",
    clause: "these shoes are a little expensive",
    emotion: "careful",
    key: "shopping-compare-shoes",
    noun: "a better price for these shoes",
    problem: "these shoes cost more than I expected",
    reason: "another store may have a sale",
    result: "I can save some money",
    zhAction: "买鞋前比比价格",
    zhBenefit: "帮助我理性消费",
    zhClause: "这双鞋有点贵",
    zhEmotion: "谨慎",
    zhNoun: "这双鞋更好的价格",
    zhProblem: "这双鞋比我预想的贵",
    zhReason: "另一家店可能在打折",
    zhResult: "我可以省点钱",
  },
  {
    action: "bring an umbrella this afternoon",
    benefit: "keeps me from getting wet",
    category: "天气",
    clause: "it may rain this afternoon",
    emotion: "careful",
    key: "weather-bring-umbrella",
    noun: "an umbrella in my bag",
    problem: "the sky looks dark",
    reason: "the forecast says it may rain",
    result: "I will stay dry on the way home",
    zhAction: "下午带把伞",
    zhBenefit: "避免被雨淋湿",
    zhClause: "下午可能会下雨",
    zhEmotion: "谨慎",
    zhNoun: "包里的一把伞",
    zhProblem: "天看起来很阴",
    zhReason: "天气预报说可能下雨",
    zhResult: "回家路上不会淋湿",
  },
  {
    action: "cook noodles for dinner",
    benefit: "saves time after work",
    category: "饮食",
    clause: "I am too tired to cook a big meal",
    emotion: "hungry",
    key: "food-cook-noodles",
    noun: "a quick bowl of noodles",
    problem: "I am hungry and tired",
    reason: "I got home late today",
    result: "dinner will be simple and warm",
    zhAction: "晚饭煮碗面",
    zhBenefit: "下班后节省时间",
    zhClause: "我太累了，不想做大餐",
    zhEmotion: "饿",
    zhNoun: "一碗简单的热面",
    zhProblem: "我又饿又累",
    zhReason: "今天回家太晚",
    zhResult: "晚饭简单又暖和",
  },
  {
    action: "pack my suitcase tonight",
    benefit: "makes tomorrow morning easier",
    category: "旅游",
    clause: "my flight leaves early tomorrow",
    emotion: "excited",
    key: "travel-pack-suitcase",
    noun: "a packed suitcase",
    problem: "my suitcase is still empty",
    reason: "I leave early tomorrow morning",
    result: "I will not rush tomorrow",
    zhAction: "今晚收拾行李箱",
    zhBenefit: "让明早轻松一点",
    zhClause: "我的航班明早很早",
    zhEmotion: "兴奋",
    zhNoun: "收拾好的行李箱",
    zhProblem: "行李箱还是空的",
    zhReason: "明早很早就出发",
    zhResult: "明天不会太匆忙",
  },
  {
    action: "leave early to catch the bus",
    benefit: "helps me get there on time",
    category: "交通",
    clause: "the bus only comes every thirty minutes",
    emotion: "alert",
    key: "traffic-catch-bus",
    noun: "enough time to catch the bus",
    problem: "the bus stop is farther than I thought",
    reason: "the next bus is important",
    result: "I will arrive on time",
    zhAction: "早点出门赶公交",
    zhBenefit: "帮助我准时到达",
    zhClause: "公交车每三十分钟才来一班",
    zhEmotion: "警觉",
    zhNoun: "赶公交的充足时间",
    zhProblem: "公交站比我想的远",
    zhReason: "下一班公交很重要",
    zhResult: "我会准时到达",
  },
  {
    action: "drink more water today",
    benefit: "helps me feel better",
    category: "健康",
    clause: "my throat feels dry today",
    emotion: "tired",
    key: "health-drink-water",
    noun: "a bottle of water",
    problem: "my throat feels dry",
    reason: "I talked a lot this morning",
    result: "my throat will feel better",
    zhAction: "今天多喝点水",
    zhBenefit: "让我舒服一点",
    zhClause: "今天嗓子有点干",
    zhEmotion: "累",
    zhNoun: "一瓶水",
    zhProblem: "我的嗓子有点干",
    zhReason: "上午说了很多话",
    zhResult: "嗓子会舒服一些",
  },
  {
    action: "go jogging after work",
    benefit: "helps me stay active",
    category: "运动",
    clause: "I have been sitting all day",
    emotion: "energetic",
    key: "sports-go-jogging",
    noun: "a short jog after work",
    problem: "I have not moved much today",
    reason: "I sat at my desk all day",
    result: "my body will feel more awake",
    zhAction: "下班后去慢跑",
    zhBenefit: "让我保持活力",
    zhClause: "我坐了一整天",
    zhEmotion: "有活力",
    zhNoun: "下班后的一小段慢跑",
    zhProblem: "今天几乎没怎么活动",
    zhReason: "我在桌前坐了一整天",
    zhResult: "身体会更清醒",
  },
  {
    action: "practice guitar for ten minutes",
    benefit: "makes practice feel easy",
    category: "兴趣爱好",
    clause: "I want to learn one new song",
    emotion: "relaxed",
    key: "hobby-practice-guitar",
    noun: "ten minutes of guitar practice",
    problem: "I have not practiced guitar this week",
    reason: "I want to learn one new song",
    result: "I will enjoy music again",
    zhAction: "练十分钟吉他",
    zhBenefit: "让练习变得轻松",
    zhClause: "我想学会一首新歌",
    zhEmotion: "放松",
    zhNoun: "十分钟吉他练习",
    zhProblem: "这周还没练吉他",
    zhReason: "我想学会一首新歌",
    zhResult: "我会重新享受音乐",
  },
  {
    action: "meet my friend for coffee",
    benefit: "helps us catch up",
    category: "朋友社交",
    clause: "my friend wants to talk this weekend",
    emotion: "happy",
    key: "friends-meet-coffee",
    noun: "coffee with my friend",
    problem: "we have not talked for weeks",
    reason: "my friend has some news",
    result: "we can catch up properly",
    zhAction: "和朋友见面喝咖啡",
    zhBenefit: "让我们好好聊聊近况",
    zhClause: "朋友这个周末想聊聊",
    zhEmotion: "开心",
    zhNoun: "和朋友的一杯咖啡",
    zhProblem: "我们好几周没聊天了",
    zhReason: "朋友有些新消息",
    zhResult: "我们能好好叙旧",
  },
  {
    action: "read a bedtime story to my child",
    benefit: "helps my child sleep calmly",
    category: "孩子教育",
    clause: "my child wants one more story",
    emotion: "loving",
    key: "kids-bedtime-story",
    noun: "a bedtime story for my child",
    problem: "my child is still wide awake",
    reason: "bedtime feels hard tonight",
    result: "my child will feel calm",
    zhAction: "给孩子读睡前故事",
    zhBenefit: "帮助孩子安静入睡",
    zhClause: "孩子还想再听一个故事",
    zhEmotion: "温柔",
    zhNoun: "给孩子的睡前故事",
    zhProblem: "孩子现在还很精神",
    zhReason: "今晚入睡有点困难",
    zhResult: "孩子会平静下来",
  },
  {
    action: "back up my phone photos",
    benefit: "keeps my photos safe",
    category: "手机电脑",
    clause: "my phone is almost full",
    emotion: "careful",
    key: "tech-backup-photos",
    noun: "a backup of my phone photos",
    problem: "my phone storage is almost full",
    reason: "I do not want to lose my photos",
    result: "my photos will be safe",
    zhAction: "备份手机照片",
    zhBenefit: "保护我的照片",
    zhClause: "我的手机快满了",
    zhEmotion: "谨慎",
    zhNoun: "手机照片的备份",
    zhProblem: "手机存储快满了",
    zhReason: "我不想丢照片",
    zhResult: "照片会更安全",
  },
  {
    action: "save ten dollars this week",
    benefit: "helps me build a small habit",
    category: "金钱消费",
    clause: "I spent too much last month",
    emotion: "responsible",
    key: "money-save-ten-dollars",
    noun: "ten dollars in savings",
    problem: "I spent too much last month",
    reason: "I want to manage money better",
    result: "saving will become easier",
    zhAction: "这周存十美元",
    zhBenefit: "帮我养成小习惯",
    zhClause: "我上个月花太多钱了",
    zhEmotion: "负责",
    zhNoun: "存下来的十美元",
    zhProblem: "上个月花钱太多",
    zhReason: "我想更好地管钱",
    zhResult: "存钱会变得更容易",
  },
  {
    action: "clean the kitchen after breakfast",
    benefit: "keeps the home comfortable",
    category: "住房生活",
    clause: "the kitchen is messy after breakfast",
    emotion: "calm",
    key: "home-clean-kitchen",
    noun: "a clean kitchen",
    problem: "the kitchen sink is full",
    reason: "breakfast made a mess",
    result: "the home will feel nicer",
    zhAction: "早饭后打扫厨房",
    zhBenefit: "让家里更舒服",
    zhClause: "早饭后厨房有点乱",
    zhEmotion: "平静",
    zhNoun: "干净的厨房",
    zhProblem: "厨房水槽满了",
    zhReason: "早饭弄得有点乱",
    zhResult: "家里会舒服很多",
  },
  {
    action: "buy flowers for Mother's Day",
    benefit: "makes the holiday feel special",
    category: "节日活动",
    clause: "Mother's Day is coming this weekend",
    emotion: "grateful",
    key: "holiday-mothers-day-flowers",
    noun: "flowers for Mother's Day",
    problem: "I have not prepared a gift yet",
    reason: "Mother's Day is this weekend",
    result: "my mom will feel loved",
    zhAction: "母亲节买束花",
    zhBenefit: "让节日更有心意",
    zhClause: "这个周末就是母亲节",
    zhEmotion: "感激",
    zhNoun: "母亲节的花",
    zhProblem: "我还没准备礼物",
    zhReason: "这个周末就是母亲节",
    zhResult: "妈妈会感到被爱",
  },
  {
    action: "make a simple plan for Saturday",
    benefit: "keeps the day organized",
    category: "计划安排",
    clause: "Saturday is getting busy",
    emotion: "organized",
    key: "plans-saturday-plan",
    noun: "a simple plan for Saturday",
    problem: "Saturday has too many small tasks",
    reason: "I do not want to forget anything",
    result: "the day will feel organized",
    zhAction: "给周六做个简单计划",
    zhBenefit: "让一天更有条理",
    zhClause: "周六会有点忙",
    zhEmotion: "有条理",
    zhNoun: "周六的简单计划",
    zhProblem: "周六有太多小事",
    zhReason: "我不想忘记任何事",
    zhResult: "这一天会更有条理",
  },
  {
    action: "calm down before I reply",
    benefit: "helps me avoid saying the wrong thing",
    category: "情绪表达",
    clause: "I feel upset right now",
    emotion: "upset",
    key: "emotion-calm-before-reply",
    noun: "a moment to calm down",
    problem: "I feel upset right now",
    reason: "the message sounded rude",
    result: "I can reply more kindly",
    zhAction: "回复前先冷静一下",
    zhBenefit: "避免说错话",
    zhClause: "我现在有点不高兴",
    zhEmotion: "不高兴",
    zhNoun: "冷静一下的时间",
    zhProblem: "我现在有点不高兴",
    zhReason: "那条消息听起来不太礼貌",
    zhResult: "我能更友善地回复",
  },
  {
    action: "ask my neighbor for help",
    benefit: "makes the task easier",
    category: "求助请求",
    clause: "the box is too heavy for me",
    emotion: "thankful",
    key: "help-ask-neighbor",
    noun: "help from my neighbor",
    problem: "the box is too heavy",
    reason: "I cannot move it alone",
    result: "we can move the box safely",
    zhAction: "请邻居帮忙",
    zhBenefit: "让这件事更容易",
    zhClause: "这个箱子对我来说太重了",
    zhEmotion: "感激",
    zhNoun: "邻居的帮忙",
    zhProblem: "这个箱子太重",
    zhReason: "我一个人搬不动",
    zhResult: "我们能安全地搬箱子",
  },
];

const sentencePatternSceneDetails = [
  {
    action: "today",
    key: "today",
    noun: "for today",
    zhAction: "今天",
    zhNoun: "今天",
  },
  {
    action: "this morning",
    key: "morning",
    noun: "this morning",
    zhAction: "今天早上",
    zhNoun: "今天早上",
  },
  {
    action: "after work",
    key: "after-work",
    noun: "after work",
    zhAction: "下班后",
    zhNoun: "下班后",
  },
  {
    action: "before dinner",
    key: "before-dinner",
    noun: "before dinner",
    zhAction: "晚饭前",
    zhNoun: "晚饭前",
  },
  {
    action: "this weekend",
    key: "weekend",
    noun: "this weekend",
    zhAction: "这个周末",
    zhNoun: "这个周末",
  },
  {
    action: "tomorrow morning",
    key: "tomorrow-morning",
    noun: "tomorrow morning",
    zhAction: "明天早上",
    zhNoun: "明天早上",
  },
  {
    action: "before I leave",
    key: "before-leaving",
    noun: "before I leave",
    zhAction: "出门前",
    zhNoun: "出门前",
  },
  {
    action: "during lunch break",
    key: "lunch-break",
    noun: "during lunch break",
    zhAction: "午休时",
    zhNoun: "午休时",
  },
  {
    action: "after class",
    key: "after-class",
    noun: "after class",
    zhAction: "下课后",
    zhNoun: "下课后",
  },
  {
    action: "before bed",
    key: "before-bed",
    noun: "before bed",
    zhAction: "睡觉前",
    zhNoun: "睡觉前",
  },
  {
    action: "on Friday",
    key: "friday",
    noun: "on Friday",
    zhAction: "周五",
    zhNoun: "周五",
  },
  {
    action: "next week",
    key: "next-week",
    noun: "next week",
    zhAction: "下周",
    zhNoun: "下周",
  },
  {
    action: "tonight",
    key: "tonight",
    noun: "tonight",
    zhAction: "今晚",
    zhNoun: "今晚",
  },
  {
    action: "after lunch",
    key: "after-lunch",
    noun: "after lunch",
    zhAction: "午饭后",
    zhNoun: "午饭后",
  },
  {
    action: "before class",
    key: "before-class",
    noun: "before class",
    zhAction: "上课前",
    zhNoun: "上课前",
  },
  {
    action: "after breakfast",
    key: "after-breakfast",
    noun: "after breakfast",
    zhAction: "早饭后",
    zhNoun: "早饭后",
  },
  {
    action: "early tomorrow",
    key: "early-tomorrow",
    noun: "early tomorrow",
    zhAction: "明天一早",
    zhNoun: "明天一早",
  },
  {
    action: "on Monday",
    key: "monday",
    noun: "on Monday",
    zhAction: "周一",
    zhNoun: "周一",
  },
  {
    action: "next month",
    key: "next-month",
    noun: "next month",
    zhAction: "下个月",
    zhNoun: "下个月",
  },
  {
    action: "during a short break",
    key: "short-break",
    noun: "during a short break",
    zhAction: "短暂休息时",
    zhNoun: "短暂休息时",
  },
  {
    action: "when I get home",
    key: "when-home",
    noun: "when I get home",
    zhAction: "到家后",
    zhNoun: "到家后",
  },
  {
    action: "before the meeting",
    key: "before-meeting",
    noun: "before the meeting",
    zhAction: "开会前",
    zhNoun: "开会前",
  },
  {
    action: "after school",
    key: "after-school",
    noun: "after school",
    zhAction: "放学后",
    zhNoun: "放学后",
  },
  {
    action: "before the trip",
    key: "before-trip",
    noun: "before the trip",
    zhAction: "出发前",
    zhNoun: "出发前",
  },
  {
    action: "this evening",
    key: "evening",
    noun: "this evening",
    zhAction: "今天傍晚",
    zhNoun: "今天傍晚",
  },
  {
    action: "on the way home",
    key: "way-home",
    noun: "on the way home",
    zhAction: "回家路上",
    zhNoun: "回家路上",
  },
  {
    action: "before work",
    key: "before-work",
    noun: "before work",
    zhAction: "上班前",
    zhNoun: "上班前",
  },
  {
    action: "after the call",
    key: "after-call",
    noun: "after the call",
    zhAction: "通话后",
    zhNoun: "通话后",
  },
  {
    action: "during the weekend",
    key: "during-weekend",
    noun: "during the weekend",
    zhAction: "周末期间",
    zhNoun: "周末期间",
  },
  {
    action: "when I have a minute",
    key: "free-minute",
    noun: "when I have a minute",
    zhAction: "有空时",
    zhNoun: "有空时",
  },
] as const;

type SentencePatternScenarioTerm = {
  en: string;
  key: string;
  zh: string;
};

const sentencePatternScenarioPeople: SentencePatternScenarioTerm[] = [
  { en: "my mom", key: "mom", zh: "妈妈" },
  { en: "my dad", key: "dad", zh: "爸爸" },
  { en: "my sister", key: "sister", zh: "姐姐" },
  { en: "my brother", key: "brother", zh: "哥哥" },
  { en: "my friend", key: "friend", zh: "朋友" },
  { en: "my roommate", key: "roommate", zh: "室友" },
  { en: "my neighbor", key: "neighbor", zh: "邻居" },
  { en: "my cousin", key: "cousin", zh: "表亲" },
  { en: "my partner", key: "partner", zh: "伴侣" },
  { en: "my child", key: "child", zh: "孩子" },
];

const sentencePatternScenarioPeopleByPool: Record<string, SentencePatternScenarioTerm[]> = {
  family: [
    { en: "my mom", key: "mom", zh: "妈妈" },
    { en: "my dad", key: "dad", zh: "爸爸" },
    { en: "my sister", key: "sister", zh: "姐姐" },
    { en: "my brother", key: "brother", zh: "哥哥" },
    { en: "my cousin", key: "cousin", zh: "表亲" },
    { en: "my aunt", key: "aunt", zh: "阿姨" },
    { en: "my uncle", key: "uncle", zh: "叔叔" },
    { en: "my grandma", key: "grandma", zh: "奶奶" },
  ],
  friends: [
    { en: "my best friend", key: "best-friend", zh: "最好的朋友" },
    { en: "my old classmate", key: "old-classmate", zh: "老同学" },
    { en: "my neighbor", key: "neighbor", zh: "邻居" },
    { en: "my teammate", key: "teammate", zh: "队友" },
    { en: "my book club friend", key: "book-club-friend", zh: "读书会朋友" },
    { en: "my roommate", key: "roommate", zh: "室友" },
    { en: "my college friend", key: "college-friend", zh: "大学朋友" },
    { en: "my online friend", key: "online-friend", zh: "网友" },
  ],
  kids: [
    { en: "my son", key: "son", zh: "儿子" },
    { en: "my daughter", key: "daughter", zh: "女儿" },
    { en: "my student", key: "student", zh: "学生" },
    { en: "my nephew", key: "nephew", zh: "外甥" },
    { en: "my niece", key: "niece", zh: "侄女" },
    { en: "my child", key: "child", zh: "孩子" },
    { en: "my little brother", key: "little-brother", zh: "弟弟" },
    { en: "my young cousin", key: "young-cousin", zh: "小表弟" },
  ],
  school: [
    { en: "my classmate", key: "classmate", zh: "同学" },
    { en: "my teacher", key: "teacher", zh: "老师" },
    { en: "my study partner", key: "study-partner", zh: "学习搭子" },
    { en: "my lab partner", key: "lab-partner", zh: "实验搭档" },
    { en: "my tutor", key: "tutor", zh: "辅导老师" },
    { en: "my roommate", key: "roommate", zh: "室友" },
    { en: "my professor", key: "professor", zh: "教授" },
    { en: "my groupmate", key: "groupmate", zh: "小组同伴" },
  ],
  work: [
    { en: "my manager", key: "manager", zh: "经理" },
    { en: "my coworker", key: "coworker", zh: "同事" },
    { en: "my teammate", key: "teammate", zh: "队友" },
    { en: "a client", key: "client", zh: "客户" },
    { en: "our designer", key: "designer", zh: "设计师" },
    { en: "my assistant", key: "assistant", zh: "助理" },
    { en: "the new intern", key: "intern", zh: "新实习生" },
    { en: "my supervisor", key: "supervisor", zh: "主管" },
  ],
};

const sentencePatternScenarioDetails: Record<string, SentencePatternScenarioTerm[]> = {
  emotion: [
    { en: "a rude message", key: "rude-message", zh: "一条不礼貌的消息" },
    { en: "a bad mood", key: "bad-mood", zh: "不好的心情" },
    { en: "a nervous speech", key: "nervous-speech", zh: "让人紧张的发言" },
    { en: "a stressful morning", key: "stressful-morning", zh: "压力很大的早晨" },
    { en: "an awkward silence", key: "awkward-silence", zh: "尴尬的沉默" },
    { en: "some happy news", key: "happy-news", zh: "一个好消息" },
    { en: "a disappointing score", key: "disappointing-score", zh: "让人失望的分数" },
    { en: "an angry reply", key: "angry-reply", zh: "生气的回复" },
    { en: "a lonely evening", key: "lonely-evening", zh: "有点孤单的晚上" },
    { en: "a big decision", key: "big-decision", zh: "一个重要决定" },
  ],
  family: [
    { en: "the weekend dinner", key: "weekend-dinner", zh: "周末晚饭" },
    { en: "grandma's birthday", key: "grandma-birthday", zh: "奶奶的生日" },
    { en: "the family photos", key: "family-photos", zh: "家庭照片" },
    { en: "a doctor visit", key: "doctor-visit", zh: "看医生的事" },
    { en: "a home repair", key: "home-repair", zh: "家里维修" },
    { en: "a school meeting", key: "school-meeting", zh: "学校家长会" },
    { en: "a holiday plan", key: "holiday-plan", zh: "节日安排" },
    { en: "the grocery list", key: "grocery-list", zh: "购物清单" },
    { en: "an old recipe", key: "old-recipe", zh: "老菜谱" },
    { en: "a baby gift", key: "baby-gift", zh: "婴儿礼物" },
  ],
  food: [
    { en: "vegetable noodles", key: "vegetable-noodles", zh: "蔬菜面" },
    { en: "chicken soup", key: "chicken-soup", zh: "鸡汤" },
    { en: "a lunch salad", key: "lunch-salad", zh: "午餐沙拉" },
    { en: "a breakfast sandwich", key: "breakfast-sandwich", zh: "早餐三明治" },
    { en: "a rice bowl", key: "rice-bowl", zh: "盖饭" },
    { en: "dumpling filling", key: "dumpling-filling", zh: "饺子馅" },
    { en: "pasta sauce", key: "pasta-sauce", zh: "意面酱" },
    { en: "a fruit smoothie", key: "fruit-smoothie", zh: "水果奶昔" },
    { en: "a takeout order", key: "takeout-order", zh: "外卖订单" },
    { en: "a birthday cake", key: "birthday-cake", zh: "生日蛋糕" },
  ],
  friends: [
    { en: "coffee near the library", key: "library-coffee", zh: "图书馆附近的咖啡" },
    { en: "a birthday dinner", key: "birthday-dinner", zh: "生日晚餐" },
    { en: "a weekend chat", key: "weekend-chat", zh: "周末聊天" },
    { en: "movie night", key: "movie-night", zh: "电影夜" },
    { en: "a group photo", key: "group-photo", zh: "合照" },
    { en: "a hiking plan", key: "hiking-plan", zh: "徒步计划" },
    { en: "game night", key: "game-night", zh: "游戏夜" },
    { en: "lunch break", key: "lunch-break", zh: "午休" },
    { en: "a video call", key: "video-call", zh: "视频电话" },
    { en: "book club", key: "book-club", zh: "读书会" },
  ],
  health: [
    { en: "a sore throat", key: "sore-throat", zh: "嗓子疼" },
    { en: "a dental checkup", key: "dental-checkup", zh: "牙齿检查" },
    { en: "back pain", key: "back-pain", zh: "背疼" },
    { en: "a sleep schedule", key: "sleep-schedule", zh: "睡眠时间" },
    { en: "allergy medicine", key: "allergy-medicine", zh: "过敏药" },
    { en: "an eye exam", key: "eye-exam", zh: "视力检查" },
    { en: "a daily walk", key: "daily-walk", zh: "每天散步" },
    { en: "a water bottle", key: "water-bottle", zh: "水杯" },
    { en: "cold symptoms", key: "cold-symptoms", zh: "感冒症状" },
    { en: "a health report", key: "health-report", zh: "体检报告" },
  ],
  help: [
    { en: "a heavy box", key: "heavy-box", zh: "一个重箱子" },
    { en: "a broken chair", key: "broken-chair", zh: "坏掉的椅子" },
    { en: "a lost key", key: "lost-key", zh: "丢失的钥匙" },
    { en: "a confusing form", key: "confusing-form", zh: "一张看不懂的表格" },
    { en: "a flat tire", key: "flat-tire", zh: "爆胎" },
    { en: "a phone setup", key: "phone-setup", zh: "手机设置" },
    { en: "moving day", key: "moving-day", zh: "搬家那天" },
    { en: "a stuck drawer", key: "stuck-drawer", zh: "卡住的抽屉" },
    { en: "an airport pickup", key: "airport-pickup", zh: "机场接人" },
    { en: "grocery bags", key: "grocery-bags", zh: "几袋菜" },
  ],
  hobby: [
    { en: "a guitar song", key: "guitar-song", zh: "一首吉他曲" },
    { en: "a sketchbook page", key: "sketchbook-page", zh: "一页速写" },
    { en: "a photo walk", key: "photo-walk", zh: "摄影散步" },
    { en: "garden seeds", key: "garden-seeds", zh: "花园种子" },
    { en: "a chess game", key: "chess-game", zh: "一盘棋" },
    { en: "a baking recipe", key: "baking-recipe", zh: "烘焙食谱" },
    { en: "a podcast episode", key: "podcast-episode", zh: "一期播客" },
    { en: "a knitting pattern", key: "knitting-pattern", zh: "编织图样" },
    { en: "a movie list", key: "movie-list", zh: "电影清单" },
    { en: "a language app", key: "language-app", zh: "语言学习软件" },
  ],
  holiday: [
    { en: "Mother's Day flowers", key: "mothers-day-flowers", zh: "母亲节鲜花" },
    { en: "New Year dinner", key: "new-year-dinner", zh: "新年晚饭" },
    { en: "a birthday card", key: "birthday-card", zh: "生日卡片" },
    { en: "a Thanksgiving dish", key: "thanksgiving-dish", zh: "感恩节菜" },
    { en: "Christmas lights", key: "christmas-lights", zh: "圣诞灯" },
    { en: "a school festival", key: "school-festival", zh: "学校节日活动" },
    { en: "a company party", key: "company-party", zh: "公司聚会" },
    { en: "a travel gift", key: "travel-gift", zh: "旅行礼物" },
    { en: "a family reunion", key: "family-reunion", zh: "家庭聚会" },
    { en: "holiday photos", key: "holiday-photos", zh: "节日照片" },
  ],
  home: [
    { en: "the kitchen counter", key: "kitchen-counter", zh: "厨房台面" },
    { en: "the bedroom closet", key: "bedroom-closet", zh: "卧室衣柜" },
    { en: "the laundry basket", key: "laundry-basket", zh: "洗衣篮" },
    { en: "the bathroom sink", key: "bathroom-sink", zh: "浴室水池" },
    { en: "the living room shelf", key: "living-room-shelf", zh: "客厅架子" },
    { en: "the balcony plants", key: "balcony-plants", zh: "阳台植物" },
    { en: "the dinner table", key: "dinner-table", zh: "餐桌" },
    { en: "the front door lock", key: "front-door-lock", zh: "前门锁" },
    { en: "the trash bags", key: "trash-bags", zh: "垃圾袋" },
    { en: "the window screen", key: "window-screen", zh: "窗纱" },
  ],
  kids: [
    { en: "a bedtime story", key: "bedtime-story", zh: "睡前故事" },
    { en: "school lunch", key: "school-lunch", zh: "学校午餐" },
    { en: "a spelling test", key: "spelling-test", zh: "拼写测验" },
    { en: "a piano lesson", key: "piano-lesson", zh: "钢琴课" },
    { en: "soccer shoes", key: "soccer-shoes", zh: "足球鞋" },
    { en: "art homework", key: "art-homework", zh: "美术作业" },
    { en: "a school backpack", key: "school-backpack", zh: "书包" },
    { en: "a bedtime routine", key: "bedtime-routine", zh: "睡前流程" },
    { en: "a parent meeting", key: "parent-meeting", zh: "家长会" },
    { en: "a library card", key: "library-card", zh: "图书卡" },
  ],
  money: [
    { en: "the grocery budget", key: "grocery-budget", zh: "买菜预算" },
    { en: "the rent payment", key: "rent-payment", zh: "房租" },
    { en: "the phone bill", key: "phone-bill", zh: "手机账单" },
    { en: "a subway card", key: "subway-card", zh: "地铁卡" },
    { en: "a savings jar", key: "savings-jar", zh: "存钱罐" },
    { en: "coffee spending", key: "coffee-spending", zh: "咖啡开销" },
    { en: "a holiday gift fund", key: "holiday-gift-fund", zh: "节日礼物钱" },
    { en: "an online refund", key: "online-refund", zh: "网购退款" },
    { en: "emergency money", key: "emergency-money", zh: "应急钱" },
    { en: "the electricity bill", key: "electricity-bill", zh: "电费" },
  ],
  plans: [
    { en: "Saturday lunch", key: "saturday-lunch", zh: "周六午饭" },
    { en: "morning errands", key: "morning-errands", zh: "早上的杂事" },
    { en: "study time", key: "study-time", zh: "学习时间" },
    { en: "a weekend trip", key: "weekend-trip", zh: "周末旅行" },
    { en: "a dinner reservation", key: "dinner-reservation", zh: "晚餐预约" },
    { en: "workout time", key: "workout-time", zh: "运动时间" },
    { en: "a movie plan", key: "movie-plan", zh: "看电影计划" },
    { en: "a weekly schedule", key: "weekly-schedule", zh: "每周安排" },
    { en: "house cleaning", key: "house-cleaning", zh: "打扫房子" },
    { en: "a family call", key: "family-call", zh: "家庭电话" },
  ],
  school: [
    { en: "the history quiz", key: "history-quiz", zh: "历史小测" },
    { en: "math homework", key: "math-homework", zh: "数学作业" },
    { en: "a reading assignment", key: "reading-assignment", zh: "阅读任务" },
    { en: "science notes", key: "science-notes", zh: "科学笔记" },
    { en: "exam review", key: "exam-review", zh: "考试复习" },
    { en: "a library book", key: "library-book", zh: "图书馆的书" },
    { en: "a class presentation", key: "class-presentation", zh: "课堂展示" },
    { en: "language homework", key: "language-homework", zh: "语言作业" },
    { en: "a campus map", key: "campus-map", zh: "校园地图" },
    { en: "a club meeting", key: "club-meeting", zh: "社团会议" },
  ],
  shopping: [
    { en: "a light jacket", key: "light-jacket", zh: "一件薄外套" },
    { en: "running shoes", key: "running-shoes", zh: "跑鞋" },
    { en: "a birthday gift", key: "birthday-gift", zh: "生日礼物" },
    { en: "a kitchen pan", key: "kitchen-pan", zh: "平底锅" },
    { en: "a phone charger", key: "phone-charger", zh: "手机充电器" },
    { en: "a school backpack", key: "school-backpack", zh: "书包" },
    { en: "a winter coat", key: "winter-coat", zh: "冬天外套" },
    { en: "coffee mugs", key: "coffee-mugs", zh: "咖啡杯" },
    { en: "grocery coupons", key: "grocery-coupons", zh: "超市优惠券" },
    { en: "the sale price", key: "sale-price", zh: "促销价" },
  ],
  sports: [
    { en: "a short run", key: "short-run", zh: "短跑" },
    { en: "swimming class", key: "swimming-class", zh: "游泳课" },
    { en: "yoga class", key: "yoga-class", zh: "瑜伽课" },
    { en: "a basketball game", key: "basketball-game", zh: "篮球赛" },
    { en: "tennis practice", key: "tennis-practice", zh: "网球练习" },
    { en: "a bike ride", key: "bike-ride", zh: "骑车" },
    { en: "a gym session", key: "gym-session", zh: "健身房训练" },
    { en: "a hiking trail", key: "hiking-trail", zh: "徒步路线" },
    { en: "dance class", key: "dance-class", zh: "舞蹈课" },
    { en: "morning stretches", key: "morning-stretches", zh: "早晨拉伸" },
  ],
  tech: [
    { en: "phone photos", key: "phone-photos", zh: "手机照片" },
    { en: "a laptop update", key: "laptop-update", zh: "电脑更新" },
    { en: "the Wi-Fi password", key: "wifi-password", zh: "无线网密码" },
    { en: "a video call", key: "video-call", zh: "视频会议" },
    { en: "a cloud backup", key: "cloud-backup", zh: "云备份" },
    { en: "a keyboard problem", key: "keyboard-problem", zh: "键盘问题" },
    { en: "a tablet charger", key: "tablet-charger", zh: "平板充电器" },
    { en: "the email inbox", key: "email-inbox", zh: "邮箱收件箱" },
    { en: "a password reset", key: "password-reset", zh: "重置密码" },
    { en: "printer setup", key: "printer-setup", zh: "打印机设置" },
  ],
  traffic: [
    { en: "the airport bus", key: "airport-bus", zh: "机场大巴" },
    { en: "a subway transfer", key: "subway-transfer", zh: "地铁换乘" },
    { en: "a parking spot", key: "parking-spot", zh: "停车位" },
    { en: "a bike route", key: "bike-route", zh: "骑车路线" },
    { en: "a taxi pickup", key: "taxi-pickup", zh: "出租车接人" },
    { en: "a train platform", key: "train-platform", zh: "火车站台" },
    { en: "the school bus", key: "school-bus", zh: "校车" },
    { en: "a road detour", key: "road-detour", zh: "绕路" },
    { en: "a gas station", key: "gas-station", zh: "加油站" },
    { en: "a carpool plan", key: "carpool-plan", zh: "拼车安排" },
  ],
  travel: [
    { en: "a beach trip", key: "beach-trip", zh: "海边旅行" },
    { en: "a hotel booking", key: "hotel-booking", zh: "酒店预订" },
    { en: "a train ticket", key: "train-ticket", zh: "火车票" },
    { en: "a city map", key: "city-map", zh: "城市地图" },
    { en: "a passport copy", key: "passport-copy", zh: "护照复印件" },
    { en: "a museum visit", key: "museum-visit", zh: "博物馆参观" },
    { en: "a suitcase list", key: "suitcase-list", zh: "行李清单" },
    { en: "an airport ride", key: "airport-ride", zh: "去机场的车" },
    { en: "a weekend cabin", key: "weekend-cabin", zh: "周末小木屋" },
    { en: "travel insurance", key: "travel-insurance", zh: "旅行保险" },
  ],
  weather: [
    { en: "the walk to the station", key: "station-walk", zh: "去车站的路" },
    { en: "an outdoor picnic", key: "outdoor-picnic", zh: "户外野餐" },
    { en: "the morning commute", key: "morning-commute", zh: "早高峰通勤" },
    { en: "a child's soccer game", key: "child-soccer-game", zh: "孩子的足球赛" },
    { en: "laundry on the balcony", key: "balcony-laundry", zh: "阳台上的衣服" },
    { en: "a weekend hike", key: "weekend-hike", zh: "周末徒步" },
    { en: "rooftop dinner", key: "rooftop-dinner", zh: "天台晚饭" },
    { en: "school pickup", key: "school-pickup", zh: "接孩子放学" },
    { en: "an evening run", key: "evening-run", zh: "晚上跑步" },
    { en: "garden plants", key: "garden-plants", zh: "花园植物" },
  ],
  work: [
    { en: "the client notes", key: "client-notes", zh: "客户记录" },
    { en: "the budget meeting", key: "budget-meeting", zh: "预算会议" },
    { en: "the team schedule", key: "team-schedule", zh: "团队排班" },
    { en: "the sales report", key: "sales-report", zh: "销售报告" },
    { en: "the office printer", key: "office-printer", zh: "办公室打印机" },
    { en: "a training plan", key: "training-plan", zh: "培训计划" },
    { en: "a customer email", key: "customer-email", zh: "客户邮件" },
    { en: "the weekly update", key: "weekly-update", zh: "每周更新" },
    { en: "an interview time", key: "interview-time", zh: "面试时间" },
    { en: "the handoff document", key: "handoff-document", zh: "交接文档" },
  ],
};

function makeDraft(
  chinese: string,
  targetEnglish: string,
  sceneKey?: string,
  theme?: string
): BasicPracticeDraft {
  return { chinese, sceneKey, targetEnglish, theme };
}

function createHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createGerundPhrase(action: string) {
  const [verb = "", ...rest] = action.split(" ");
  const irregular: Record<string, string> = {
    back: "backing",
    bring: "bringing",
    buy: "buying",
    call: "calling",
    calm: "calming",
    clean: "cleaning",
    compare: "comparing",
    cook: "cooking",
    drink: "drinking",
    go: "going",
    leave: "leaving",
    make: "making",
    meet: "meeting",
    organize: "organizing",
    pack: "packing",
    practice: "practicing",
    read: "reading",
    review: "reviewing",
    save: "saving",
  };
  const gerund =
    irregular[verb] ||
    (verb.endsWith("e")
      ? `${verb.slice(0, -1)}ing`
      : verb
        ? `${verb}ing`
        : "");

  return [gerund, ...rest].filter(Boolean).join(" ");
}

function createChineseSocialActivity(detail: string) {
  if (detail.includes("咖啡")) return `喝${detail}`;
  if (detail.includes("晚餐")) return `吃${detail}`;
  if (detail.includes("合照")) return `拍${detail}`;
  if (detail.includes("视频电话")) return "打视频电话";
  if (detail.includes("读书会") || detail.includes("电影夜") || detail.includes("游戏夜")) {
    return `参加${detail}`;
  }
  if (detail.includes("午休")) return "午休时见一面";
  if (detail.includes("计划")) return `安排${detail}`;

  return detail;
}

function createChineseHobbyActivity(detail: string) {
  if (detail.includes("吉他曲")) return `练${detail}`;
  if (detail.includes("一盘棋")) return "下一盘棋";
  if (detail.includes("花园种子")) return `种${detail}`;
  if (detail.includes("语言学习软件")) return `用${detail}练习`;
  if (detail.includes("电影清单")) return `整理${detail}`;
  if (detail.includes("食谱")) return `试试${detail}`;
  if (detail.includes("播客")) return `听${detail}`;
  if (detail.includes("图样") || detail.includes("速写")) return `练${detail}`;

  return `弄${detail}`;
}

function createChineseSportsActivity(detail: string) {
  if (detail.endsWith("课")) return `上${detail}`;
  if (detail.includes("篮球赛")) return "打篮球";
  if (detail.includes("短跑")) return "去跑一小段";
  if (detail.includes("骑车")) return "去骑车";
  if (detail.includes("徒步路线")) return "去徒步";
  if (detail.includes("健身房训练")) return "去健身房训练";
  if (detail.includes("网球练习")) return "练网球";
  if (detail.includes("早晨拉伸")) return "做早晨拉伸";

  return `试试${detail}`;
}

const CHINESE_TIME_PREFIX_SOURCE =
  "今天早上|今天傍晚|今天|下班后|晚饭前|这个周末|明天早上|明天一早|出门前|午休时|下课后|睡觉前|周五|下周|今晚|午饭后|上课前|早饭后|周一|下个月|短暂休息时|到家后|开会前|放学后|出发前|回家路上|上班前|通话后|周末期间|有空时";

function createChineseNegativeAction(action: string) {
  const match = action.match(new RegExp(`^(${CHINESE_TIME_PREFIX_SOURCE})(.+)$`));

  if (match) {
    return `${match[1]}不${match[2]}`;
  }

  return `不${action}`;
}

function createTopicFromScene(scene: PracticeSceneSeed): BasicPracticeTopic {
  const gerund = createGerundPhrase(scene.action);

  return {
    action: scene.action,
    apologyAction: `keep you waiting while I ${scene.action}`,
    benefit: scene.benefit,
    clause: scene.clause,
    difficultNoun: scene.problem,
    emotion: scene.emotion,
    gerund,
    idiomatic: scene.noun,
    method: "sending a quick message",
    moreFirst: `I ${scene.action}`,
    moreSecond: scene.result,
    noun: scene.noun,
    optionA: scene.noun,
    optionB: `not ${gerund}`,
    pastParticiple: `handled ${scene.noun}`,
    pastSimple: `handled ${scene.noun}`,
    problem: scene.problem,
    reason: scene.reason,
    result: scene.result,
    sceneKey: scene.key,
    simple: scene.noun,
    theme: scene.category,
    timePoint: "a busy day",
    whenClause: scene.reason,
    zhAction: scene.zhAction,
    zhApologyAction: `让你等我${scene.zhAction}`,
    zhBenefit: scene.zhBenefit,
    zhClause: scene.zhClause,
    zhDifficultNoun: scene.zhProblem,
    zhEmotion: scene.zhEmotion,
    zhGerund: scene.zhAction,
    zhMethod: "发一条简短消息",
    zhMoreFirst: `我${scene.zhAction}`,
    zhMoreSecond: scene.zhResult,
    zhNoun: scene.zhNoun,
    zhOptionA: scene.zhNoun,
    zhOptionB: createChineseNegativeAction(scene.zhAction),
    zhPastParticiple: scene.zhAction,
    zhPastSimple: scene.zhAction,
    zhProblem: scene.zhProblem,
    zhReason: scene.zhReason,
    zhResult: scene.zhResult,
    zhTimePoint: "忙碌的一天",
    zhWhenClause: scene.zhReason,
  };
}

type ScopedSceneParts = Omit<PracticeSceneSeed, "category" | "key">;

function getScenePoolKey(sceneKey: string) {
  return sceneKey.split("-")[0] || sceneKey;
}

function createMomentScopedScene(
  scene: PracticeSceneSeed,
  levelId: SentencePatternLevelId,
  patternId: number,
  practiceIndex: number,
  poolKey: string,
  person: SentencePatternScenarioTerm,
  detail: SentencePatternScenarioTerm,
  moment: (typeof sentencePatternSceneDetails)[number],
  parts: ScopedSceneParts
): PracticeSceneSeed {
  return {
    ...scene,
    ...parts,
    action: `${parts.action} ${moment.action}`,
    clause: `${parts.clause} ${moment.noun}`,
    key: `${poolKey}-${person.key}-${detail.key}-${moment.key}-${levelId}-${patternId}-${practiceIndex + 1}`,
    noun: `${parts.noun} ${moment.noun}`,
    problem: `${parts.problem} ${moment.noun}`,
    reason: `${parts.reason} ${moment.noun}`,
    result: `${parts.result} ${moment.noun}`,
    zhAction: combineChineseMomentPhrase(moment.zhAction, parts.zhAction),
    zhClause: combineChineseMomentPhrase(moment.zhAction, parts.zhClause),
    zhNoun: combineChineseMomentPhrase(moment.zhNoun, parts.zhNoun),
    zhProblem: combineChineseMomentPhrase(moment.zhAction, parts.zhProblem),
    zhReason: combineChineseMomentPhrase(moment.zhAction, parts.zhReason),
    zhResult: combineChineseMomentPhrase(moment.zhAction, parts.zhResult),
  };
}

function getSentencePatternLevelIndex(levelId: SentencePatternLevelId) {
  if (levelId === "intermediate") return 1;
  if (levelId === "advanced") return 2;
  return 0;
}

function createScopedSceneSeed(
  scene: PracticeSceneSeed,
  levelId: SentencePatternLevelId,
  patternId: number,
  practiceIndex: number
): PracticeSceneSeed {
  const poolKey = getScenePoolKey(scene.key);
  const people = sentencePatternScenarioPeopleByPool[poolKey] || sentencePatternScenarioPeople;
  const details =
    sentencePatternScenarioDetails[poolKey] || sentencePatternScenarioDetails.plans;
  const sequenceBase =
    getSentencePatternLevelIndex(levelId) * 1000 +
    (patternId - 1) * COURSE_PRACTICES_PER_PATTERN +
    practiceIndex;
  const comboSpan =
    people.length * details.length * sentencePatternSceneDetails.length;
  const sequence = (sequenceBase + createHash(poolKey)) % comboSpan;
  const person = people[sequence % people.length];
  const detail = details[Math.floor(sequence / people.length) % details.length];
  const moment =
    sentencePatternSceneDetails[
      Math.floor(sequence / (people.length * details.length)) %
        sentencePatternSceneDetails.length
    ];
  const build = (parts: ScopedSceneParts) =>
    createMomentScopedScene(
      scene,
      levelId,
      patternId,
      practiceIndex,
      poolKey,
      person,
      detail,
      moment,
      parts
    );

  switch (poolKey) {
    case "emotion":
      return build({
        action: `calm down before talking to ${person.en} about ${detail.en}`,
        benefit: "helps me respond more kindly",
        clause: `${detail.en} is affecting my mood`,
        emotion: "upset",
        noun: `a calm talk with ${person.en} about ${detail.en}`,
        problem: `${detail.en} is bothering me`,
        reason: `${person.en} needs a calmer answer`,
        result: "I can respond without hurting anyone",
        zhAction: `冷静一下再和${person.zh}聊${detail.zh}`,
        zhBenefit: "帮助我更友善地回应",
        zhClause: `${detail.zh}影响了我的心情`,
        zhEmotion: "不安",
        zhNoun: `和${person.zh}平静地聊${detail.zh}`,
        zhProblem: `${detail.zh}让我有点难受`,
        zhReason: `${person.zh}需要更平和的回复`,
        zhResult: "我能不伤人地回应",
      });
    case "family":
      return build({
        action: `call ${person.en} about ${detail.en}`,
        benefit: "keeps the family connected",
        clause: `${person.en} wants to talk about ${detail.en}`,
        emotion: "warm",
        noun: `a call with ${person.en} about ${detail.en}`,
        problem: `${person.en} is waiting to talk about ${detail.en}`,
        reason: `${detail.en} matters to the family`,
        result: `${person.en} feels listened to`,
        zhAction: `给${person.zh}打电话聊${detail.zh}`,
        zhBenefit: "让家人之间更有联系",
        zhClause: `${person.zh}想聊聊${detail.zh}`,
        zhEmotion: "温暖",
        zhNoun: `和${person.zh}聊${detail.zh}的电话`,
        zhProblem: `${person.zh}正等着聊${detail.zh}`,
        zhReason: `${detail.zh}对家里挺重要`,
        zhResult: `${person.zh}会觉得有人认真听`,
      });
    case "food":
      return build({
        action: `make ${detail.en} with ${person.en}`,
        benefit: "makes the meal feel easier",
        clause: `${person.en} wants to eat ${detail.en}`,
        emotion: "hungry",
        noun: `${detail.en} with ${person.en}`,
        problem: `we have not decided what to eat`,
        reason: `${detail.en} sounds simple and warm`,
        result: "dinner feels easier",
        zhAction: `和${person.zh}一起做${detail.zh}`,
        zhBenefit: "让吃饭这件事更轻松",
        zhClause: `${person.zh}想吃${detail.zh}`,
        zhEmotion: "饿",
        zhNoun: `和${person.zh}一起吃的${detail.zh}`,
        zhProblem: "我们还没决定吃什么",
        zhReason: `${detail.zh}简单又舒服`,
        zhResult: "晚饭会轻松很多",
      });
    case "friends": {
      const socialActivity = createChineseSocialActivity(detail.zh);
      return build({
        action: `meet ${person.en} for ${detail.en}`,
        benefit: "helps us catch up",
        clause: `${person.en} wants to meet for ${detail.en}`,
        emotion: "happy",
        noun: `${detail.en} with ${person.en}`,
        problem: `${person.en} and I have not caught up lately`,
        reason: `${detail.en} gives us time to talk`,
        result: "we can talk properly",
        zhAction: `和${person.zh}一起${socialActivity}`,
        zhBenefit: "让我们好好叙旧",
        zhClause: `${person.zh}想一起${socialActivity}`,
        zhEmotion: "开心",
        zhNoun: `和${person.zh}一起${socialActivity}`,
        zhProblem: `我和${person.zh}最近没怎么聊`,
        zhReason: `${detail.zh}正好能聊聊天`,
        zhResult: "我们可以好好聊一聊",
      });
    }
    case "health":
      return build({
        action: `ask ${person.en} about ${detail.en}`,
        benefit: "helps me take better care of myself",
        clause: `${detail.en} needs attention`,
        emotion: "tired",
        noun: `advice from ${person.en} about ${detail.en}`,
        problem: `${detail.en} is bothering me`,
        reason: `${person.en} may know what to do`,
        result: "I feel safer about my health",
        zhAction: `问问${person.zh}关于${detail.zh}的事`,
        zhBenefit: "帮助我更好照顾自己",
        zhClause: `${detail.zh}需要注意`,
        zhEmotion: "疲惫",
        zhNoun: `${person.zh}关于${detail.zh}的建议`,
        zhProblem: `${detail.zh}让我不太舒服`,
        zhReason: `${person.zh}可能知道怎么办`,
        zhResult: "我对自己的健康更安心",
      });
    case "help":
      return build({
        action: `ask ${person.en} for help with ${detail.en}`,
        benefit: "makes the task easier",
        clause: `${detail.en} is hard to handle alone`,
        emotion: "thankful",
        noun: `help from ${person.en} with ${detail.en}`,
        problem: `${detail.en} is hard to handle alone`,
        reason: `${person.en} is nearby`,
        result: "the task gets easier",
        zhAction: `请${person.zh}帮忙处理${detail.zh}`,
        zhBenefit: "让这件事更容易",
        zhClause: `${detail.zh}一个人不好处理`,
        zhEmotion: "感激",
        zhNoun: `${person.zh}在${detail.zh}上的帮助`,
        zhProblem: `${detail.zh}一个人不好处理`,
        zhReason: `${person.zh}就在附近`,
        zhResult: "这件事会容易很多",
      });
    case "hobby": {
      const hobbyActivity = createChineseHobbyActivity(detail.zh);
      return build({
        action: `work on ${detail.en} with ${person.en}`,
        benefit: "makes practice feel more fun",
        clause: `${detail.en} would be more fun with ${person.en}`,
        emotion: "relaxed",
        noun: `${detail.en} with ${person.en}`,
        problem: `I have not spent time on ${detail.en} lately`,
        reason: `${person.en} can keep me motivated`,
        result: "the activity feels more enjoyable",
        zhAction: `和${person.zh}一起${hobbyActivity}`,
        zhBenefit: "让这件事更有意思",
        zhClause: `和${person.zh}一起${hobbyActivity}会更有意思`,
        zhEmotion: "放松",
        zhNoun: `和${person.zh}一起${hobbyActivity}`,
        zhProblem: `我最近没怎么碰${detail.zh}`,
        zhReason: `${person.zh}能让我更有动力`,
        zhResult: "这件事会更有意思",
      });
    }
    case "holiday":
      return build({
        action: `prepare ${detail.en} for ${person.en}`,
        benefit: "makes the day feel special",
        clause: `${detail.en} would make ${person.en} happy`,
        emotion: "grateful",
        noun: `${detail.en} for ${person.en}`,
        problem: `I have not prepared ${detail.en} yet`,
        reason: `${person.en} would appreciate it`,
        result: `${person.en} feels remembered`,
        zhAction: `给${person.zh}准备${detail.zh}`,
        zhBenefit: "让这个日子更有心意",
        zhClause: `${detail.zh}会让${person.zh}开心`,
        zhEmotion: "感激",
        zhNoun: `给${person.zh}的${detail.zh}`,
        zhProblem: `我还没准备${detail.zh}`,
        zhReason: `${person.zh}会很珍惜这份心意`,
        zhResult: `${person.zh}会觉得被惦记`,
      });
    case "home":
      return build({
        action: `take care of ${detail.en} with ${person.en}`,
        benefit: "keeps the home comfortable",
        clause: `${detail.en} needs attention`,
        emotion: "calm",
        noun: `${detail.en} at home`,
        problem: `${detail.en} is making the home feel messy`,
        reason: `${person.en} can help me handle it faster`,
        result: "home feels cleaner",
        zhAction: `和${person.zh}一起处理${detail.zh}`,
        zhBenefit: "让家里更舒服",
        zhClause: `${detail.zh}需要处理一下`,
        zhEmotion: "平静",
        zhNoun: `家里的${detail.zh}`,
        zhProblem: `${detail.zh}让家里显得有点乱`,
        zhReason: `${person.zh}能帮我更快处理好`,
        zhResult: "家里会更干净",
      });
    case "kids":
      return build({
        action: `help ${person.en} with ${detail.en}`,
        benefit: "helps the child feel supported",
        clause: `${person.en} needs help with ${detail.en}`,
        emotion: "loving",
        noun: `${detail.en} for ${person.en}`,
        problem: `${person.en} is stuck on ${detail.en}`,
        reason: `${person.en} needs patient help`,
        result: `${person.en} feels more confident`,
        zhAction: `帮${person.zh}处理${detail.zh}`,
        zhBenefit: "让孩子觉得有人支持",
        zhClause: `${person.zh}需要帮忙处理${detail.zh}`,
        zhEmotion: "温柔",
        zhNoun: `${person.zh}的${detail.zh}`,
        zhProblem: `${person.zh}在${detail.zh}上卡住了`,
        zhReason: `${person.zh}需要耐心帮一下`,
        zhResult: `${person.zh}会更有信心`,
      });
    case "money":
      return build({
        action: `talk with ${person.en} about ${detail.en}`,
        benefit: "helps me spend more wisely",
        clause: `${detail.en} needs a clear plan`,
        emotion: "responsible",
        noun: `a plan for ${detail.en}`,
        problem: `${detail.en} feels unclear`,
        reason: `${person.en} can help me think it through`,
        result: "the money plan feels clearer",
        zhAction: `和${person.zh}聊聊${detail.zh}`,
        zhBenefit: "帮助我更理性花钱",
        zhClause: `${detail.zh}需要一个清楚计划`,
        zhEmotion: "负责",
        zhNoun: `${detail.zh}的计划`,
        zhProblem: `${detail.zh}还不太清楚`,
        zhReason: `${person.zh}能帮我想清楚`,
        zhResult: "用钱计划会更清楚",
      });
    case "plans":
      return build({
        action: `make a plan for ${detail.en} with ${person.en}`,
        benefit: "keeps the day organized",
        clause: `${detail.en} needs a clear plan`,
        emotion: "organized",
        noun: `a plan for ${detail.en}`,
        problem: `${detail.en} has too many moving parts`,
        reason: `${person.en} is involved`,
        result: "the plan feels easier to follow",
        zhAction: `和${person.zh}一起安排${detail.zh}`,
        zhBenefit: "让一天更有条理",
        zhClause: `${detail.zh}需要一个清楚安排`,
        zhEmotion: "有条理",
        zhNoun: `${detail.zh}安排`,
        zhProblem: `${detail.zh}有不少细节`,
        zhReason: `${person.zh}也会参与`,
        zhResult: "计划会更容易执行",
      });
    case "school":
      return build({
        action: `review ${detail.en} with ${person.en}`,
        benefit: "helps me follow the lesson",
        clause: `${detail.en} needs more review`,
        emotion: "prepared",
        noun: `${detail.en} review with ${person.en}`,
        problem: `I am not ready for ${detail.en}`,
        reason: `${person.en} can study with me`,
        result: "I feel more prepared",
        zhAction: `和${person.zh}一起复习${detail.zh}`,
        zhBenefit: "帮助我跟上课程",
        zhClause: `${detail.zh}还需要多复习`,
        zhEmotion: "有准备",
        zhNoun: `和${person.zh}一起复习${detail.zh}`,
        zhProblem: `我对${detail.zh}还没准备好`,
        zhReason: `${person.zh}可以和我一起学`,
        zhResult: "我会更有把握",
      });
    case "shopping":
      return build({
        action: `compare prices for ${detail.en} with ${person.en}`,
        benefit: "helps me spend wisely",
        clause: `${detail.en} may be cheaper somewhere else`,
        emotion: "careful",
        noun: `a better price for ${detail.en}`,
        problem: `${detail.en} costs more than expected`,
        reason: `${person.en} may know a better store`,
        result: "I can save some money",
        zhAction: `和${person.zh}一起比比${detail.zh}的价格`,
        zhBenefit: "帮助我理性消费",
        zhClause: `${detail.zh}别的地方可能更便宜`,
        zhEmotion: "谨慎",
        zhNoun: `${detail.zh}更好的价格`,
        zhProblem: `${detail.zh}比预想的贵`,
        zhReason: `${person.zh}可能知道更合适的店`,
        zhResult: "我可以省点钱",
      });
    case "sports": {
      const sportsActivity = createChineseSportsActivity(detail.zh);
      return build({
        action: `try ${detail.en} with ${person.en}`,
        benefit: "helps me stay active",
        clause: `${detail.en} would be good exercise`,
        emotion: "energetic",
        noun: `${detail.en} with ${person.en}`,
        problem: `I have not exercised much lately`,
        reason: `${person.en} can keep me company`,
        result: "my body feels more awake",
        zhAction: `和${person.zh}一起${sportsActivity}`,
        zhBenefit: "让我保持活力",
        zhClause: `${detail.zh}是不错的运动`,
        zhEmotion: "有活力",
        zhNoun: `和${person.zh}一起${sportsActivity}`,
        zhProblem: "我最近运动不太够",
        zhReason: `${person.zh}可以陪我一起`,
        zhResult: "身体会更清醒",
      });
    }
    case "tech":
      return build({
        action: `work on ${detail.en} with ${person.en}`,
        benefit: "keeps the tech problem under control",
        clause: `${detail.en} needs attention`,
        emotion: "careful",
        noun: `${detail.en} with ${person.en}`,
        problem: `${detail.en} is slowing me down`,
        reason: `${person.en} can help me check it`,
        result: "the device works better",
        zhAction: `和${person.zh}一起处理${detail.zh}`,
        zhBenefit: "让电子设备的问题可控",
        zhClause: `${detail.zh}需要处理一下`,
        zhEmotion: "谨慎",
        zhNoun: `和${person.zh}一起处理${detail.zh}`,
        zhProblem: `${detail.zh}影响了我`,
        zhReason: `${person.zh}能帮我检查一下`,
        zhResult: "设备会更好用",
      });
    case "traffic":
      return build({
        action: `leave early for ${detail.en} with ${person.en}`,
        benefit: "helps me arrive on time",
        clause: `${detail.en} may take longer than expected`,
        emotion: "alert",
        noun: `enough time for ${detail.en}`,
        problem: `${detail.en} may be delayed`,
        reason: `${person.en} is coming with me`,
        result: "we arrive on time",
        zhAction: `和${person.zh}早点出发处理${detail.zh}`,
        zhBenefit: "帮助我准时到达",
        zhClause: `${detail.zh}可能比想象中久`,
        zhEmotion: "警觉",
        zhNoun: `为${detail.zh}预留的时间`,
        zhProblem: `${detail.zh}可能会耽误行程`,
        zhReason: `${person.zh}要和我一起去`,
        zhResult: "我们能准时到",
      });
    case "travel":
      return build({
        action: `plan ${detail.en} with ${person.en}`,
        benefit: "makes the trip easier",
        clause: `${detail.en} needs planning`,
        emotion: "excited",
        noun: `preparation for ${detail.en}`,
        problem: `${detail.en} is not ready yet`,
        reason: `${person.en} is part of the trip`,
        result: "the trip feels easier",
        zhAction: `和${person.zh}一起准备${detail.zh}`,
        zhBenefit: "让旅行更轻松",
        zhClause: `${detail.zh}需要提前安排`,
        zhEmotion: "兴奋",
        zhNoun: `${detail.zh}的准备`,
        zhProblem: `${detail.zh}还没准备好`,
        zhReason: `${person.zh}也会一起去`,
        zhResult: "旅行会更轻松",
      });
    case "weather":
      return build({
        action: `remind ${person.en} to prepare for ${detail.en}`,
        benefit: "keeps us ready for the weather",
        clause: `${detail.en} may be affected by the weather`,
        emotion: "careful",
        noun: `weather preparation for ${detail.en}`,
        problem: `${detail.en} may be affected by the weather`,
        reason: `${person.en} may forget to prepare`,
        result: "we do not get caught off guard",
        zhAction: `提醒${person.zh}为${detail.zh}提前准备`,
        zhBenefit: "让我们不被天气影响",
        zhClause: `天气可能会影响${detail.zh}`,
        zhEmotion: "谨慎",
        zhNoun: `为${detail.zh}提前准备`,
        zhProblem: `${detail.zh}受天气影响`,
        zhReason: `${person.zh}可能会忘记准备`,
        zhResult: "我们不会措手不及",
      });
    case "work":
      return build({
        action: `organize ${detail.en} for ${person.en}`,
        benefit: "helps the work move clearly",
        clause: `${person.en} needs ${detail.en}`,
        emotion: "focused",
        noun: `${detail.en} for ${person.en}`,
        problem: `${detail.en} is not organized yet`,
        reason: `${person.en} needs it soon`,
        result: "the work becomes easier to follow",
        zhAction: `帮${person.zh}整理${detail.zh}`,
        zhBenefit: "让工作推进更清楚",
        zhClause: `${person.zh}需要${detail.zh}`,
        zhEmotion: "专注",
        zhNoun: `给${person.zh}的${detail.zh}`,
        zhProblem: `${detail.zh}还没整理好`,
        zhReason: `${person.zh}很快就要用`,
        zhResult: "工作会更容易跟进",
      });
    default:
      return createMomentScopedScene(
        scene,
        levelId,
        patternId,
        practiceIndex,
        poolKey,
        person,
        detail,
        moment,
        scene
      );
  }
}

function selectSceneSeedsForPattern(levelId: SentencePatternLevelId, patternId: number) {
  const seed = `${levelId}:${patternId}`;
  const shuffled = [...sentencePatternSceneSeeds].sort(
    (left, right) =>
      createHash(`${seed}:${left.key}`) - createHash(`${seed}:${right.key}`)
  );
  const selected: PracticeSceneSeed[] = [];
  const remaining = [...shuffled];

  while (selected.length < COURSE_PRACTICES_PER_PATTERN && remaining.length) {
    const lastTheme = selected[selected.length - 1]?.category;
    const nextIndex = Math.max(
      remaining.findIndex((scene) => scene.category !== lastTheme),
      0
    );
    const [next] = remaining.splice(nextIndex, 1);
    selected.push(next);
  }

  return selected;
}

function selectPracticeTopicsForPattern(
  levelId: SentencePatternLevelId,
  patternId: number
) {
  const selectedTopics = selectSceneSeedsForPattern(levelId, patternId).map(
    (scene, index) =>
      createTopicFromScene(createScopedSceneSeed(scene, levelId, patternId, index))
  );

  return selectedTopics.length
    ? selectedTopics
    : basicPracticeTopics.slice(0, COURSE_PRACTICES_PER_PATTERN);
}

function cleanGeneratedSentence(value: string) {
  return value
    .replace(/[\u2018\u2019\u02bc`]/g, "'")
    .replace(/\b([A-Za-z])'\s+([A-Za-z])\b/g, "$1'$2")
    .replace(/\s+/g, " ")
    .trim();
}

const CHINESE_TIME_MODIFIER_PATTERN = new RegExp(
  `(${CHINESE_TIME_PREFIX_SOURCE})的`,
  "g"
);

function stripChineseSentenceEnding(value: string) {
  return value.replace(/[。！？!?]+$/g, "").trim();
}

function cleanChinesePracticeText(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/，。/g, "。")
    .replace(CHINESE_TIME_MODIFIER_PATTERN, "$1")
    .replace(/的(安排|计划|准备|备份|帮助|价格|时间)的/g, "$1的")
    .replace(/关于(.+?)的诚实反馈/g, "对$1的真实反馈")
    .trim();
}

function withFinalChinesePunctuation(value: string, fallback: string) {
  const text = improveChinesePromptSyntax(
    cleanChinesePracticeText(value) || cleanChinesePracticeText(fallback)
  );
  if (!text) return text;
  if (/[。！？?]$/.test(text)) return text.replace(/\?$/g, "？");

  return `${text}。`;
}

function normalizeChineseNounPhrase(value: string) {
  return stripChineseSentenceEnding(cleanChinesePracticeText(value))
    .replace(/(.+)的安排$/g, "$1安排")
    .replace(/(.+)的计划$/g, "$1计划")
    .replace(/(.+)的准备$/g, "$1准备")
    .replace(/(.+)的天气准备$/g, "$1天气准备")
    .replace(/(.+)的充足时间$/g, "$1充足时间")
    .replace(/(.+)更好的价格$/g, "$1合适价格")
    .trim();
}

function createChineseTaskFromNounPhrase(value: string) {
  const text = normalizeChineseNounPhrase(value);
  const helpMatch = text.match(/^(.+)在(.+)上的帮助$/);
  if (helpMatch) return `能不能请${helpMatch[1]}帮忙处理${helpMatch[2]}`;

  const reservedTimeMatch = text.match(/^为(.+)预留的时间$/);
  if (reservedTimeMatch) return `${reservedTimeMatch[1]}要预留多少时间`;

  const scopedWeatherMatch = text.match(/^为(.+)做的天气准备$/);
  if (scopedWeatherMatch) return `${scopedWeatherMatch[1]}遇到天气变化怎么准备`;

  const weatherPreparationMatch = text.match(/^为(.+)提前准备$/);
  if (weatherPreparationMatch) return `${weatherPreparationMatch[1]}遇到天气变化怎么准备`;

  const arrangementMatch = text.match(/^(.+)安排$/);
  if (arrangementMatch) return `${arrangementMatch[1]}怎么安排`;

  const planMatch = text.match(/^(.+)计划$/);
  if (
    planMatch &&
    /(周六|周末|旅行|电影|家庭电话|运动时间|学习时间|打扫|晚饭|午饭|预约|行程)/.test(
      planMatch[1]
    )
  ) {
    return `${planMatch[1]}怎么安排`;
  }

  const weatherMatch = text.match(/^(.+)天气准备$/);
  if (weatherMatch) return `${weatherMatch[1]}遇到天气变化怎么准备`;

  const preparationMatch = text.match(/^(.+)准备$/);
  if (preparationMatch) return `${preparationMatch[1]}要怎么准备`;

  const timeMatch = text.match(/^(.+)充足时间$/);
  if (timeMatch) return `${timeMatch[1]}要预留多少时间`;

  const priceMatch = text.match(/^(.+)合适价格$/);
  if (priceMatch) return `${priceMatch[1]}有没有更合适的价格`;

  const backupMatch = text.match(/^(.+)的备份$/);
  if (backupMatch) return `${backupMatch[1]}怎么备份`;

  return text;
}

function createChineseLookingForPrompt(zhNoun: string) {
  const phrase = normalizeChineseNounPhrase(zhNoun);
  const task = createChineseTaskFromNounPhrase(phrase);

  if (task !== phrase) {
    return withFinalChinesePunctuation(`我想先确认一下，${task}`, phrase);
  }

  return withFinalChinesePunctuation(`我正在找${phrase}`, phrase);
}

function normalizeChinesePracticePrompt(chinese: string, targetEnglish: string) {
  const cleaned = cleanChinesePracticeText(chinese);
  const lookingForMatch = cleaned.match(/^我真正想找的是(.+?)[。！？?]?$/);
  if (lookingForMatch) {
    return createChineseLookingForPrompt(lookingForMatch[1]);
  }

  const regularLookingForMatch = cleaned.match(/^我正在找(.+?)[。！？?]?$/);
  if (regularLookingForMatch) {
    const phrase = normalizeChineseNounPhrase(regularLookingForMatch[1]);
    const task = createChineseTaskFromNounPhrase(phrase);

    if (task !== phrase) {
      return withFinalChinesePunctuation(`我想确认一下，${task}`, cleaned);
    }
  }

  const onlyNeedMatch = cleaned.match(/^我需要的只是(.+?)[。！？?]?$/);
  if (onlyNeedMatch) {
    const phrase = normalizeChineseNounPhrase(onlyNeedMatch[1]);
    const task = createChineseTaskFromNounPhrase(phrase);

    if (task !== phrase) {
      return withFinalChinesePunctuation(`我只需要确认一下，${task}`, cleaned);
    }
  }

  const missingMatch = cleaned.match(/^唯一缺少的是(.+?)[。！？?]?$/);
  if (missingMatch) {
    const phrase = normalizeChineseNounPhrase(missingMatch[1]);
    const task = createChineseTaskFromNounPhrase(phrase);

    if (task !== phrase) {
      return withFinalChinesePunctuation(`现在就差确认一下，${task}`, cleaned);
    }
  }

  const text = cleaned
    .replace(/^我真正想要的是/, "我最想要的是")
    .replace(/^我真正需要的是/, "我最需要的是");

  return withFinalChinesePunctuation(improveChinesePromptSyntax(text), chinese || targetEnglish);
}

function combineChineseMomentPhrase(moment: string, phrase: string) {
  const cleanedMoment = stripChineseSentenceEnding(moment);
  const cleanedPhrase = normalizeChineseNounPhrase(phrase);

  if (!cleanedMoment || cleanedPhrase.startsWith(cleanedMoment)) {
    return cleanedPhrase;
  }

  return `${cleanedMoment}${cleanedPhrase}`;
}

function improveChinesePromptSyntax(value: string) {
  const timePrefix = new RegExp(`为什么不(${CHINESE_TIME_PREFIX_SOURCE})(.+?)呢`, "g");
  const forcedAction = new RegExp(`不得不(${CHINESE_TIME_PREFIX_SOURCE})([^，。！？]+)`, "g");

  return value
    .replace(timePrefix, "为什么$1不$2呢")
    .replace(forcedAction, "$1不得不$2")
    .replace(/由于([^，。！？；]+)和\1，/g, "由于$1，");
}

function withFinalPunctuation(value: string, fallback: string) {
  const sentence = cleanGeneratedSentence(value) || fallback;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function capitalizeFirst(value: string) {
  const text = cleanGeneratedSentence(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function createSimplePracticeVariant(targetEnglish: string) {
  const text = cleanGeneratedSentence(targetEnglish);
  const replacements: Array<[RegExp, string | ((...matches: string[]) => string)]> = [
    [/^I'd like to (.+)\.$/i, "I want to $1."],
    [/^I[’']d like to (.+)\.$/, "I want to $1."],
    [/^I really want to (.+)\.$/, "I want to $1."],
    [/^Could you (.+) for me\?$/, "Can you $1?"],
    [/^If it's not too much trouble, could you (.+)\?$/i, "Could you $1?"],
    [/^If it[’']s not too much trouble, could you (.+)\?$/, "Could you $1?"],
    [/^I would appreciate it if you could help me (.+)\.$/, "Please help me $1."],
    [/^I would be most grateful if you could possibly help me (.+)\.$/, "Please help me $1."],
    [/^I was wondering if you could (.+)\.$/, "Could you $1?"],
    [/^It would mean a lot to me if you could help me (.+)\.$/, "Please help me $1."],
    [/^Would it be possible for you to help me (.+)\?$/, "Could you help me $1?"],
    [/^I[’']d be grateful if you would help me (.+)\.$/, "Please help me $1."],
    [/^Should you have time, please help me (.+)\.$/, "Please help me $1."],
    [/^In my opinion, (.+)\.$/, "I think $1."],
    [/^From my point of view, (.+)\.$/, "I think $1."],
    [/^It seems to me that (.+)\.$/, "I think $1."],
    [
      /^The reason why (.+) is that (.+)\.$/,
      (_match, subject, reason) => `${capitalizeFirst(subject)} because ${reason}.`,
    ],
    [/^The problem is that (.+)\.$/, "The problem is $1."],
    [/^It is imperative that we (.+)\.$/, "We need to $1."],
    [/^It's essential that we (.+)\.$/i, "We need to $1."],
    [/^It[’']s essential that we (.+)\.$/, "We need to $1."],
    [/^I[’']m determined to (.+) no matter what\.$/, "I will $1."],
    [/^I'm determined to (.+) no matter what\.$/i, "I will $1."],
    [/^Come what may, I am resolved to (.+)\.$/, "I will $1."],
  ];

  for (const [pattern, replacement] of replacements) {
    if (!pattern.test(text)) continue;
    const replaced =
      typeof replacement === "function"
        ? text.replace(pattern, (...matches) => replacement(...matches))
        : text.replace(pattern, replacement);
    return withFinalPunctuation(replaced, text);
  }

  return text;
}

function createNaturalPracticeVariant(targetEnglish: string) {
  const source = cleanGeneratedSentence(targetEnglish);
  const likeToFinishMatch = source.match(
    /^I'd like to finish (.+) before (.+)\.$/i
  );

  if (likeToFinishMatch) {
    return withFinalPunctuation(
      `I'd like to get ${likeToFinishMatch[1]} done before ${likeToFinishMatch[2]}`,
      targetEnglish
    );
  }

  const text = source
    .replace(/^From my point of view, /, "To me, ")
    .replace(/^In my opinion, /, "I think ")
    .replace(/^I would like to /, "I'd like to ")
    .replace(/^I am /, "I'm ")
    .replace(/^I will /, "I'll ")
    .replace(/\bIt is\b/g, "It's")
    .replace(/\bThere is\b/g, "There's")
    .replace(/\bI cannot\b/g, "I can't")
    .replace(/\bdo not\b/g, "don't")
    .replace(/\bdoes not\b/g, "doesn't");

  return withFinalPunctuation(text, targetEnglish);
}

function createIdiomaticPracticeVariant(targetEnglish: string, naturalEnglish: string) {
  const text = cleanGeneratedSentence(targetEnglish);
  const replacements: Array<[RegExp, string]> = [
    [/^I'd like to finish (.+) before (.+)\.$/i, "I'd like to wrap up $1 before $2."],
    [/^I'd like to (.+)\.$/i, "I'd really like to $1."],
    [/^I want to (.+)\.$/, "I'd really like to $1."],
    [/^I want (.+)\.$/, "I'd really like $1."],
    [/^I need (?!to\b)(.+)\.$/, "I could really use $1."],
    [/^I'm worried about (.+)\.$/i, "I'm a bit worried about $1."],
    [/^I[’']m worried about (.+)\.$/, "I'm a bit worried about $1."],
    [/^I[’']m excited that (.+)\.$/, "I'm really excited that $1."],
    [/^I'm excited that (.+)\.$/i, "I'm really excited that $1."],
    [/^Can you help me (.+)\?$/, "Could you help me $1?"],
    [/^I have to (.+) because (.+)\.$/, "I need to $1 because $2."],
  ];

  for (const [pattern, replacement] of replacements) {
    if (!pattern.test(text)) continue;
    return withFinalPunctuation(text.replace(pattern, replacement), naturalEnglish);
  }

  return naturalEnglish || text;
}

function comparablePracticeVariant(value: string) {
  return cleanGeneratedSentence(value)
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripEnglishFinalPunctuation(value: string) {
  return cleanGeneratedSentence(value).replace(/[.!?]+$/g, "");
}

function lowerFirstPracticeWord(value: string) {
  const text = cleanGeneratedSentence(value);
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function shortPracticePhrase(value: string, maxWords = 4) {
  const withoutDetails = stripEnglishFinalPunctuation(value)
    .replace(/\s+(?:with|for|at|in|on|during|after|before|because)\s+.+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = (withoutDetails || stripEnglishFinalPunctuation(value))
    .split(/\s+/)
    .filter(Boolean);

  return words.length > maxWords ? words.slice(0, maxWords).join(" ") : words.join(" ");
}

function practiceQuestion(value: string) {
  const text = stripEnglishFinalPunctuation(value);
  return text ? `${text}?` : "";
}

function practiceSentence(value: string) {
  const text = stripEnglishFinalPunctuation(value);
  return text ? `${text}.` : "";
}

function practiceExclamation(value: string) {
  const text = stripEnglishFinalPunctuation(value);
  return text ? `${text}!` : "";
}

function isPluralPracticeSubject(value: string) {
  const subject = cleanGeneratedSentence(value).toLowerCase();

  return (
    /\b(?:parents|kids|children|people|friends|shoes|clothes|noodles|vegetables|tickets|keys)\b/.test(
      subject
    ) || (subject.endsWith("s") && !/(?:ss|is)$/.test(subject))
  );
}

function practicePronounForSubject(subject: string) {
  const normalized = cleanGeneratedSentence(subject).toLowerCase();

  if (/\b(?:husband|father|dad|brother|son)\b/.test(normalized)) return "He";
  if (/\b(?:wife|mother|mom|sister|daughter)\b/.test(normalized)) return "She";
  if (isPluralPracticeSubject(normalized) || /\bfamily\b/.test(normalized)) return "They";

  return "It";
}

function withPracticeArticle(value: string) {
  const phrase = cleanGeneratedSentence(value);
  if (!phrase || /^(?:a|an|the|my|your|our|his|her|their)\b/i.test(phrase)) return phrase;

  return /^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`;
}

function isWeakPracticeCandidate(value: string) {
  const text = cleanGeneratedSentence(value);

  return (
    /^I really (?:.+ (?:is|are) not my cup|[a-z]+ is|[a-z]+ are|my|the|we'?d|you'?re|cheer up|take care)\b/i.test(text) ||
    /^That's really about\b/i.test(text) ||
    /^I'm pretty (?:just|working on|on a tight|looking for)\b/i.test(text) ||
    /\bgreat (?:nice|good|wonderful)\b/i.test(text) ||
    /^Have a (?:safe|great) .+\?$/i.test(text)
  );
}

function isBillPracticeRequest(value: string) {
  return /\b(?:bill|check)\b/i.test(value) && /(?:please|bring|get|like|settle|pay)/i.test(value);
}

function backupNaturalPracticeVariant(standard: string) {
  const text = withFinalPunctuation(standard, standard);

  if (isBillPracticeRequest(text)) return "Could we get the bill, please?";
  if (/^How about /i.test(text)) return text.replace(/^How about /i, "What about ");
  if (/^Can /i.test(text)) return text.replace(/^Can /i, "Could ");
  if (/^Do you /i.test(text)) return text.replace(/^Do you /i, "Do you happen to ");
  if (/^Where /i.test(text)) return text.replace(/^Where /i, "Could you tell me where ");
  if (/^What time /i.test(text)) return text.replace(/^What time /i, "Do you know when ");
  if (/^What /i.test(text)) return text.replace(/^What /i, "Could you tell me what ");
  if (/^How /i.test(text)) return text.replace(/^How /i, "Could you tell me how ");
  if (/^I agree with /i.test(text)) return "I agree with that.";
  if (/^I disagree with /i.test(text)) return "I don't agree with that.";
  if (/^I(?:'m| am) ([A-Za-z ]+) about (.+)\.$/i.test(text)) {
    return text
      .replace(/^I am /i, "I feel ")
      .replace(/^I'm /i, "I feel ");
  }
  if (/^I(?:'m| am) ([A-Za-z ]+) after (.+)\.$/i.test(text)) {
    return text
      .replace(/^I am /i, "I feel ")
      .replace(/^I'm /i, "I feel ");
  }
  if (/^I(?:'m| am) allergic to (.+)\.$/i.test(text)) {
    const [, item] = text.match(/^I(?:'m| am) allergic to (.+)\.$/i) || [];
    return practiceSentence(`I have an allergy to ${shortPracticePhrase(item || text, 3)}`);
  }
  if (/^(.+) (is|are) the most (.+)\.$/i.test(text)) {
    const [, subject, be, quality] = text.match(/^(.+) (is|are) the most (.+)\.$/i) || [];
    return practiceSentence(`${capitalizeFirst(subject || "")} ${be} really ${shortPracticePhrase(quality || "", 3)}`);
  }
  if (/^My (.+) (is|are) (.+)\.$/i.test(text)) {
    const [, subject, be, state] = text.match(/^My (.+) (is|are) (.+)\.$/i) || [];
    return practiceSentence(`My ${subject} ${be} really ${shortPracticePhrase(state || "", 3)}`);
  }
  if (/^The (.+) (is|are) (.+)\.$/i.test(text)) {
    const [, subject, be, state] = text.match(/^The (.+) (is|are) (.+)\.$/i) || [];
    const seem = be?.toLowerCase() === "are" || isPluralPracticeSubject(subject) ? "seem" : "seems";
    return practiceSentence(`The ${subject} ${seem} ${shortPracticePhrase(state || "", 3)}`);
  }
  if (/^Good (.+)[.!]$/i.test(text)) {
    const [, phrase] = text.match(/^Good (.+)[.!]$/i) || [];
    return practiceSentence(`Nice ${shortPracticePhrase(phrase || text, 2)}`);
  }
  if (/^Sounds (.+) to me\.$/i.test(text)) {
    const [, state] = text.match(/^Sounds (.+) to me\.$/i) || [];
    return practiceSentence(`That sounds ${shortPracticePhrase(state || text, 3)} to me`);
  }
  if (/^I'?ll (.+)\.$/i.test(text)) {
    const [, action] = text.match(/^I'?ll (.+)\.$/i) || [];
    return practiceSentence(`I'll make sure to ${shortPracticePhrase(action || text, 5)}`);
  }
  if (/^Let'?s /i.test(text)) {
    return practiceQuestion(text.replace(/^Let'?s /i, "Why don't we "));
  }
  if (/^Tell me about /i.test(text)) return text.replace(/^Tell me about /i, "Can you tell me about ");
  if (/^We'?d like the bill\.$/i.test(text)) return "Could we get the bill, please?";
  if (/^I(?:'m| am) just (.+)\.$/i.test(text)) {
    const [, action] = text.match(/^I(?:'m| am) just (.+)\.$/i) || [];
    return practiceSentence(`I'm only ${shortPracticePhrase(action || text, 4)}`);
  }
  if (/^I(?:'m| am) lost\. Can you help me\?$/i.test(text)) return "I'm lost. Could you help me?";
  if (/^Safe (.+)!$/i.test(text)) {
    const [, trip] = text.match(/^Safe (.+)!$/i) || [];
    return practiceExclamation(`Have a safe ${shortPracticePhrase(trip || "trip", 2)}`);
  }
  if (/^I(?:'m| am) working on (.+)\.$/i.test(text)) {
    const [, project] = text.match(/^I(?:'m| am) working on (.+)\.$/i) || [];
    return practiceSentence(`I'm still working on ${shortPracticePhrase(project || text, 4)}`);
  }
  if (/^I(?:'m| am) on a tight (.+)\.$/i.test(text)) {
    const [, thing] = text.match(/^I(?:'m| am) on a tight (.+)\.$/i) || [];
    return practiceSentence(`I'm short on ${shortPracticePhrase(thing || "time", 3)}`);
  }
  if (/^I(?:'m| am) looking for (.+)\.$/i.test(text)) {
    const [, thing] = text.match(/^I(?:'m| am) looking for (.+)\.$/i) || [];
    return practiceSentence(`I'm trying to find ${shortPracticePhrase(thing || text, 5)}`);
  }
  if (/^I(?:'m| am) sorry to hear that\.$/i.test(text)) return "I'm really sorry to hear that.";
  if (/^I(?:'m| am) lost\. Can you help me (.+)\?$/i.test(text)) {
    const [, action] = text.match(/^I(?:'m| am) lost\. Can you help me (.+)\?$/i) || [];
    return practiceQuestion(`I'm lost. Could you help me ${shortPracticePhrase(action || "", 6)}`);
  }
  if (/^I(?:'m| am) (.+)\.$/i.test(text)) {
    const [, state] = text.match(/^I(?:'m| am) (.+)\.$/i) || [];
    return practiceSentence(`I'm feeling ${shortPracticePhrase(state || text, 4)}`);
  }
  if (/^Take care of (.+)\.$/i.test(text)) {
    const [, person] = text.match(/^Take care of (.+)\.$/i) || [];
    return practiceSentence(`Look after ${shortPracticePhrase(person || text, 3)}`);
  }
  if (/^Cheer up(?:, .+)?[.!]$/i.test(text)) return "Try to stay positive. It'll be fine.";
  if (/^Take it easy (.+)\.$/i.test(text)) {
    const [, context] = text.match(/^Take it easy (.+)\.$/i) || [];
    return practiceSentence(`Try to relax ${shortPracticePhrase(context || "", 3)}`);
  }
  if (/^Take it easy\.$/i.test(text)) return "Try to relax.";
  if (/^I(?:'m| am) (.+) for you\.$/i.test(text)) {
    const [, feeling] = text.match(/^I(?:'m| am) (.+) for you\.$/i) || [];
    return practiceSentence(`I'm really ${shortPracticePhrase(feeling || text, 3)} for you`);
  }
  if (/^You'?re welcome anytime\.$/i.test(text)) return "Anytime.";
  if (/^No problem\.$/i.test(text)) return "Of course.";
  if (/^See you (.+)\.$/i.test(text)) {
    const [, time] = text.match(/^See you (.+)\.$/i) || [];
    return practiceSentence(`I'll see you ${shortPracticePhrase(time || "soon", 3)}`);
  }
  if (/^Take care\.$/i.test(text)) return "Take care of yourself.";
  if (/^You'?re welcome\b/i.test(text)) return "Of course.";
  if (/^No problem\b/i.test(text)) return "Of course.";
  if (/^Have a (.+)\.$/i.test(text)) {
    const [, wish] = text.match(/^Have a (.+)\.$/i) || [];
    return practiceSentence(`Hope you have a ${shortPracticePhrase(wish || "great day", 4)}`);
  }
  if (/^Take care (.+)\.$/i.test(text)) {
    const [, context] = text.match(/^Take care (.+)\.$/i) || [];
    return practiceSentence(`Be careful ${shortPracticePhrase(context || "", 4)}`);
  }
  if (/^It was great (.+) with you\.$/i.test(text)) {
    const [, activity] = text.match(/^It was great (.+) with you\.$/i) || [];
    return practiceSentence(`It was really nice ${shortPracticePhrase(activity || "", 4)} with you`);
  }
  if (/^(?:Goodbye|Bye)\.$/i.test(text)) return "See you later.";
  if (/^(.+) (is|are) not my cup of tea\.$/i.test(text)) {
    const [, subject] = text.match(/^(.+) (is|are) not my cup of tea\.$/i) || [];
    return practiceSentence(`I'm not really into ${lowerFirstPracticeWord(subject || "that")}`);
  }
  if (/^No problem at all\.$/i.test(text)) return "Don't worry about it.";
  if (/^Take care, (.+)\.$/i.test(text)) {
    const [, person] = text.match(/^Take care, (.+)\.$/i) || [];
    return practiceSentence(`Take care of yourself, ${shortPracticePhrase(person || "", 3)}`);
  }
  if (/^Goodbye, .+\.$/i.test(text)) return "See you soon.";
  if (/^I(?:'m| am) /i.test(text)) return text.replace(/^I am /i, "I'm ");
  if (/^I have /i.test(text)) return text.replace(/^I have /i, "I've got ");
  if (/^I need /i.test(text)) return text.replace(/^I need /i, "I could use ");
  if (/^I love /i.test(text)) return text.replace(/^I love /i, "I really like ");
  if (/^I hate /i.test(text)) return text.replace(/^I hate /i, "I really don't like ");

  return text.includes("?")
    ? practiceQuestion(`Could you tell me ${lowerFirstPracticeWord(stripEnglishFinalPunctuation(text))}`)
    : practiceSentence(`I really ${lowerFirstPracticeWord(stripEnglishFinalPunctuation(text))}`);
}

function backupIdiomaticPracticeVariant(standard: string) {
  const text = withFinalPunctuation(standard, standard);

  if (isBillPracticeRequest(text)) return "Could we settle up, please?";
  if (/^Can you help me\b/i.test(text)) {
    return practiceQuestion(text.replace(/^Can you help me\b/i, "Could you give me a hand"));
  }
  if (/^How about (.+)\?$/i.test(text)) {
    return practiceQuestion(text.replace(/^How about /i, "What do you say to "));
  }
  if (/^I agree with /i.test(text)) return text.replace(/^I agree with /i, "I'm with ");
  if (/^I disagree with /i.test(text)) return text.replace(/^I disagree with /i, "I'm not with ");
  if (/^Let'?s /i.test(text)) return text.replace(/^Let'?s /i, "We should ");
  if (/^I(?:'m| am) allergic to (.+)\.$/i.test(text)) {
    const [, item] = text.match(/^I(?:'m| am) allergic to (.+)\.$/i) || [];
    return practiceSentence(`I can't have ${shortPracticePhrase(item || text, 3)}`);
  }
  if (/^I(?:'m| am) just (.+)\.$/i.test(text)) {
    const [, action] = text.match(/^I(?:'m| am) just (.+)\.$/i) || [];
    return practiceSentence(`I'm just ${shortPracticePhrase(action || text, 4)} for now`);
  }
  if (/^I(?:'m| am) working on (.+)\.$/i.test(text)) {
    const [, project] = text.match(/^I(?:'m| am) working on (.+)\.$/i) || [];
    return practiceSentence(`I'm plugging away at ${shortPracticePhrase(project || text, 4)}`);
  }
  if (/^I(?:'m| am) on a tight (.+)\.$/i.test(text)) return "I'm pressed for time.";
  if (/^I(?:'m| am) looking for (.+)\.$/i.test(text)) {
    const [, thing] = text.match(/^I(?:'m| am) looking for (.+)\.$/i) || [];
    return practiceSentence(`I'm trying to track down ${shortPracticePhrase(thing || text, 5)}`);
  }
  if (/^I(?:'m| am) lost\. Can you help me\?$/i.test(text)) {
    return "I'm a bit lost. Could you point me in the right direction?";
  }
  if (/^I(?:'m| am) sorry to hear that\.$/i.test(text)) return "That's really tough to hear.";
  if (/^I(?:'m| am) (.+) for you\.$/i.test(text)) {
    const [, feeling] = text.match(/^I(?:'m| am) (.+) for you\.$/i) || [];
    return practiceSentence(`I'm so ${shortPracticePhrase(feeling || text, 3)} for you`);
  }
  if (/^I(?:'m| am) very (.+)\.$/i.test(text)) {
    const [, state] = text.match(/^I(?:'m| am) very (.+)\.$/i) || [];
    return practiceSentence(`I'm really ${shortPracticePhrase(state || text, 4)}`);
  }
  if (/^I(?:'m| am) /i.test(text)) return text.replace(/^I am /i, "I'm pretty ").replace(/^I'm /i, "I'm pretty ");
  if (/^That'?s /i.test(text)) return text.replace(/^That'?s /i, "That's pretty ");
  if (/^I need /i.test(text)) return text.replace(/^I need /i, "I could really use ");
  if (/^I have (?:a |an )?(.+?) at (.+)\.$/i.test(text)) {
    const [, event, time] = text.match(/^I have (?:a |an )?(.+?) at (.+)\.$/i) || [];
    return practiceSentence(`I've got ${withPracticeArticle(shortPracticePhrase(event || "", 4))} coming up at ${shortPracticePhrase(time || "", 5)}`);
  }
  if (/^I have (?:a |an )?(.+)\.$/i.test(text)) {
    const [, issue] = text.match(/^I have (?:a |an )?(.+)\.$/i) || [];
    return practiceSentence(`I'm dealing with ${withPracticeArticle(shortPracticePhrase(issue || text, 4))}`);
  }
  if (/^(.+) (is|are) the most (.+)\.$/i.test(text)) {
    const [, subject, be] = text.match(/^(.+) (is|are) the most (.+)\.$/i) || [];
    return practiceSentence(`${capitalizeFirst(subject || "")} ${be} what matters most`);
  }
  if (/^My (.+) (is|are) (.+)\.$/i.test(text)) {
    const [, subject, be, state] = text.match(/^My (.+) (is|are) (.+)\.$/i) || [];
    return practiceSentence(`My ${subject} ${be} pretty ${shortPracticePhrase(state || "", 3)}`);
  }
  if (/^The (.+) (is|are) (.+)\.$/i.test(text)) {
    const [, subject, be, state] = text.match(/^The (.+) (is|are) (.+)\.$/i) || [];
    return practiceSentence(`The ${subject} ${be} pretty ${shortPracticePhrase(state || "", 3)}`);
  }
  if (/^Good (.+)[.!]$/i.test(text)) {
    const [, phrase] = text.match(/^Good (.+)[.!]$/i) || [];
    return practiceSentence(`Great ${shortPracticePhrase(phrase || text, 2)}`);
  }
  if (/^Sounds (.+) to me\.$/i.test(text)) {
    const [, state] = text.match(/^Sounds (.+) to me\.$/i) || [];
    return practiceSentence(`Sounds pretty ${shortPracticePhrase(state || text, 2)} to me`);
  }
  if (/^I'?ll (.+)\.$/i.test(text)) {
    const [, action] = text.match(/^I'?ll (.+)\.$/i) || [];
    return practiceSentence(`I'll be sure to ${shortPracticePhrase(action || text, 5)}`);
  }
  if (/^Tell me about /i.test(text)) return text.replace(/^Tell me about /i, "Fill me in on ");
  if (/^We'?d like the bill\.$/i.test(text)) return "Could we settle up, please?";
  if (/^Safe (.+)!$/i.test(text)) {
    const [, trip] = text.match(/^Safe (.+)!$/i) || [];
    return practiceExclamation(`Have a great ${shortPracticePhrase(trip || "trip", 2)}`);
  }
  if (/^Take care of (.+)\.$/i.test(text)) {
    const [, person] = text.match(/^Take care of (.+)\.$/i) || [];
    return practiceSentence(`Make sure you look after ${shortPracticePhrase(person || text, 3)}`);
  }
  if (/^You'?re welcome anytime\.$/i.test(text)) return "Anytime, really.";
  if (/^You'?re welcome\b/i.test(text)) return "No worries.";
  if (/^No problem\b/i.test(text)) return "No worries.";
  if (/^It'?s not my cup of tea\.$/i.test(text)) return "It's not for me.";
  if (/^(.+) (is|are) not my cup of tea\.$/i.test(text)) {
    const [, subject] = text.match(/^(.+) (is|are) not my cup of tea\.$/i) || [];
    return practiceSentence(`${capitalizeFirst(shortPracticePhrase(subject || "That", 4))} just isn't for me`);
  }
  if (/^Have a (.+)\.$/i.test(text)) {
    const [, wish] = text.match(/^Have a (.+)\.$/i) || [];
    const simpleWish = shortPracticePhrase(wish || "great day", 4).replace(/^(?:nice|good|great|wonderful)\s+/i, "");
    return practiceSentence(`Enjoy your ${simpleWish || "day"}`);
  }
  if (/^Take care (.+)\.$/i.test(text)) return "Stay safe out there.";
  if (/^Take care, (.+)\.$/i.test(text)) return "Stay safe out there.";
  if (/^It was great (.+) with you\.$/i.test(text)) {
    const [, activity] = text.match(/^It was great (.+) with you\.$/i) || [];
    return practiceSentence(`I really enjoyed ${shortPracticePhrase(activity || "", 4)} with you`);
  }
  if (/^(?:Goodbye|Bye)\.$/i.test(text)) return "Take care.";
  if (/^Goodbye, .+\.$/i.test(text)) return "Take care.";
  if (/^See you (.+)\.$/i.test(text)) {
    const [, time] = text.match(/^See you (.+)\.$/i) || [];
    return practiceSentence(`Catch you ${shortPracticePhrase(time || "later", 3)}`);
  }
  if (/^Take care\.$/i.test(text)) return "Take it easy.";
  if (/^I love /i.test(text)) return text.replace(/^I love /i, "I'm really into ");
  if (/^I hate /i.test(text)) return text.replace(/^I hate /i, "I can't stand ");
  if (/^You'?re welcome/i.test(text) || /^No problem/i.test(text)) return "No worries.";

  return text.includes("?")
    ? practiceQuestion(`Any chance you could help with ${shortPracticePhrase(text, 4)}`)
    : practiceSentence(`That's really about ${shortPracticePhrase(text, 4)}`);
}

function backupSimplePracticeVariant(standard: string) {
  const text = withFinalPunctuation(standard, standard);

  if (/^How are you\b/i.test(text)) return "How are you?";
  if (/^Can you help me with (.+)\?$/i.test(text)) {
    const [, topic] = text.match(/^Can you help me with (.+)\?$/i) || [];
    return practiceQuestion(`Help me with ${shortPracticePhrase(topic || "", 3)}`);
  }
  if (/^Can you help me (.+)\?$/i.test(text)) {
    const [, action] = text.match(/^Can you help me (.+)\?$/i) || [];
    return practiceQuestion(`Help me ${shortPracticePhrase(action || "", 4)}`);
  }
  if (isBillPracticeRequest(text)) return "The bill.";
  if (/^Tell me about (.+)\.$/i.test(text)) {
    const [, topic] = text.match(/^Tell me about (.+)\.$/i) || [];
    return practiceQuestion(shortPracticePhrase(topic || text, 3));
  }
  if (/^I need to (.+)\.$/i.test(text)) {
    const [, action] = text.match(/^I need to (.+)\.$/i) || [];
    return practiceSentence(`Need to ${shortPracticePhrase(action || text, 3)}`);
  }
  if (/^My (.+) (is|are) (.+)\.$/i.test(text)) {
    const [, subject, , state] = text.match(/^My (.+) (is|are) (.+)\.$/i) || [];
    const pronoun = practicePronounForSubject(subject || "");
    const verb = pronoun === "They" ? "are" : "is";
    return practiceSentence(`${pronoun} ${verb} ${shortPracticePhrase(state || text, 3)}`);
  }
  if (/^The (.+) (is|are) (.+)\.$/i.test(text)) {
    const [, subject, be, state] = text.match(/^The (.+) (is|are) (.+)\.$/i) || [];
    const pronoun = be?.toLowerCase() === "are" || isPluralPracticeSubject(subject) ? "They" : "It";
    const verb = pronoun === "They" ? "are" : "is";
    return practiceSentence(`${pronoun} ${verb} ${shortPracticePhrase(state || text, 3)}`);
  }
  if (/^We'?d like the bill\.$/i.test(text)) return "The bill.";
  if (/^I(?:'m| am) just (.+)\.$/i.test(text)) {
    const [, action] = text.match(/^I(?:'m| am) just (.+)\.$/i) || [];
    return practiceSentence(`Just ${shortPracticePhrase(action || text, 3)}`);
  }
  if (/^I(?:'m| am) lost\. Can you help me\?$/i.test(text)) return "Lost. Help?";
  if (/^Safe (.+)!$/i.test(text)) return "Travel safe!";
  if (/^I(?:'m| am) working on (.+)\.$/i.test(text)) return "Working on it.";
  if (/^I(?:'m| am) on a tight (.+)\.$/i.test(text)) return "No time.";
  if (/^I(?:'m| am) looking for (.+)\.$/i.test(text)) {
    const [, thing] = text.match(/^I(?:'m| am) looking for (.+)\.$/i) || [];
    return practiceSentence(`Need ${shortPracticePhrase(thing || text, 3)}`);
  }
  if (/^Take care of (.+)\.$/i.test(text)) return "Take care.";
  if (/^I(?:'m| am) sorry to hear that\.$/i.test(text)) return "So sorry.";
  if (/^Cheer up(?:, .+)?[.!]$/i.test(text)) return "Stay positive.";
  if (/^Take it easy\.$/i.test(text)) return "Relax.";
  if (/^Take it easy (.+)\.$/i.test(text)) return "Relax.";
  if (/^I(?:'m| am) (.+) for you\.$/i.test(text)) {
    const [, feeling] = text.match(/^I(?:'m| am) (.+) for you\.$/i) || [];
    return practiceSentence(`${capitalizeFirst(shortPracticePhrase(feeling || text, 2))} for you`);
  }
  if (/^You'?re welcome anytime\.$/i.test(text)) return "You're welcome.";
  if (/^No problem\.$/i.test(text)) return "No problem.";
  if (/^See you (.+)\.$/i.test(text)) return "See you.";
  if (/^Take care\.$/i.test(text)) return "Bye.";
  if (/^You'?re welcome\b/i.test(text)) return "Anytime.";
  if (/^No problem\b/i.test(text)) return "No problem.";
  if (/^It'?s not my cup of tea\.$/i.test(text)) return "Not for me.";
  if (/^(.+) (is|are) not my cup of tea\.$/i.test(text)) {
    const [, subject] = text.match(/^(.+) (is|are) not my cup of tea\.$/i) || [];
    return practiceSentence(`Not into ${shortPracticePhrase(subject || "that", 3)}`);
  }
  if (/^Have a (.+)\.$/i.test(text)) {
    const [, wish] = text.match(/^Have a (.+)\.$/i) || [];
    return practiceSentence(capitalizeFirst(shortPracticePhrase(wish || "nice day", 2)));
  }
  if (/^Take care (.+)\.$/i.test(text)) return "Be careful.";
  if (/^Take care, .+\.$/i.test(text)) return "Take care.";
  if (/^(?:Goodbye|Bye)\.$/i.test(text)) return "Bye.";
  if (/^Goodbye, .+\.$/i.test(text)) return "Bye.";
  if (/^How about (.+)\?$/i.test(text)) {
    const [, phrase] = text.match(/^How about (.+)\?$/i) || [];
    return practiceQuestion(shortPracticePhrase(phrase || text, 3));
  }
  if (/^I agree\b/i.test(text)) return "I agree.";
  if (/^I disagree\b/i.test(text)) return "I don't agree.";
  if (/^Let'?s (.+)\.$/i.test(text)) {
    const [, phrase] = text.match(/^Let'?s (.+)\.$/i) || [];
    return practiceSentence(shortPracticePhrase(phrase || text, 3));
  }
  if (/^(?:Check|Bill|The check|The bill)\b/i.test(text)) return "The bill.";
  if (/^I'?d like (.+)\.$/i.test(text)) {
    const [, phrase] = text.match(/^I'?d like (.+)\.$/i) || [];
    return practiceSentence(shortPracticePhrase(phrase || text, 3));
  }
  if (/^That'?s (?:a |an )?(.+)\.$/i.test(text)) {
    const [, phrase] = text.match(/^That'?s (?:a |an )?(.+)\.$/i) || [];
    return practiceSentence(capitalizeFirst(shortPracticePhrase(phrase || text, 3)));
  }
  if (/^I(?:'m| am) allergic to (.+)\.$/i.test(text)) {
    const [, item] = text.match(/^I(?:'m| am) allergic to (.+)\.$/i) || [];
    return practiceSentence(`Allergic to ${shortPracticePhrase(item || text, 3)}`);
  }
  if (/^I(?:'m| am) ([A-Za-z ]+) about /i.test(text)) {
    const [, feeling] = text.match(/^I(?:'m| am) ([A-Za-z ]+) about /i) || [];
    return practiceSentence(`I'm ${cleanGeneratedSentence(feeling)}`);
  }
  if (/^I(?:'m| am) (full|thirsty|hungry|tired|lost|sick|ready)\b/i.test(text)) {
    const [, state] = text.match(/^I(?:'m| am) ([A-Za-z]+)/i) || [];
    return practiceSentence(capitalizeFirst(state || "ready"));
  }
  if (/^I have (?:a |an )?(.+)\.$/i.test(text)) {
    const [, thing] = text.match(/^I have (?:a |an )?(.+)\.$/i) || [];
    return practiceSentence(capitalizeFirst(shortPracticePhrase(thing || text, 3)));
  }
  if (/^I(?:'m| am) working on (.+)\.$/i.test(text)) {
    const [, project] = text.match(/^I(?:'m| am) working on (.+)\.$/i) || [];
    return practiceSentence(`Working on ${shortPracticePhrase(project || text, 3)}`);
  }
  if (/^I(?:'m| am) on a tight (.+)\.$/i.test(text)) {
    const [, thing] = text.match(/^I(?:'m| am) on a tight (.+)\.$/i) || [];
    return practiceSentence(`Tight ${shortPracticePhrase(thing || text, 2)}`);
  }
  if (/^Good (.+)[.!]$/i.test(text)) {
    return practiceExclamation("Nice");
  }
  if (/^I(?:'m| am) looking for (.+)\.$/i.test(text)) {
    const [, thing] = text.match(/^I(?:'m| am) looking for (.+)\.$/i) || [];
    return practiceSentence(`Need ${shortPracticePhrase(thing || text, 3)}`);
  }
  if (/^I don'?t feel (.+)\.$/i.test(text)) {
    const [, state] = text.match(/^I don'?t feel (.+)\.$/i) || [];
    return practiceSentence(`Not feeling ${shortPracticePhrase(state || text, 2)}`);
  }
  if (/^You look (.+)\.$/i.test(text)) {
    const [, state] = text.match(/^You look (.+)\.$/i) || [];
    return practiceQuestion(capitalizeFirst(shortPracticePhrase(state || text, 2)));
  }
  if (/^I(?:'m| am) (.+) for you\.$/i.test(text)) {
    const [, feeling] = text.match(/^I(?:'m| am) (.+) for you\.$/i) || [];
    return practiceSentence(`${capitalizeFirst(shortPracticePhrase(feeling || text, 2))} for you`);
  }
  if (/^(.+) is the most .+\.$/i.test(text)) {
    const [, subject] = text.match(/^(.+) is the most .+\.$/i) || [];
    return practiceSentence(shortPracticePhrase(subject || text, 3));
  }
  if (/^Sounds (.+) to me\.$/i.test(text)) {
    const [, state] = text.match(/^Sounds (.+) to me\.$/i) || [];
    return practiceSentence(`Sounds ${shortPracticePhrase(state || text, 2)}`);
  }
  if (/^I love (.+)\.$/i.test(text)) {
    const [, thing] = text.match(/^I love (.+)\.$/i) || [];
    return practiceSentence(`Love ${shortPracticePhrase(thing || text, 3)}`);
  }
  if (/^I hate (.+)\.$/i.test(text)) {
    const [, thing] = text.match(/^I hate (.+)\.$/i) || [];
    return practiceSentence(`Don't like ${shortPracticePhrase(thing || text, 3)}`);
  }
  if (/^I really appreciate (.+)\.$/i.test(text)) {
    const [, thing] = text.match(/^I really appreciate (.+)\.$/i) || [];
    return practiceSentence(`Thanks for ${shortPracticePhrase(thing || text, 3)}`);
  }
  if (/^It was great (.+) with you\.$/i.test(text)) {
    const [, activity] = text.match(/^It was great (.+) with you\.$/i) || [];
    return practiceSentence(`Great ${shortPracticePhrase(activity || text, 3)}`);
  }
  if (/^I'?ll (.+)\.$/i.test(text)) {
    const [, action] = text.match(/^I'?ll (.+)\.$/i) || [];
    return practiceSentence(capitalizeFirst(shortPracticePhrase(action || text, 4)));
  }
  if (/^I(?:'m| am) (.+)\.$/i.test(text)) {
    const [, state] = text.match(/^I(?:'m| am) (.+)\.$/i) || [];
    return practiceSentence(capitalizeFirst(shortPracticePhrase(state || text, 3)));
  }
  if (/^I .+\.$/i.test(text)) return practiceSentence(shortPracticePhrase(text, 4));
  if (/^You .+\.$/i.test(text)) return practiceSentence(shortPracticePhrase(text, 4));
  if (/^What .+\?$/i.test(text)) return "What?";
  if (/^Where .+\?$/i.test(text)) return "Where?";
  if (/^How .+\?$/i.test(text)) return "How?";
  if (/^Can .+\?$/i.test(text)) return "Can I?";
  if (/^Do .+\?$/i.test(text)) return "Do you?";

  return text.includes("?")
    ? practiceQuestion(shortPracticePhrase(text, 3))
    : practiceSentence(shortPracticePhrase(text, 4));
}

function firstDistinctPracticeCandidate(candidates: string[], used: Set<string>) {
  for (const candidate of candidates) {
    const normalized = comparablePracticeVariant(candidate);
    if (candidate && normalized && !used.has(normalized) && !isWeakPracticeCandidate(candidate)) {
      used.add(normalized);
      return candidate;
    }
  }

  const fallback =
    candidates.find((candidate) => candidate && !isWeakPracticeCandidate(candidate)) ||
    candidates.find(Boolean) ||
    "Say it simply.";
  used.add(comparablePracticeVariant(fallback));
  return fallback;
}

function ensurePracticeVariantFieldsDistinct(
  variants: {
    standard: string;
    natural: string;
    idiomatic: string;
    simple: string;
  },
  fallbackSource: string
) {
  const standard = variants.standard || withFinalPunctuation(fallbackSource, fallbackSource);
  const used = new Set([comparablePracticeVariant(standard)]);
  const natural = firstDistinctPracticeCandidate(
    [variants.natural, backupNaturalPracticeVariant(standard)],
    used
  );
  const idiomatic = firstDistinctPracticeCandidate(
    [variants.idiomatic, backupIdiomaticPracticeVariant(standard)],
    used
  );
  const simple = firstDistinctPracticeCandidate(
    [backupSimplePracticeVariant(standard), variants.simple],
    used
  );

  return {
    standard,
    natural,
    idiomatic,
    simple,
  };
}

function normalizeSentencePatternPracticeVariants(
  practice: SentencePatternPractice
): SentencePatternPractice {
  const fallbackSource = practice.recommended || practice.targetEnglish;
  const normalized = ensurePracticeVariantFieldsDistinct(
    normalizeExpressionVariantMap(
      {
        idiomatic: practice.idiomatic,
        natural: practice.natural,
        simple: practice.simple,
        standard: practice.recommended,
      },
      fallbackSource
    ),
    fallbackSource
  );

  return {
    ...practice,
    chinese: normalizeChinesePracticePrompt(
      practice.chinese,
      normalized.standard || practice.targetEnglish
    ),
    idiomatic: normalized.idiomatic,
    natural: normalized.natural,
    recommended: normalized.standard,
    simple: normalized.simple,
    targetEnglish: normalized.standard || practice.targetEnglish,
  };
}

function normalizeExistingPracticeCourse(
  practices: SentencePatternPractice[],
  levelId: SentencePatternLevelId,
  patternId: number
) {
  return practices.map((practice, index) => {
    const fallbackScene = sentencePatternSceneSeeds[index % sentencePatternSceneSeeds.length];

    return normalizeSentencePatternPracticeVariants({
      ...practice,
      sceneKey:
        practice.sceneKey ||
        `manual-existing-${index + 1}-${levelId}-${patternId}-${index + 1}`,
      theme: practice.theme || fallbackScene.category,
    });
  });
}

function createPracticeFromDraft(
  draft: BasicPracticeDraft,
  id: number
): SentencePatternPractice {
  const recommended = withFinalPunctuation(draft.targetEnglish, draft.targetEnglish);
  const simple = createSimplePracticeVariant(recommended);
  const natural = createNaturalPracticeVariant(recommended);
  const idiomatic = createIdiomaticPracticeVariant(recommended, natural);

  return normalizeSentencePatternPracticeVariants({
    chinese: draft.chinese,
    id,
    idiomatic,
    natural,
    recommended,
    sceneKey: draft.sceneKey,
    simple,
    targetEnglish: recommended,
    theme: draft.theme,
  });
}

function createPracticeFromExample(
  example: SentencePatternPracticeExample,
  id: number
) {
  return createPracticeFromDraft(
    {
      chinese: example.chinese,
      sceneKey: example.sceneKey,
      targetEnglish: example.targetEnglish,
      theme: example.theme,
    },
    id
  );
}

function createPracticeCourseFromExamples(
  examples: SentencePatternPracticeExample[]
) {
  return examples.map((example, index) =>
    createPracticeFromExample(example, index + 1)
  );
}

function getConfiguredPatternExamples(
  levelId: SentencePatternLevelId,
  pattern: SentencePattern
) {
  const examples =
    pattern.examples || sentencePatternManualExamples[levelId]?.[pattern.id] || [];

  return examples.length >= MIN_MANUAL_EXAMPLES_PER_PATTERN ? examples : [];
}

function renderBasicPracticeDraft(
  patternId: number,
  topic: BasicPracticeTopic
): BasicPracticeDraft {
  switch (patternId) {
    case 2:
      return makeDraft(`我想${topic.zhAction}。`, `I’d like to ${topic.action}.`);
    case 3:
      return makeDraft(
        `我必须${topic.zhAction}，因为${topic.zhReason}。`,
        `I have to ${topic.action} because ${topic.reason}.`
      );
    case 4:
      return makeDraft(`你能帮我${topic.zhAction}吗？`, `Can you help me ${topic.action}?`);
    case 5:
      return makeDraft(`我正在找${topic.zhNoun}。`, `I’m looking for ${topic.noun}.`);
    case 6:
      return makeDraft(`如果${topic.zhClause}，那就太好了。`, `It would be great if ${topic.clause}.`);
    case 7:
      return makeDraft(`我需要的只是${topic.zhNoun}。`, `All I need is ${topic.noun}.`);
    case 8:
      return makeDraft(`我真的想${topic.zhAction}。`, `I really want to ${topic.action}.`);
    case 9:
      return makeDraft(`你能帮我${topic.zhAction}吗？`, `Could you ${topic.action} for me?`);
    case 10:
      return makeDraft(`我期待${topic.zhClause}。`, `I expect ${topic.clause}.`);
    case 11:
      return makeDraft(`我想说的是，${topic.zhClause}。`, `What I’m trying to say is ${topic.clause}.`);
    case 12:
      return makeDraft(`我希望${topic.zhClause}。`, `I hope ${topic.clause}.`);
    case 13:
      return makeDraft(`我真希望我能${topic.zhAction}。`, `I wish I could ${topic.action}.`);
    case 14:
      return makeDraft(`我特别想要${topic.zhNoun}。`, `I’m dying for ${topic.noun}.`);
    case 15:
      return makeDraft(
        `对我来说最重要的是${topic.zhClause}。`,
        `The most important thing for me is that ${topic.clause}.`
      );
    case 16:
      return makeDraft(`在我看来，${topic.zhClause}。`, `In my opinion, ${topic.clause}.`);
    case 17:
      return makeDraft(`我认为${topic.zhClause}。`, `I think ${topic.clause}.`);
    case 18:
      return makeDraft(`从我的角度看，${topic.zhClause}。`, `From my point of view, ${topic.clause}.`);
    case 19:
      return makeDraft(`在我看来，${topic.zhClause}。`, `It seems to me that ${topic.clause}.`);
    case 20:
      return makeDraft(`我感觉${topic.zhClause}。`, `I feel like ${topic.clause}.`);
    case 21:
      return makeDraft(`据我所知，${topic.zhClause}。`, `As far as I know, ${topic.clause}.`);
    case 22:
      return makeDraft(
        `${topic.zhProblem}的原因是${topic.zhReason}。`,
        `The reason why ${topic.problem} is that ${topic.reason}.`
      );
    case 23:
      return makeDraft(`我的意思是，${topic.zhClause}。`, `What I mean is ${topic.clause}.`);
    case 24:
      return makeDraft(`我不确定是否${topic.zhClause}。`, `I’m not sure if ${topic.clause}.`);
    case 25:
      return makeDraft(`老实说，${topic.zhClause}。`, `To be honest, ${topic.clause}.`);
    case 26:
      return makeDraft(
        `就我个人而言，比起${topic.zhOptionB}，我更喜欢${topic.zhOptionA}。`,
        `Personally, I prefer ${topic.optionA} to ${topic.optionB}.`
      );
    case 27:
      return makeDraft(`这取决于${topic.zhNoun}。`, `It depends on ${topic.noun}.`);
    case 28:
      return makeDraft(`我怀疑是否${topic.zhClause}。`, `I doubt whether ${topic.clause}.`);
    case 29:
      return makeDraft(`事实上，${topic.zhClause}。`, `In fact, ${topic.clause}.`);
    case 30:
      return makeDraft(`我的想法是，${topic.zhClause}。`, `My idea is that ${topic.clause}.`);
    case 31:
      return makeDraft(`我对${topic.zhNoun}感到${topic.zhEmotion}。`, `I’m ${topic.emotion} about ${topic.noun}.`);
    case 32:
      return makeDraft(`当${topic.zhWhenClause}，我会感到${topic.zhEmotion}。`, `I feel ${topic.emotion} when ${topic.whenClause}.`);
    case 33:
      return makeDraft(`去${topic.zhAction}让我感到${topic.zhEmotion}。`, `It makes me ${topic.emotion} to ${topic.action}.`);
    case 34:
      return makeDraft(`我担心${topic.zhNoun}。`, `I’m worried about ${topic.noun}.`);
    case 35:
      return makeDraft(`我受不了${topic.zhGerund}。`, `I can’t stand ${topic.gerund}.`);
    case 36:
      return makeDraft(`我很兴奋，因为${topic.zhClause}。`, `I’m excited that ${topic.clause}.`);
    case 37:
      return makeDraft(
        `${topic.zhDifficultNoun}是我经历过的最有挑战的事情。`,
        `This is the most challenging ${topic.difficultNoun} I’ve ever dealt with.`
      );
    case 38:
      return makeDraft(`很抱歉${topic.zhApologyAction}。`, `I’m sorry to ${topic.apologyAction}.`);
    case 39:
      return makeDraft(`我为你感到高兴，因为你可以${topic.zhAction}。`, `I’m happy for you that you can ${topic.action}.`);
    case 40:
      return makeDraft(`对我来说，${topic.zhAction}很难。`, `It’s hard for me to ${topic.action}.`);
    case 41:
      return makeDraft(`我厌倦了${topic.zhGerund}。`, `I’m tired of ${topic.gerund}.`);
    case 42:
      return makeDraft(`当你帮我${topic.zhAction}时，我很感激。`, `I appreciate it when you help me ${topic.action}.`);
    case 43:
      return makeDraft(`那真的让我感到${topic.zhEmotion}。`, `That really makes me feel ${topic.emotion}.`);
    case 44:
      return makeDraft(`我受够了${topic.zhDifficultNoun}。`, `I’m fed up with ${topic.difficultNoun}.`);
    case 45:
      return makeDraft(`我的感受是我很${topic.zhEmotion}。`, `How I feel is that I’m ${topic.emotion}.`);
    case 46:
      return makeDraft(`我以前${topic.zhPastParticiple}。`, `I have ${topic.pastParticiple} before.`);
    case 47:
      return makeDraft(`上次我${topic.zhPastSimple}，我明白了${topic.zhResult}。`, `Last time I ${topic.pastSimple}, I learned that ${topic.result}.`);
    case 48:
      return makeDraft(`当我是${topic.zhTimePoint}时，${topic.zhPastSimple}。`, `When I was ${topic.timePoint}, I ${topic.pastSimple}.`);
    case 49:
      return makeDraft(`我记得${topic.zhGerund}。`, `I remember ${topic.gerund}.`);
    case 50:
      return makeDraft(`那是我第一次${topic.zhPastParticiple}。`, `It was the first time that I had ${topic.pastParticiple}.`);
    case 51:
      return makeDraft(`我过去常常${topic.zhGerund}。`, `I used to ${topic.action}.`);
    case 52:
      return makeDraft(`我刚刚${topic.zhPastParticiple}。`, `I’ve just ${topic.pastParticiple}.`);
    case 53:
      return makeDraft(`发生的事情是${topic.zhProblem}。`, `What happened was ${topic.problem}.`);
    case 54:
      return makeDraft(`我经历过${topic.zhDifficultNoun}。`, `I went through ${topic.difficultNoun}.`);
    case 55:
      return makeDraft(`那时候，我${topic.zhPastSimple}。`, `Back then, I ${topic.pastSimple}.`);
    case 56:
      return makeDraft(`我以前从来没有${topic.zhPastParticiple}。`, `I’ve never ${topic.pastParticiple} before.`);
    case 57:
      return makeDraft(`在${topic.zhGerund}之后，我明白了${topic.zhResult}。`, `After ${topic.gerund}, I learned that ${topic.result}.`);
    case 58:
      return makeDraft(`那让我想起了${topic.zhNoun}。`, `That reminds me of ${topic.noun}.`);
    case 59:
      return makeDraft(`我在${topic.zhGerund}这件事上很吃力。`, `I had a hard time ${topic.gerund}.`);
    case 60:
      return makeDraft(`我做过的最好的事之一是${topic.zhGerund}。`, `One of the best things I’ve done is ${topic.gerund}.`);
    case 61:
      return makeDraft(`我打算${topic.zhAction}。`, `I’m going to ${topic.action}.`);
    case 62:
      return makeDraft(`我计划这周${topic.zhAction}。`, `I plan to ${topic.action} this week.`);
    case 63:
      return makeDraft(`下次，我会${topic.zhAction}。`, `Next time, I will ${topic.action}.`);
    case 64:
      return makeDraft(`我正在考虑${topic.zhGerund}。`, `I’m thinking of ${topic.gerund}.`);
    case 65:
      return makeDraft(`我们应该${topic.zhAction}，因为${topic.zhReason}。`, `We should ${topic.action} because ${topic.reason}.`);
    case 66:
      return makeDraft(`如果我有时间，我会${topic.zhAction}。`, `If I have time, I will ${topic.action}.`);
    case 67:
      return makeDraft(`我马上要${topic.zhAction}。`, `I’m about to ${topic.action}.`);
    case 68:
      return makeDraft(`我们一起${topic.zhAction}吧。`, `Let’s ${topic.action} together.`);
    case 69:
      return makeDraft(`我希望很快${topic.zhAction}。`, `I hope to ${topic.action} soon.`);
    case 70:
      return makeDraft(`未来，我想${topic.zhAction}。`, `In the future, I want to ${topic.action}.`);
    case 71:
      return makeDraft(`我期待${topic.zhGerund}。`, `I’m looking forward to ${topic.gerund}.`);
    case 72:
      return makeDraft(`我们${topic.zhAction}怎么样？`, `How about we ${topic.action}?`);
    case 73:
      return makeDraft(`我会尽最大努力${topic.zhAction}。`, `I’ll try my best to ${topic.action}.`);
    case 74:
      return makeDraft(`一旦${topic.zhWhenClause}，我就会${topic.zhAction}。`, `As soon as ${topic.whenClause}, I will ${topic.action}.`);
    case 75:
      return makeDraft(`我的目标是${topic.zhAction}。`, `My goal is to ${topic.action}.`);
    case 76:
      return makeDraft(`问题是${topic.zhProblem}。`, `The problem is that ${topic.problem}.`);
    case 77:
      return makeDraft(`你为什么不${topic.zhAction}呢？`, `Why don’t you ${topic.action}?`);
    case 78:
      return makeDraft(`你应该${topic.zhAction}。`, `You should ${topic.action}.`);
    case 79:
      return makeDraft(`因为${topic.zhReason}，${topic.zhResult}。`, `Because ${topic.reason}, ${topic.result}.`);
    case 80:
      return makeDraft(`我怎样才能${topic.zhAction}？`, `How can I ${topic.action}?`);
    case 81:
      return makeDraft(`如果${topic.zhProblem}怎么办？`, `What if ${topic.problem}?`);
    case 82:
      return makeDraft(`我建议你${topic.zhAction}。`, `I suggest that you ${topic.action}.`);
    case 83:
      return makeDraft(`${topic.zhNoun}出了点问题。`, `There is something wrong with ${topic.noun}.`);
    case 84:
      return makeDraft(`主要原因是${topic.zhReason}。`, `The main reason is ${topic.reason}.`);
    case 85:
      return makeDraft(`你最好${topic.zhAction}。`, `You’d better ${topic.action}.`);
    case 86:
      return makeDraft(`有没有办法${topic.zhAction}？`, `Is there any way to ${topic.action}?`);
    case 87:
      return makeDraft(`我不知道怎样才能${topic.zhAction}。`, `I have no idea how I can ${topic.action}.`);
    case 88:
      return makeDraft(`让我解释为什么${topic.zhProblem}。`, `Let me explain why ${topic.problem}.`);
    case 89:
      return makeDraft(`${topic.zhAction}很重要。`, `It’s important to ${topic.action}.`);
    case 90:
      return makeDraft(`你怎么处理${topic.zhDifficultNoun}？`, `How do you deal with ${topic.difficultNoun}?`);
    case 91:
      return makeDraft(`${topic.zhOptionA}比${topic.zhOptionB}更好。`, `It’s better than ${topic.optionB}.`);
    case 92:
      return makeDraft(`我完全同意${topic.zhClause}。`, `I totally agree that ${topic.clause}.`);
    case 93:
      return makeDraft(`我不认为${topic.zhOptionB}有帮助。`, `I don’t think ${topic.optionB} helps.`);
    case 94:
      return makeDraft(
        `和${topic.zhOptionB}相比，${topic.zhOptionA}更适合我。`,
        `Compared to ${topic.optionB}, ${topic.optionA} works better for me.`
      );
    case 95:
      return makeDraft(
        `${topic.zhOptionA}和${topic.zhOptionB}都不能单独解决问题。`,
        `Neither ${topic.optionA} nor ${topic.optionB} can solve the problem alone.`
      );
    case 96:
      return makeDraft(
        `${topic.zhGerund}不仅有帮助，还${topic.zhBenefit}。`,
        `Not only does ${topic.gerund} help, but it also ${topic.benefit}.`
      );
    case 97:
      return makeDraft(
        `${topic.zhMoreFirst}，${topic.zhMoreSecond}。`,
        `The more ${topic.moreFirst}, the more ${topic.moreSecond}.`
      );
    case 98:
      return makeDraft(`很高兴和你一起${topic.zhGerund}。`, `It was nice ${topic.gerund} with you.`);
    case 99:
      return makeDraft(`我们通过${topic.zhMethod}保持联系吧。`, `Let’s keep in touch by ${topic.method}.`);
    case 100:
      return makeDraft(
        `谢谢你${topic.zhGerund}，这真的${topic.zhBenefit}。`,
        `Thank you for ${topic.gerund}, it really ${topic.benefit}.`
      );
    default:
      return makeDraft(`请表达：${topic.zhClause}。`, topic.simple);
  }
}

function createBasicPracticeCourse(patternId: number): SentencePatternPractice[] {
  return selectPracticeTopicsForPattern("basic", patternId).map((topic, index) => {
    const draft = renderBasicPracticeDraft(patternId, topic);
    draft.sceneKey = topic.sceneKey;
    draft.theme = topic.theme;
    return createPracticeFromDraft(draft, index + 1);
  });
}

const basicSectionsWithPracticeCourses: SentencePatternSection[] = basicSections.map((section) => ({
  ...section,
  patterns: section.patterns.map((pattern) => ({
    ...pattern,
    practices:
      pattern.practices?.length && pattern.practices.length >= MIN_MANUAL_EXAMPLES_PER_PATTERN
        ? normalizeExistingPracticeCourse(pattern.practices, "basic", pattern.id)
        : getConfiguredPatternExamples("basic", pattern).length
          ? createPracticeCourseFromExamples(getConfiguredPatternExamples("basic", pattern))
        : createBasicPracticeCourse(pattern.id),
  })),
}));

const intermediateSections: SentencePatternSection[] = confidentExpressionSections;

function withoutFirstPerson(value: string) {
  return value.replace(/^I /, "");
}

function renderIntermediatePracticeDraft(
  patternId: number,
  topic: BasicPracticeTopic
): BasicPracticeDraft {
  switch (patternId) {
    case 1:
      return makeDraft(createChineseLookingForPrompt(topic.zhNoun), `What I’m really looking for is ${topic.noun}.`);
    case 2:
      return makeDraft(`如果不太麻烦，你能帮我${topic.zhAction}吗？`, `If it’s not too much trouble, could you ${topic.action}?`);
    case 3:
      return makeDraft(`如果你能帮我${topic.zhAction}，我会很感激。`, `I would appreciate it if you could help me ${topic.action}.`);
    case 4:
      return makeDraft(`我想问一下，你能不能${topic.zhAction}。`, `I was wondering if you could ${topic.action}.`);
    case 5:
      return makeDraft(`我唯一请求的是我们能${topic.zhAction}。`, `All I ask is that we ${topic.action}.`);
    case 6:
      return makeDraft(`如果你能帮我${topic.zhAction}，这对我意义很大。`, `It would mean a lot to me if you could help me ${topic.action}.`);
    case 7:
      return makeDraft(`我需要一些能帮助我${topic.zhAction}的东西。`, `I need something that helps me ${topic.action}.`);
    case 8:
      return makeDraft(`你是否有可能帮我${topic.zhAction}？`, `Would it be possible for you to help me ${topic.action}?`);
    case 9:
      return makeDraft(`我希望${topic.zhClause}。`, `I’m hoping that ${topic.clause}.`);
    case 10:
      return makeDraft(`唯一缺少的是${topic.zhNoun}。`, `The only thing missing is ${topic.noun}.`);
    case 11:
      return makeDraft(`如果你愿意帮我${topic.zhAction}，我会很感激。`, `I’d be grateful if you would help me ${topic.action}.`);
    case 12:
      return makeDraft(`我对此的期待是${topic.zhResult}。`, `What I expect from this is that ${topic.result}.`);
    case 13:
      return makeDraft(`如果你有时间，请帮我${topic.zhAction}。`, `Should you have time, please help me ${topic.action}.`);
    case 14:
      return makeDraft(`我需要一些可以帮助我${topic.zhAction}的东西。`, `I’m in need of something which can help me ${topic.action}.`);
    case 15:
      return makeDraft(`如果没有你的支持，我就没办法${topic.zhAction}。`, `Had it not been for your support, I wouldn’t have been able to ${topic.action}.`);
    case 16:
      return makeDraft(`从我的立场来看，似乎${topic.zhClause}。`, `From where I stand, it seems that ${topic.clause}.`);
    case 17:
      return makeDraft(`我确信${topic.zhClause}。`, `I’m convinced that ${topic.clause}.`);
    case 18:
      return makeDraft(`${topic.zhGerund}不仅重要，而且${topic.zhBenefit}。`, `Not only is ${topic.gerund} important, but it also ${topic.benefit}.`);
    case 19:
      return makeDraft(`如果我是你，我会${topic.zhAction}。`, `Were I in your position, I would ${topic.action}.`);
    case 20:
      return makeDraft(`在我看来，${topic.zhClause}。`, `The way I see it, ${topic.clause}.`);
    case 21:
      return makeDraft(`值得注意的是，${topic.zhClause}。`, `It’s worth noting that ${topic.clause}.`);
    case 22:
      return makeDraft(`我忍不住觉得${topic.zhClause}。`, `I can’t help but think that ${topic.clause}.`);
    case 23:
      return makeDraft(`如果我早意识到${topic.zhProblem}，我本可以更早${topic.zhAction}。`, `Had I realized ${topic.problem}, I would have tried to ${topic.action} sooner.`);
    case 24:
      return makeDraft(`换句话说，${topic.zhClause}。`, `To put it another way, ${topic.clause}.`);
    case 25:
      return makeDraft(`我毫不怀疑${topic.zhClause}。`, `There’s no doubt in my mind that ${topic.clause}.`);
    case 26:
      return makeDraft(`一方面，${topic.zhOptionA}有帮助；另一方面，${topic.zhOptionB}会造成问题。`, `On the one hand, ${topic.optionA} helps; on the other hand, ${topic.optionB} creates problems.`);
    case 27:
      return makeDraft(`我突然觉得${topic.zhClause}。`, `It strikes me that ${topic.clause}.`);
    case 28:
      return makeDraft(`如果出现这种情况，我会${topic.zhAction}。`, `Should the situation arise, I will ${topic.action}.`);
    case 29:
      return makeDraft(`我的看法是${topic.zhClause}。`, `I’m of the opinion that ${topic.clause}.`);
    case 30:
      return makeDraft(`我最担心的是${topic.zhProblem}。`, `What concerns me most is that ${topic.problem}.`);
    case 31:
      return makeDraft(`当${topic.zhWhenClause}，我发现${topic.zhAction}很有挑战。`, `I find it challenging to ${topic.action} when ${topic.whenClause}.`);
    case 32:
      return makeDraft(`想到${topic.zhProblem}，我很难过。`, `It breaks my heart that ${topic.problem}.`);
    case 33:
      return makeDraft(`我从未像${topic.zhWhenClause}时那样感到如此${topic.zhEmotion}。`, `Never have I felt so ${topic.emotion} as when ${topic.whenClause}.`);
    case 34:
      return makeDraft(`${topic.zhMoreFirst}，${topic.zhMoreSecond}。`, `The more I ${withoutFirstPerson(topic.moreFirst)}, the more ${topic.moreSecond}.`);
    case 35:
      return makeDraft(`我在${topic.zhOptionA}和${topic.zhOptionB}之间很纠结。`, `I’m torn between ${topic.optionA} and ${topic.optionB}.`);
    case 36:
      return makeDraft(`经历过${topic.zhDifficultNoun}后，我现在意识到${topic.zhClause}。`, `Having gone through ${topic.difficultNoun}, I now realize that ${topic.clause}.`);
    case 37:
      return makeDraft(`我不明白为什么${topic.zhProblem}。`, `It’s beyond me why ${topic.problem}.`);
    case 38:
      return makeDraft(`你帮我${topic.zhAction}，我真的感激不尽。`, `I can’t thank you enough for helping me ${topic.action}.`);
    case 39:
      return makeDraft(`如果不是因为你的支持，我就无法${topic.zhAction}。`, `Were it not for your support, I couldn’t ${topic.action}.`);
    case 40:
      return makeDraft(`这让我感到${topic.zhEmotion}，因为${topic.zhProblem}。`, `This has left me feeling ${topic.emotion} that ${topic.problem}.`);
    case 41:
      return makeDraft(`我已经接受了${topic.zhDifficultNoun}。`, `I’ve come to terms with ${topic.difficultNoun}.`);
    case 42:
      return makeDraft(`最让我惊讶的是${topic.zhClause}。`, `What surprises me most is that ${topic.clause}.`);
    case 43:
      return makeDraft(`我被${topic.zhDifficultNoun}压得喘不过气。`, `I’m overwhelmed by ${topic.difficultNoun}.`);
    case 44:
      return makeDraft(`我当时完全不知道${topic.zhClause}。`, `Little did I know that ${topic.clause}.`);
    case 45:
      return makeDraft(`我突然想到${topic.zhClause}。`, `It occurred to me that ${topic.clause}.`);
    case 46:
      return makeDraft(`到${topic.zhWhenClause}的时候，我已经${topic.zhPastParticiple}。`, `By the time ${topic.whenClause}, I had already ${topic.pastParticiple}.`);
    case 47:
      return makeDraft(`要是我早一点${topic.zhPastParticiple}就好了。`, `If only I had ${topic.pastParticiple} earlier.`);
    case 48:
      return makeDraft(`那就是我意识到${topic.zhClause}的时刻。`, `That was the moment when I realized ${topic.clause}.`);
    case 49:
      return makeDraft(`经历过${topic.zhDifficultNoun}之后，我${topic.zhPastSimple}。`, `Having been through ${topic.difficultNoun}, I ${topic.pastSimple}.`);
    case 50:
      return makeDraft(`我刚${topic.zhPastParticiple}，就意识到${topic.zhProblem}。`, `No sooner had I ${topic.pastParticiple} than I realized ${topic.problem}.`);
    case 51:
      return makeDraft(`我仍然记得${topic.zhClause}。`, `I still remember how ${topic.clause}.`);
    case 52:
      return makeDraft(`回头看${topic.zhDifficultNoun}，我${topic.zhPastSimple}。`, `Looking back on ${topic.difficultNoun}, I ${topic.pastSimple}.`);
    case 53:
      return makeDraft(`直到${topic.zhWhenClause}，我才意识到${topic.zhClause}。`, `It wasn’t until ${topic.whenClause} that I realized ${topic.clause}.`);
    case 54:
      return makeDraft(`我真希望自己没有等这么久才${topic.zhAction}。`, `I wish I hadn’t waited so long to ${topic.action}.`);
    case 55:
      return makeDraft(`我很少遇到像${topic.zhDifficultNoun}这样的事。`, `Rarely have I faced such a difficult situation as ${topic.difficultNoun}.`);
    case 56:
      return makeDraft(`我经历的是${topic.zhDifficultNoun}。`, `What I went through was ${topic.difficultNoun}.`);
    case 57:
      return makeDraft(`经历了这一切之后，我意识到${topic.zhClause}。`, `After all that had happened, I realized that ${topic.clause}.`);
    case 58:
      return makeDraft(`我过去以为${topic.zhOptionB}更好，但现在我觉得${topic.zhOptionA}更好。`, `I used to think ${topic.optionB} was better, but now I believe ${topic.optionA} works better.`);
    case 59:
      return makeDraft(`这段经历让我明白${topic.zhClause}。`, `The experience taught me that ${topic.clause}.`);
    case 60:
      return makeDraft(`如果不是那样，我就不会意识到${topic.zhClause}。`, `Had it not been for that, I wouldn’t have realized that ${topic.clause}.`);
    case 61:
      return makeDraft(`只要${topic.zhClause}，我就会${topic.zhAction}。`, `Provided that ${topic.clause}, I will ${topic.action}.`);
    case 62:
      return makeDraft(`我计划${topic.zhGerund}，除非${topic.zhProblem}。`, `I’m planning on ${topic.gerund} unless ${topic.problem}.`);
    case 63:
      return makeDraft(`如果一切顺利，我会${topic.zhAction}。`, `Should everything go well, I will ${topic.action}.`);
    case 64:
      return makeDraft(`我打算${topic.zhAction}，这样${topic.zhResult}。`, `I intend to ${topic.action} so that ${topic.result}.`);
    case 65:
      return makeDraft(`如果${topic.zhProblem}，我会${topic.zhAction}。`, `In the event that ${topic.problem}, I would ${topic.action}.`);
    case 66:
      return makeDraft(`我的目标是在${topic.zhGerund}的同时${topic.zhAction}。`, `My aim is to ${topic.action} while ${topic.gerund}.`);
    case 67:
      return makeDraft(`我正在考虑${topic.zhGerund}，以防${topic.zhProblem}。`, `I’m considering ${topic.gerund} in case ${topic.problem}.`);
    case 68:
      return makeDraft(`只要${topic.zhClause}，就没有理由不能${topic.zhAction}。`, `As long as ${topic.clause}, there’s no reason why I can’t ${topic.action}.`);
    case 69:
      return makeDraft(`当${topic.zhWhenClause}时，我期待${topic.zhGerund}。`, `I look forward to ${topic.gerund} when ${topic.whenClause}.`);
    case 70:
      return makeDraft(`如果我要${topic.zhAction}，我会先做好计划。`, `Were I to ${topic.action}, I would make a plan first.`);
    case 71:
      return makeDraft(`到明年这个时候，我会已经${topic.zhPastParticiple}。`, `By this time next year, I will have ${topic.pastParticiple}.`);
    case 72:
      return makeDraft(`无论如何，我都决心${topic.zhAction}。`, `I’m determined to ${topic.action} no matter what.`);
    case 73:
      return makeDraft(`要是${topic.zhProblem}能解决，一切都会更容易。`, `If only ${topic.problem} were solved, everything would feel easier.`);
    case 74:
      return makeDraft(`只要${topic.zhClause}，我就准备好${topic.zhAction}。`, `I’m set to ${topic.action} provided that ${topic.clause}.`);
    case 75:
      return makeDraft(`我越早${topic.zhAction}，结果就越好。`, `The sooner I ${topic.action}, the better the result will be.`);
    case 76:
      return makeDraft(`解决这个问题的关键是我们要${topic.zhAction}。`, `The key to solving this is that we need to ${topic.action}.`);
    case 77:
      return makeDraft(`你可以考虑${topic.zhGerund}。`, `You might want to consider ${topic.gerund}.`);
    case 78:
      return makeDraft(`如果${topic.zhClause}，你会怎么想？`, `How would you feel if ${topic.clause}?`);
    case 79:
      return makeDraft(`处理这件事的一种方式是${topic.zhAction}。`, `One way to deal with it is to ${topic.action}.`);
    case 80:
      return makeDraft(`假设${topic.zhProblem}，你会怎么做？`, `Supposing that ${topic.problem}, what would you do?`);
    case 81:
      return makeDraft(`我们必须${topic.zhAction}，这很重要。`, `It’s essential that we ${topic.action}.`);
    case 82:
      return makeDraft(`我建议你${topic.zhAction}。`, `I recommend that you ${topic.action}.`);
    case 83:
      return makeDraft(`这个问题源于${topic.zhDifficultNoun}。`, `The issue stems from ${topic.difficultNoun}.`);
    case 84:
      return makeDraft(`如果你早点行动，这件事就不会发生。`, `Had you acted sooner, this wouldn’t have happened.`);
    case 85:
      return makeDraft(`为什么不试试${topic.zhGerund}呢？`, `Why not try ${topic.gerund}?`);
    case 86:
      return makeDraft(`如果${topic.zhClause}，就有可能${topic.zhResult}。`, `There’s a chance that ${topic.result} if ${topic.clause}.`);
    case 87:
      return makeDraft(`为了避免${topic.zhDifficultNoun}，最好${topic.zhAction}。`, `To avoid ${topic.difficultNoun}, it’s best to ${topic.action}.`);
    case 88:
      return makeDraft(`我建议你在${topic.zhWhenClause}之前${topic.zhAction}。`, `I suggest you ${topic.action} before ${topic.whenClause}.`);
    case 89:
      return makeDraft(`如果我们${topic.zhAction}会怎么样？`, `What if we were to ${topic.action}?`);
    case 90:
      return makeDraft(`这背后的原因很可能是${topic.zhReason}。`, `The reason behind this is likely that ${topic.reason}.`);
    case 91:
      return makeDraft(`和${topic.zhOptionB}相比，${topic.zhOptionA}要有效得多。`, `Compared with ${topic.optionB}, ${topic.optionA} is far more effective.`);
    case 92:
      return makeDraft(`直到${topic.zhWhenClause}，我才意识到${topic.zhClause}。`, `Not until ${topic.whenClause} did I realize that ${topic.clause}.`);
    case 93:
      return makeDraft(`我完全同意${topic.zhClause}。`, `I couldn’t agree with you more that ${topic.clause}.`);
    case 94:
      return makeDraft(`我们早该抽时间${topic.zhAction}了。`, `It’s high time that we made time to ${topic.action}.`);
    case 95:
      return makeDraft(`除此之外，${topic.zhClause}。`, `On top of that, ${topic.clause}.`);
    case 96:
      return makeDraft(`我必须承认${topic.zhClause}。`, `I must admit that ${topic.clause}.`);
    case 97:
      return makeDraft(`我们这周晚些时候通过${topic.zhMethod}联系一下吧。`, `Let’s touch base later this week by ${topic.method}.`);
    case 98:
      return makeDraft(`很高兴和你一起${topic.zhGerund}。`, `It has been a pleasure ${topic.gerund} with you.`);
    case 99:
      return makeDraft(`如果你还需要其他东西，我会帮你${topic.zhAction}。`, `Should you need anything else, I’ll help you ${topic.action}.`);
    case 100:
      return makeDraft(`总而言之，最重要的是${topic.zhClause}。`, `All in all, what matters most is that ${topic.clause}.`);
    default:
      return makeDraft(`请表达：${topic.zhClause}。`, topic.simple);
  }
}

function createIntermediatePracticeCourse(patternId: number): SentencePatternPractice[] {
  return selectPracticeTopicsForPattern("intermediate", patternId).map((topic, index) => {
    const draft = renderIntermediatePracticeDraft(patternId, topic);
    draft.sceneKey = topic.sceneKey;
    draft.theme = topic.theme;
    return createPracticeFromDraft(draft, index + 1);
  });
}

const intermediateSectionsWithPracticeCourses: SentencePatternSection[] = intermediateSections.map((section) => ({
  ...section,
  patterns: section.patterns.map((pattern) => ({
    ...pattern,
    practices:
      pattern.practices?.length && pattern.practices.length >= MIN_MANUAL_EXAMPLES_PER_PATTERN
        ? normalizeExistingPracticeCourse(pattern.practices, "intermediate", pattern.id)
        : getConfiguredPatternExamples("intermediate", pattern).length
          ? createPracticeCourseFromExamples(getConfiguredPatternExamples("intermediate", pattern))
        : createIntermediatePracticeCourse(pattern.id),
  })),
}));

const advancedSections: SentencePatternSection[] = idiomaticAdvancedSections;

function renderAdvancedPracticeDraft(
  patternId: number,
  topic: BasicPracticeTopic
): BasicPracticeDraft {
  switch (patternId) {
    case 1:
      return makeDraft(`如果不是因为${topic.zhProblem}，我就会${topic.zhAction}。`, `Were it not for the fact that ${topic.problem}, I would ${topic.action}.`);
    case 2:
      return makeDraft(`如果你能尽可能帮我${topic.zhAction}，我将不胜感激。`, `I would be most grateful if you could possibly help me ${topic.action}.`);
    case 3:
      return makeDraft(`如果需要${topic.zhNoun}，我会${topic.zhAction}。`, `Should the need arise for ${topic.noun}, I would ${topic.action}.`);
    case 4:
      return makeDraft(`我几乎没想到${topic.zhProblem}会让我重新考虑计划。`, `Little did I expect that ${topic.problem} would make me rethink my plan.`);
    case 5:
      return makeDraft(`我们必须${topic.zhAction}，这一点很重要。`, `It is imperative that we ${topic.action}.`);
    case 6:
      return makeDraft(`我最想要的是${topic.zhClause}。`, `What I seek above all else is that ${topic.clause}.`);
    case 7:
      return makeDraft(`如果情况允许，我早就${topic.zhPastParticiple}了。`, `Had circumstances permitted, I would have ${topic.pastParticiple}.`);
    case 8:
      return makeDraft(`没有${topic.zhNoun}，我几乎无法想象怎样${topic.zhAction}。`, `I can scarcely imagine how I could ${topic.action} without ${topic.noun}.`);
    case 9:
      return makeDraft(`我能否冒昧建议我们${topic.zhAction}？`, `Might I venture to suggest that we ${topic.action}?`);
    case 10:
      return makeDraft(`${topic.zhProblem}的程度如此之深，以至于${topic.zhResult}。`, `The extent to which ${topic.problem} is such that ${topic.result}.`);
    case 11:
      return makeDraft(`万一${topic.zhProblem}，我会${topic.zhAction}。`, `In the unlikely event that ${topic.problem}, I shall ${topic.action}.`);
    case 12:
      return makeDraft(`没有什么比${topic.zhGerund}更让我高兴。`, `Nothing would please me more than ${topic.gerund}.`);
    case 13:
      return makeDraft(`由于${topic.zhReason}，我不得不${topic.zhAction}。`, `I find myself compelled to ${topic.action} owing to the fact that ${topic.reason}.`);
    case 14:
      return makeDraft(`如果你认为适合帮我${topic.zhAction}，那将意义重大。`, `Should you see fit to help me ${topic.action}, it would mean a great deal.`);
    case 15:
      return makeDraft(`我从未比现在更渴望${topic.zhClause}。`, `At no point have I desired anything more than that ${topic.clause}.`);
    case 16:
      return makeDraft(`我毫不怀疑${topic.zhClause}。`, `Not for a moment do I doubt that ${topic.clause}.`);
    case 17:
      return makeDraft(`考虑到${topic.zhReason}，${topic.zhClause}是合情合理的。`, `It stands to reason that ${topic.clause}, given that ${topic.reason}.`);
    case 18:
      return makeDraft(`如果考虑${topic.zhNoun}，人们就会更早${topic.zhAction}。`, `Were one to consider ${topic.noun}, one would ${topic.action} sooner.`);
    case 19:
      return makeDraft(`问题的关键在于${topic.zhProblem}。`, `The crux of the matter lies in the fact that ${topic.problem}.`);
    case 20:
      return makeDraft(`${topic.zhDifficultNoun}影响如此深远，以至于${topic.zhResult}。`, `So profound is ${topic.difficultNoun} that ${topic.result}.`);
    case 21:
      return makeDraft(`尽管有${topic.zhDifficultNoun}，我还是倾向于相信${topic.zhClause}。`, `I am inclined to believe that ${topic.clause}, notwithstanding ${topic.difficultNoun}.`);
    case 22:
      return makeDraft(`像${topic.zhClause}这样的情况很少被认真讨论。`, `Rarely, if ever, has a situation where ${topic.clause} been discussed seriously.`);
    case 23:
      return makeDraft(`说${topic.zhClause}都算轻描淡写了。`, `To assert that ${topic.clause} would be an understatement.`);
    case 24:
      return makeDraft(`${topic.zhClause}并非没有原因。`, `It is not without reason that ${topic.clause}.`);
    case 25:
      return makeDraft(`讽刺的是，${topic.zhProblem}，即使${topic.zhClause}。`, `The irony is that ${topic.problem}, even as ${topic.clause}.`);
    case 26:
      return makeDraft(`如果我早想到${topic.zhProblem}，我就会更快${topic.zhAction}。`, `Had it occurred to me earlier that ${topic.problem}, I would have tried to ${topic.action} sooner.`);
    case 27:
      return makeDraft(`绝不应该忽视${topic.zhProblem}。`, `On no account should the fact that ${topic.problem} be ignored.`);
    case 28:
      return makeDraft(`${topic.zhDifficultNoun}的本质就是如此，因此${topic.zhResult}。`, `Such is the nature of ${topic.difficultNoun} that ${topic.result}.`);
    case 29:
      return makeDraft(`我敢说${topic.zhProblem}近乎不负责任。`, `I venture to say that ${topic.problem} borders on irresponsibility.`);
    case 30:
      return makeDraft(`${topic.zhOptionA}并非简单，而实际上是明智的。`, `Far from being simple, ${topic.optionA} is in fact wise.`);
    case 31:
      return makeDraft(`我从未像${topic.zhWhenClause}时那样如此${topic.zhEmotion}。`, `Never before have I been so ${topic.emotion} as when ${topic.whenClause}.`);
    case 32:
      return makeDraft(`我痛心地承认${topic.zhProblem}，但${topic.zhClause}。`, `It pains me to admit that ${topic.problem}, yet ${topic.clause}.`);
    case 33:
      return makeDraft(`早已经历过${topic.zhDifficultNoun}后，我现在选择${topic.zhAction}。`, `Having long since endured ${topic.difficultNoun}, I now choose to ${topic.action}.`);
    case 34:
      return makeDraft(`我内心的${topic.zhEmotion}深到难以言表。`, `The depth of my ${topic.emotion} defies easy description.`);
    case 35:
      return makeDraft(`只有当${topic.zhWhenClause}，我才开始明白要${topic.zhAction}。`, `Only when ${topic.whenClause} did I come to understand the need to ${topic.action}.`);
    case 36:
      return makeDraft(`鉴于${topic.zhDifficultNoun}，我不禁觉得${topic.zhClause}。`, `I cannot but feel that ${topic.clause} in light of ${topic.difficultNoun}.`);
    case 37:
      return makeDraft(`${topic.zhDifficultNoun}让我如此不堪重负，以至于${topic.zhResult}。`, `So overwhelmed am I by ${topic.difficultNoun} that ${topic.result}.`);
    case 38:
      return makeDraft(`如果我的心没有这么${topic.zhEmotion}，我会${topic.zhAction}。`, `Were my heart not so ${topic.emotion}, I would ${topic.action}.`);
    case 39:
      return makeDraft(`很久之后我才明白${topic.zhClause}。`, `It dawns on me now that ${topic.clause}, long after ${topic.whenClause}.`);
    case 40:
      return makeDraft(`没有语言能充分表达${topic.zhClause}让我多么${topic.zhEmotion}。`, `No words can adequately convey how ${topic.clause} leaves me feeling ${topic.emotion}.`);
    case 41:
      return makeDraft(`在努力应对${topic.zhDifficultNoun}后，我终于学会${topic.zhAction}。`, `Having grappled with ${topic.difficultNoun}, I have come to ${topic.action}.`);
    case 42:
      return makeDraft(`意识到${topic.zhClause}让我感到${topic.zhEmotion}。`, `The realization that ${topic.clause} has left me ${topic.emotion}.`);
    case 43:
      return makeDraft(`渐渐地，我已经习惯${topic.zhGerund}。`, `Little by little, I have grown to accept ${topic.gerund}.`);
    case 44:
      return makeDraft(`我对${topic.zhDifficultNoun}的经历就是如此，以至于${topic.zhClause}。`, `Such has been my experience with ${topic.difficultNoun} that ${topic.clause}.`);
    case 45:
      return makeDraft(`我无法解释为什么${topic.zhProblem}，只能说${topic.zhReason}。`, `I am at a loss to explain why ${topic.problem}, save that ${topic.reason}.`);
    case 46:
      return makeDraft(`我刚意识到${topic.zhProblem}，就明白${topic.zhClause}。`, `No sooner had I realized that ${topic.problem} than I understood that ${topic.clause}.`);
    case 47:
      return makeDraft(`只有在${topic.zhGerund}之后，我才${topic.zhPastSimple}。`, `It was only after ${topic.gerund} that I ${topic.pastSimple}.`);
    case 48:
      return makeDraft(`要是我早知道${topic.zhProblem}，我绝不会等这么久才${topic.zhAction}。`, `Had I but known that ${topic.problem}, I should never have waited so long to ${topic.action}.`);
    case 49:
      return makeDraft(`我刚${topic.zhPastParticiple}，${topic.zhProblem}就出现了。`, `Scarcely had I ${topic.pastParticiple} when ${topic.problem}.`);
    case 50:
      return makeDraft(`回头看，似乎${topic.zhClause}。`, `Looking back, it seems as though ${topic.clause}.`);
    case 51:
      return makeDraft(`${topic.zhGerund}的记忆仍在，提醒我${topic.zhClause}。`, `The memory of ${topic.gerund} still lingers, reminding me that ${topic.clause}.`);
    case 52:
      return makeDraft(`很久以后我才意识到${topic.zhClause}。`, `Not until much later did I realize that ${topic.clause}.`);
    case 53:
      return makeDraft(`我刚刚${topic.zhPastParticiple}，就发现${topic.zhProblem}。`, `I had hardly ${topic.pastParticiple} before I discovered that ${topic.problem}.`);
    case 54:
      return makeDraft(`由于${topic.zhDifficultNoun}和${topic.zhProblem}，我不得不${topic.zhAction}。`, `What with ${topic.difficultNoun} and the fact that ${topic.problem}, I had to ${topic.action}.`);
    case 55:
      return makeDraft(`回想起来，${topic.zhGerund}证明是明智的。`, `In retrospect, ${topic.gerund} proved to be wise.`);
    case 56:
      return makeDraft(`我从未想过${topic.zhClause}会导致${topic.zhResult}。`, `Never had I imagined that ${topic.clause} would lead to the fact that ${topic.result}.`);
    case 57:
      return makeDraft(`到${topic.zhWhenClause}的时候，${topic.zhClause}已经很明显。`, `By the time ${topic.whenClause}, it had already become apparent that ${topic.clause}.`);
    case 58:
      return makeDraft(`发生的这些事让我感到${topic.zhEmotion}，并想要${topic.zhAction}。`, `The events that transpired left me ${topic.emotion} to ${topic.action}.`);
    case 59:
      return makeDraft(`如果可以让时间倒流，我会更早${topic.zhAction}。`, `Were it possible to turn back time, I would ${topic.action} sooner.`);
    case 60:
      return makeDraft(`这就是我不得不${topic.zhAction}的情况。`, `Such were the circumstances under which I had to ${topic.action}.`);
    case 61:
      return makeDraft(`只要${topic.zhClause}成立，我就会${topic.zhAction}。`, `Provided that ${topic.clause} holds true, I shall ${topic.action}.`);
    case 62:
      return makeDraft(`无论发生什么，我都决心${topic.zhAction}。`, `Come what may, I am resolved to ${topic.action}.`);
    case 63:
      return makeDraft(`到${topic.zhWhenClause}的时候，我早就已经${topic.zhPastParticiple}。`, `By the time ${topic.whenClause}, I will have long since ${topic.pastParticiple}.`);
    case 64:
      return makeDraft(`如果机会出现，我会${topic.zhAction}。`, `Were the opportunity to present itself, I would ${topic.action}.`);
    case 65:
      return makeDraft(`为了预备${topic.zhDifficultNoun}，我打算${topic.zhAction}。`, `In anticipation of ${topic.difficultNoun}, I intend to ${topic.action}.`);
    case 66:
      return makeDraft(`如果事情按${topic.zhClause}发展，我会${topic.zhAction}。`, `Should matters unfold as ${topic.clause}, I will ${topic.action}.`);
    case 67:
      return makeDraft(`一旦${topic.zhWhenClause}，我就准备好${topic.zhAction}。`, `I am poised to ${topic.action} the moment ${topic.whenClause}.`);
    case 68:
      return makeDraft(`在遥远的未来，${topic.zhClause}必然会影响我们的选择。`, `Far into the future, the fact that ${topic.clause} is bound to shape our choices.`);
    case 69:
      return makeDraft(`假设${topic.zhClause}，很可能${topic.zhResult}。`, `Assuming ${topic.clause}, there is every likelihood that ${topic.result}.`);
    case 70:
      return makeDraft(`总有一天，${topic.zhClause}。`, `The day will come when ${topic.clause}.`);
    case 71:
      return makeDraft(`无论${topic.zhDifficultNoun}多么困难，我都会${topic.zhAction}。`, `No matter how difficult ${topic.difficultNoun} becomes, I will ${topic.action}.`);
    case 72:
      return makeDraft(`我真诚希望${topic.zhClause}能帮助我们${topic.zhAction}。`, `It is my fervent hope that ${topic.clause} will help us ${topic.action}.`);
    case 73:
      return makeDraft(`一旦${topic.zhProblem}被解决，我就会${topic.zhAction}。`, `Once the issue that ${topic.problem} has been resolved, I will ${topic.action}.`);
    case 74:
      return makeDraft(`我预见到有一天${topic.zhClause}。`, `I foresee a time when ${topic.clause}.`);
    case 75:
      return makeDraft(`如果运气眷顾${topic.zhNoun}，我会${topic.zhAction}。`, `Should fortune favor ${topic.noun}, I will ${topic.action}.`);
    case 76:
      return makeDraft(`根本问题在于${topic.zhProblem}。`, `The underlying issue is one wherein ${topic.problem}.`);
    case 77:
      return makeDraft(`我能否建议我们${topic.zhAction}？`, `Might I propose that we ${topic.action}?`);
    case 78:
      return makeDraft(`为了让${topic.zhClause}成为现实，${topic.zhAction}至关重要。`, `In order that ${topic.clause}, it is crucial to ${topic.action}.`);
    case 79:
      return makeDraft(`我们面临的困境是，既然${topic.zhProblem}，怎样最好地${topic.zhAction}。`, `The dilemma we face is how best to ${topic.action} given that ${topic.problem}.`);
    case 80:
      return makeDraft(`如果我们${topic.zhAction}，结果会更容易控制。`, `Were we to ${topic.action}, the consequences would be easier to manage.`);
    case 81:
      return makeDraft(`${topic.zhGerund}的重要性再怎么强调都不为过。`, `One cannot overemphasize the importance of ${topic.gerund}.`);
    case 82:
      return makeDraft(`为了缓解${topic.zhDifficultNoun}，一个人必须先${topic.zhAction}。`, `To mitigate ${topic.difficultNoun}, one must first ${topic.action}.`);
    case 83:
      return makeDraft(`我们理应${topic.zhAction}，以免${topic.zhProblem}。`, `It behooves us to ${topic.action} lest ${topic.problem}.`);
    case 84:
      return makeDraft(`问题仍然是是否${topic.zhClause}。`, `The question remains as to whether ${topic.clause}.`);
    case 85:
      return makeDraft(`假设${topic.zhProblem}是真的，那么我们该如何${topic.zhAction}？`, `Supposing ${topic.problem} were true, how then should we ${topic.action}?`);
    case 86:
      return makeDraft(`${topic.zhGerund}的挑战就在这里。`, `Therein lies the challenge of ${topic.gerund}.`);
    case 87:
      return makeDraft(`我建议先${topic.zhGerund}，然后再${topic.zhAction}。`, `I would counsel ${topic.gerund} before trying to ${topic.action}.`);
    case 88:
      return makeDraft(`${topic.zhGerund}的影响如此之大，以至于${topic.zhResult}。`, `The ramifications of ${topic.gerund} are such that ${topic.result}.`);
    case 89:
      return makeDraft(`一个人处理${topic.zhDifficultNoun}的方式决定了${topic.zhResult}。`, `How one approaches ${topic.difficultNoun} determines whether ${topic.result}.`);
    case 90:
      return makeDraft(`我们早该${topic.zhAction}了。`, `It is high time we ${topic.action}.`);
    case 91:
      return makeDraft(`远优于${topic.zhOptionB}的是${topic.zhOptionA}，因为${topic.zhResult}。`, `Far superior to ${topic.optionB} is ${topic.optionA} in that ${topic.result}.`);
    case 92:
      return makeDraft(`没有任何${topic.zhNoun}能脱离${topic.zhClause}而存在。`, `Not a single ${topic.noun} exists without the fact that ${topic.clause}.`);
    case 93:
      return makeDraft(`情况严重到${topic.zhResult}。`, `So much so that ${topic.result}.`);
    case 94:
      return makeDraft(`我是怀着${topic.zhEmotion}的心情决定${topic.zhAction}。`, `It is with ${topic.emotion} that I choose to ${topic.action}.`);
    case 95:
      return makeDraft(`综合来看，${topic.zhOptionB}比不上${topic.zhOptionA}。`, `All things considered, ${topic.optionB} pales in comparison to ${topic.optionA}.`);
    case 96:
      return makeDraft(`反思之后，人们也许会认为${topic.zhClause}。`, `On reflection, one might argue that ${topic.clause}.`);
    case 97:
      return makeDraft(`别忘了${topic.zhClause}，无论情况多么困难。`, `Let us not forget that ${topic.clause}, however difficult things may become.`);
    case 98:
      return makeDraft(`能和你一起${topic.zhGerund}是莫大的荣幸。`, `It has been an absolute privilege ${topic.gerund} with you.`);
    case 99:
      return makeDraft(`如果我们再次相遇，我希望我们能${topic.zhAction}。`, `Should our paths cross again, I hope we can ${topic.action}.`);
    case 100:
      return makeDraft(`归根结底，真正定义我们的是${topic.zhClause}。`, `At the end of the day, what truly defines us is that ${topic.clause}.`);
    default:
      return makeDraft(`请表达：${topic.zhClause}。`, topic.simple);
  }
}

function createAdvancedPracticeCourse(patternId: number): SentencePatternPractice[] {
  return selectPracticeTopicsForPattern("advanced", patternId).map((topic, index) => {
    const draft = renderAdvancedPracticeDraft(patternId, topic);
    draft.sceneKey = topic.sceneKey;
    draft.theme = topic.theme;
    return createPracticeFromDraft(draft, index + 1);
  });
}

const advancedSectionsWithPracticeCourses: SentencePatternSection[] = advancedSections.map((section) => ({
  ...section,
  patterns: section.patterns.map((pattern) => ({
    ...pattern,
    practices:
      pattern.practices?.length && pattern.practices.length >= MIN_MANUAL_EXAMPLES_PER_PATTERN
        ? normalizeExistingPracticeCourse(pattern.practices, "advanced", pattern.id)
        : getConfiguredPatternExamples("advanced", pattern).length
          ? createPracticeCourseFromExamples(getConfiguredPatternExamples("advanced", pattern))
        : createAdvancedPracticeCourse(pattern.id),
  })),
}));

export const sentencePatternLevels: SentencePatternLevel[] = [
  {
    id: "basic",
    badge: "初级",
    benefit: "掌握日常开口必备句型",
    cardTitle: "日常开口100句型",
    exampleCount: 2000,
    heroTitle: "100 个口语常用句型",
    icon: "sprout",
    menuTitle: "日常开口100句型",
    sectionSubtitle: "表达需求与愿望",
    stats: ["100句型", "2000例句", "零基础必学"],
    subtitle: "最常用的英语开口句型，适合零基础和初学者",
    suggestion:
      "每天练习 5-10 个句型，大声替换真实内容，反复练习，让英语开口更自然！",
    tone: "green",
    totalPatterns: 100,
    sections: basicSectionsWithPracticeCourses,
  },
  {
    id: "intermediate",
    badge: "中级",
    benefit: "提升表达深度",
    cardTitle: "自信表达100句型",
    exampleCount: 2000,
    heroTitle: "自信表达100句型",
    icon: "rocket",
    menuTitle: "自信表达100句型",
    sectionSubtitle: "高级需求与请求",
    stats: ["100 个句型", "2000 个例句", "提升表达深度"],
    subtitle: "表达观点和需求更自然，适合有基础的学习者",
    suggestion:
      "每天选 10 个模板，替换成更复杂的真实生活内容（如工作冲突、人生选择、情感深度交流），大声练习并尝试连成段落。这些句型能显著提升口语的自然度和专业感，适合中高级学习者日常使用。",
    tone: "purple",
    totalPatterns: 100,
    sections: intermediateSectionsWithPracticeCourses,
  },
  {
    id: "advanced",
    badge: "高级",
    benefit: "接近母语表达",
    cardTitle: "地道高级100句型",
    exampleCount: 2000,
    heroTitle: "地道高级100句型",
    icon: "trophy",
    menuTitle: "地道高级100句型",
    sectionSubtitle: "极致需求与委婉请求",
    stats: ["100 个句型", "2000 个例句", "接近母语表达"],
    subtitle: "让英语更自然、更像母语者，适合中高级学习者",
    suggestion:
      "每天精选 5-10 个模板，用生活中最复杂的情境进行替换练习，大声朗读并扩展成完整段落，让你的表达更自然、更精准、更有深度。",
    tone: "orange",
    totalPatterns: 100,
    sections: advancedSectionsWithPracticeCourses,
  },
];

export const sentencePatternLevelIds = sentencePatternLevels.map(
  (level) => level.id
);

export function getSentencePatternLevel(id: string) {
  return sentencePatternLevels.find((level) => level.id === id);
}

export function getSentencePattern(levelId: string, patternId: number) {
  const level = getSentencePatternLevel(levelId);
  if (!level) return null;

  for (const section of level.sections) {
    const pattern = section.patterns.find((item) => item.id === patternId);
    if (pattern) {
      return { level, pattern, section };
    }
  }

  return null;
}
