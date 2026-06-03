export type ClassicSceneCategoryId =
  | "shopping-consumption"
  | "restaurant-takeout"
  | "transportation-travel"
  | "housing-home"
  | "health-medical"
  | "service-repair"
  | "education-work-social";

export type ClassicSceneCategoryIcon =
  | "airport"
  | "bag"
  | "bill"
  | "briefcase"
  | "bus"
  | "calendar"
  | "car"
  | "chart"
  | "cart"
  | "clipboard"
  | "community"
  | "delivery"
  | "document"
  | "education"
  | "emergency"
  | "food"
  | "graduation"
  | "health"
  | "home"
  | "hotel"
  | "interview"
  | "map"
  | "medicine"
  | "menu"
  | "plane"
  | "repair"
  | "return"
  | "sale"
  | "scissors"
  | "service"
  | "shield"
  | "store"
  | "taxi"
  | "tools"
  | "wallet"
  | "wrench";

export type ClassicSceneSubcategory = {
  accent: string;
  count: number;
  description: string;
  href?: string;
  icon: ClassicSceneCategoryIcon;
  id: string;
  tile: string;
  title: string;
  wide?: boolean;
};

export type ClassicSceneCategoryMenu = {
  accent: string;
  description: string;
  heroIcon: ClassicSceneCategoryIcon;
  id: ClassicSceneCategoryId;
  subtitle: string;
  title: string;
  theme: "orange" | "teal" | "olive" | "green" | "amber" | "purple";
  cards: ClassicSceneSubcategory[];
};

export const classicSceneCategoryMenus: Record<
  ClassicSceneCategoryId,
  ClassicSceneCategoryMenu
> = {
  "shopping-consumption": {
    id: "shopping-consumption",
    title: "购物与消费",
    subtitle: "选择一个场景，开始你的口语练习之旅吧！",
    description: "购物、退换、支付、讨价还价等场景",
    accent: "#f26a21",
    heroIcon: "bag",
    theme: "orange",
    cards: [
      {
        id: "basic-shopping",
        href: "/classic-scenes/shopping-consumption/basic-shopping",
        title: "基础购物场景",
        description: "询问商品、挑选物品、\n了解信息",
        count: 18,
        icon: "cart",
        accent: "#2f74e8",
        tile: "#edf5ff",
      },
      {
        id: "payment-checkout",
        href: "/classic-scenes/shopping-consumption/payment-checkout",
        title: "支付与结账",
        description: "付款方式、结账流程、\n开发票",
        count: 14,
        icon: "bill",
        accent: "#f5821f",
        tile: "#fff6df",
      },
      {
        id: "returns-after-sale",
        href: "/classic-scenes/shopping-consumption/returns-after-sale",
        title: "退换货与售后",
        description: "退换货流程、售后服务、\n问题解决",
        count: 16,
        icon: "return",
        accent: "#8b57d9",
        tile: "#f6efff",
      },
      {
        id: "bargain-promotion",
        href: "/classic-scenes/shopping-consumption/bargain-promotion",
        title: "讨价还价与促销",
        description: "讨价还价、使用优惠、\n促销活动",
        count: 12,
        icon: "sale",
        accent: "#f05a86",
        tile: "#fff1f5",
      },
      {
        id: "special-shopping",
        href: "/classic-scenes/shopping-consumption/special-shopping",
        title: "特殊消费场景",
        description: "旅行购物、免税购物、\n奢侈品消费",
        count: 10,
        icon: "plane",
        accent: "#1fa897",
        tile: "#eaf9f4",
      },
      {
        id: "daily-bill-management",
        href: "/classic-scenes/shopping-consumption/daily-bill-management",
        title: "日常消费与账单管理",
        description: "日常消费、账单查看、\n费用管理",
        count: 15,
        icon: "bill",
        accent: "#2c74bf",
        tile: "#edf5ff",
      },
    ],
  },
  "restaurant-takeout": {
    id: "restaurant-takeout",
    title: "餐饮与外卖",
    subtitle: "选择一个场景，开始你的口语练习之旅吧！",
    description: "点餐、外卖、咖啡、餐厅沟通等场景",
    accent: "#f05b22",
    heroIcon: "food",
    theme: "orange",
    cards: [
      {
        id: "basic-ordering",
        href: "/classic-scenes/restaurant-takeout/basic-ordering",
        title: "基础点餐场景",
        description: "浏览菜单、点餐、\n口味要求等",
        count: 5,
        icon: "menu",
        accent: "#f05b22",
        tile: "#fff1e8",
      },
      {
        id: "restaurant-dining",
        href: "/classic-scenes/restaurant-takeout/restaurant-dining",
        title: "餐厅就餐沟通",
        description: "询问推荐、加菜、\n换座、结账等",
        count: 5,
        icon: "food",
        accent: "#368f43",
        tile: "#eff8ec",
      },
      {
        id: "takeout-delivery",
        href: "/classic-scenes/restaurant-takeout/takeout-delivery",
        title: "外卖相关场景",
        description: "下单、备注要求、\n催单、取餐等",
        count: 5,
        icon: "delivery",
        accent: "#2b76c8",
        tile: "#eef7ff",
      },
      {
        id: "special-dining",
        href: "/classic-scenes/restaurant-takeout/special-dining",
        title: "特殊餐饮场景",
        description: "素食、过敏、生日、\n节日、酒吧等",
        count: 5,
        icon: "service",
        accent: "#8158d0",
        tile: "#f7f0ff",
      },
      {
        id: "restaurant-payment-after-sale",
        href: "/classic-scenes/restaurant-takeout/restaurant-payment-after-sale",
        title: "餐饮支付与售后",
        description: "付款方式、退款、\n投诉、问题处理等",
        count: 5,
        icon: "wallet",
        accent: "#f08a12",
        tile: "#fff5e2",
      },
      {
        id: "restaurant-reservation-group",
        href: "/classic-scenes/restaurant-takeout/restaurant-reservation-group",
        title: "餐饮预约与团体用餐",
        description: "预订座位、团体点餐、\n活动安排等",
        count: 5,
        icon: "calendar",
        accent: "#e74676",
        tile: "#fff0f4",
      },
    ],
  },
  "transportation-travel": {
    id: "transportation-travel",
    title: "交通与出行",
    subtitle: "选择一个场景，开始你的口语练习之旅吧！",
    description: "机场、地铁、打车、问路等场景",
    accent: "#2d8c96",
    heroIcon: "car",
    theme: "teal",
    cards: [
      {
        id: "airport-scenes",
        href: "/classic-scenes/transportation-travel/airport-scenes",
        title: "机场相关场景",
        description: "值机、安检、登机、\n行李提取、海关等",
        count: 16,
        icon: "airport",
        accent: "#2a7bd7",
        tile: "#edf6ff",
      },
      {
        id: "public-transport",
        href: "/classic-scenes/transportation-travel/public-transport",
        title: "公共交通出行",
        description: "地铁、公交、火车、\n轻轨、有轨电车等",
        count: 18,
        icon: "bus",
        accent: "#2f8a43",
        tile: "#eef8ef",
      },
      {
        id: "taxi-rideshare",
        href: "/classic-scenes/transportation-travel/taxi-rideshare",
        title: "打车与网约车",
        description: "叫车、确认路线、费用、\n等待、到达目的地等",
        count: 14,
        icon: "taxi",
        accent: "#f08a12",
        tile: "#fff6df",
      },
      {
        id: "directions-navigation",
        href: "/classic-scenes/transportation-travel/directions-navigation",
        title: "问路与导航",
        description: "询问方向、看地图、\n理解路线、导航指引等",
        count: 12,
        icon: "map",
        accent: "#7a5bc8",
        tile: "#f5f1ff",
      },
      {
        id: "car-rental-self-driving",
        href: "/classic-scenes/transportation-travel/car-rental-self-driving",
        title: "租车与自驾出行",
        description: "租车流程、驾驶规则、\n加油、停车、还车等",
        count: 13,
        icon: "car",
        accent: "#22999a",
        tile: "#ecf9f9",
      },
      {
        id: "travel-emergency",
        href: "/classic-scenes/transportation-travel/travel-emergency",
        title: "交通问题与应急",
        description: "交通延误、丢失物品、\n事故处理、紧急求助等",
        count: 11,
        icon: "emergency",
        accent: "#ee4d4d",
        tile: "#fff0ef",
      },
    ],
  },
  "housing-home": {
    id: "housing-home",
    title: "住宿与家居",
    subtitle: "选择一个场景，开始你的口语练习之旅吧！",
    description: "酒店入住、租房、家居生活等场景",
    accent: "#7f9850",
    heroIcon: "home",
    theme: "olive",
    cards: [
      {
        id: "hotel-stay",
        href: "/classic-scenes/housing-home/hotel-stay",
        title: "酒店住宿场景",
        description: "预订酒店、入住办理、\n客房服务、退房等",
        count: 16,
        icon: "hotel",
        accent: "#ec7a1a",
        tile: "#fff5df",
      },
      {
        id: "rent-viewing",
        href: "/classic-scenes/housing-home/rent-viewing",
        title: "租房与看房",
        description: "找房渠道、看房沟通、\n签约租房、搬家等",
        count: 18,
        icon: "home",
        accent: "#3d9a57",
        tile: "#eef8ee",
      },
      {
        id: "daily-home-life",
        href: "/classic-scenes/housing-home/daily-home-life",
        title: "日常家居生活",
        description: "家居购物、清洁整理、\n维修维护、家务等",
        count: 15,
        icon: "service",
        accent: "#825bc8",
        tile: "#f7f0ff",
      },
      {
        id: "housing-problems",
        href: "/classic-scenes/housing-home/housing-problems",
        title: "住房问题处理",
        description: "房屋维修、邻里问题、\n投诉建议、纠纷解决等",
        count: 12,
        icon: "tools",
        accent: "#2b79c8",
        tile: "#eef6ff",
      },
      {
        id: "home-supplies-shopping",
        href: "/classic-scenes/housing-home/home-supplies-shopping",
        title: "家居用品采购",
        description: "家具家电、装饰用品、\n厨房用品、收纳用品等",
        count: 14,
        icon: "cart",
        accent: "#e6673f",
        tile: "#fff1e8",
      },
      {
        id: "long-term-housing",
        href: "/classic-scenes/housing-home/long-term-housing",
        title: "长期住房规划",
        description: "购房流程、贷款咨询、\n装修布置、房产管理等",
        count: 13,
        icon: "clipboard",
        accent: "#e6673f",
        tile: "#fff1e8",
      },
    ],
  },
  "health-medical": {
    id: "health-medical",
    title: "健康与医疗",
    subtitle: "选择一个场景，开始你的口语练习之旅吧！",
    description: "看病、买药、体检、健康咨询等场景",
    accent: "#2f7d41",
    heroIcon: "health",
    theme: "green",
    cards: [
      {
        id: "first-visit",
        href: "/classic-scenes/health-medical/first-visit",
        title: "初诊与看病流程",
        description: "挂号、问诊、检查、\n诊断、治疗等",
        count: 18,
        icon: "clipboard",
        accent: "#2f7d41",
        tile: "#eef8ec",
      },
      {
        id: "pharmacy-medicine",
        href: "/classic-scenes/health-medical/pharmacy-medicine",
        title: "买药与药店场景",
        description: "药品咨询、处方购买、\n用药说明等",
        count: 15,
        icon: "medicine",
        accent: "#f26a21",
        tile: "#fff3e3",
      },
      {
        id: "checkup-prevention",
        href: "/classic-scenes/health-medical/checkup-prevention",
        title: "体检与预防保健",
        description: "体检项目、报告解读、\n预防接种等",
        count: 14,
        icon: "shield",
        accent: "#2d74d9",
        tile: "#eef5ff",
      },
      {
        id: "medical-insurance",
        href: "/classic-scenes/health-medical/medical-insurance",
        title: "医疗保险相关",
        description: "保险咨询、报销流程、\n理赔服务等",
        count: 12,
        icon: "document",
        accent: "#8158d0",
        tile: "#f5f0ff",
      },
      {
        id: "medical-emergency",
        href: "/classic-scenes/health-medical/medical-emergency",
        title: "紧急医疗与求助",
        description: "突发疾病、急救求助、\n急诊就医等",
        count: 11,
        icon: "emergency",
        accent: "#f04e5d",
        tile: "#fff0f1",
      },
      {
        id: "health-followup",
        href: "/classic-scenes/health-medical/health-followup",
        title: "健康管理与后续",
        description: "康复随访、慢病管理、\n生活方式建议等",
        count: 13,
        icon: "health",
        accent: "#168f88",
        tile: "#edf9f7",
      },
    ],
  },
  "service-repair": {
    id: "service-repair",
    title: "服务与维修",
    subtitle: "选择一个场景，开始你的口语练习之旅吧！",
    description: "快递、售后、维修、美容美发等场景",
    accent: "#e87b10",
    heroIcon: "wrench",
    theme: "amber",
    cards: [
      {
        id: "delivery-logistics",
        href: "/classic-scenes/service-repair/delivery-logistics",
        title: "快递与物流服务",
        description: "寄件、收件、查询、\n跟踪物流等场景",
        count: 16,
        icon: "delivery",
        accent: "#ee7a14",
        tile: "#fff4df",
      },
      {
        id: "after-sale-return",
        href: "/classic-scenes/service-repair/after-sale-return",
        title: "售后服务与退换",
        description: "退换货、退款、保修、\n产品售后等场景",
        count: 15,
        icon: "return",
        accent: "#2d7bd1",
        tile: "#edf6ff",
      },
      {
        id: "home-appliance-repair",
        href: "/classic-scenes/service-repair/home-appliance-repair",
        title: "家居与家电维修",
        description: "水电维修、家具维修、\n家电故障等场景",
        count: 14,
        icon: "home",
        accent: "#9a5ad1",
        tile: "#f7f0ff",
      },
      {
        id: "beauty-hair-service",
        href: "/classic-scenes/service-repair/beauty-hair-service",
        title: "美容美发服务",
        description: "发型设计、剪发、染发、\n护肤、美甲等场景",
        count: 12,
        icon: "scissors",
        accent: "#e84e78",
        tile: "#fff0f4",
      },
      {
        id: "electronics-repair",
        href: "/classic-scenes/service-repair/electronics-repair",
        title: "电子产品与日常维修",
        description: "手机电脑维修、屏幕更换、\n配件维修等场景",
        count: 13,
        icon: "repair",
        accent: "#2d7bd1",
        tile: "#edf6ff",
      },
      {
        id: "professional-services",
        href: "/classic-scenes/service-repair/professional-services",
        title: "其他专业服务",
        description: "清洁服务、搬家服务、\n开锁换锁、宠物服务等",
        count: 11,
        icon: "clipboard",
        accent: "#4b9a3e",
        tile: "#f0f8ed",
      },
    ],
  },
  "education-work-social": {
    id: "education-work-social",
    title: "教育、工作与社交生活",
    subtitle: "选择一个场景，开始你的口语练习之旅吧！",
    description: "工作沟通、面试、社交、学校生活等场景",
    accent: "#7256a6",
    heroIcon: "graduation",
    theme: "purple",
    cards: [
      {
        id: "school-campus",
        href: "/classic-scenes/education-work-social/school-campus",
        title: "学校教育与校园生活",
        description: "课程学习、校园活动、\n师生交流、留学生生活等",
        count: 16,
        icon: "education",
        accent: "#7256c6",
        tile: "#f4f0ff",
      },
      {
        id: "job-interview",
        href: "/classic-scenes/education-work-social/job-interview",
        title: "求职与面试准备",
        description: "简历撰写、求职申请、\n面试技巧、职业礼仪等",
        count: 15,
        icon: "interview",
        accent: "#2d7bd1",
        tile: "#edf6ff",
      },
      {
        id: "workplace-communication",
        href: "/classic-scenes/education-work-social/workplace-communication",
        title: "职场沟通与日常工作",
        description: "工作沟通、会议讨论、\n邮件写作、项目协作等",
        count: 18,
        icon: "briefcase",
        accent: "#e58417",
        tile: "#fff5df",
      },
      {
        id: "social-relationship",
        href: "/classic-scenes/education-work-social/social-relationship",
        title: "社交活动与人际关系",
        description: "交友聊天、聚会活动、\n兴趣爱好、处理冲突等",
        count: 14,
        icon: "community",
        accent: "#e84e78",
        tile: "#fff0f4",
      },
      {
        id: "career-growth",
        href: "/classic-scenes/education-work-social/career-growth",
        title: "职业发展与工作进阶",
        description: "职业规划、技能提升、\n晋升谈判、职场转型等",
        count: 13,
        icon: "chart",
        accent: "#7364d8",
        tile: "#f3f0ff",
      },
      {
        id: "community-integration",
        href: "/classic-scenes/education-work-social/community-integration",
        title: "校园与社区融合",
        description: "社区生活、志愿服务、\n文化适应、日常事务等",
        count: 12,
        icon: "home",
        accent: "#3f9278",
        tile: "#eef8f4",
      },
    ],
  },
};

export const classicSceneCategoryMenuIds = Object.keys(
  classicSceneCategoryMenus
) as ClassicSceneCategoryId[];

export function getClassicSceneCategoryMenu(categoryId: string) {
  return classicSceneCategoryMenus[categoryId as ClassicSceneCategoryId];
}
