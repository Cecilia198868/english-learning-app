export type FinanceGovernmentSectionId =
  | "bank-finance"
  | "identity-immigration"
  | "public-services"
  | "driver-vehicle"
  | "insurance-consulting"
  | "insurance-traffic-safety"
  | "tax-government-forms"
  | "all-finance";

export type FinanceGovernmentLessonIcon =
  | "account"
  | "atm"
  | "bank"
  | "book"
  | "car"
  | "cash"
  | "chart"
  | "check"
  | "clipboard"
  | "cone"
  | "document"
  | "exchange"
  | "globe"
  | "government"
  | "headset"
  | "health"
  | "home"
  | "id"
  | "library"
  | "lock"
  | "mail"
  | "passport"
  | "phone"
  | "police"
  | "service"
  | "shield"
  | "tax"
  | "umbrella"
  | "visa";

export type FinanceGovernmentLesson = {
  accent: string;
  href?: string;
  icon: FinanceGovernmentLessonIcon;
  id?: string;
  number: number;
  tile: string;
  title: string;
};

export type FinanceGovernmentSection = {
  id: FinanceGovernmentSectionId;
  lessons: FinanceGovernmentLesson[];
  title: string;
};

type LessonInput = Omit<FinanceGovernmentLesson, "href" | "number">;

function buildLessons(lessons: LessonInput[]): FinanceGovernmentLesson[] {
  return lessons.map((lesson, index) => ({
    ...lesson,
    href: lesson.id ? `/study/${lesson.id}` : undefined,
    number: index + 1,
  }));
}

function renumber(
  lessons: readonly Omit<FinanceGovernmentLesson, "number">[]
): FinanceGovernmentLesson[] {
  return lessons.map((lesson, index) => ({ ...lesson, number: index + 1 }));
}

const green = "#5d9349";
const deepGreen = "#315f37";
const teal = "#4e8b83";
const orange = "#d6763c";
const gold = "#d99b24";
const purple = "#7b6794";
const pink = "#a5678f";

const paleGreen = "#edf5e8";
const paleCream = "#f4f0df";
const paleGold = "#fff7df";
const paleOrange = "#fff1e5";
const paleTeal = "#eef7f4";
const palePurple = "#f4eef5";
const palePink = "#f7eef3";

const bankFinanceLessons = buildLessons([
  {
    id: "bank_open_new_account_zh",
    title: "新开银行账户",
    icon: "account",
    accent: green,
    tile: paleCream,
  },
  {
    id: "bank_general_banking_zh",
    title: "银行业务口语课",
    icon: "headset",
    accent: teal,
    tile: paleGreen,
  },
  {
    id: "bank_atm_self_service_zh",
    title: "使用 ATM 机和自我服务",
    icon: "atm",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "bank_online_banking_app_zh",
    title: "网上银行与手机App操作",
    icon: "phone",
    accent: deepGreen,
    tile: paleGreen,
  },
  {
    id: "bank_deposit_withdrawal_zh",
    title: "存款和取款",
    icon: "cash",
    accent: green,
    tile: paleCream,
  },
  {
    id: "bank_currency_exchange_remittance_zh",
    title: "货币兑换与国际汇款",
    icon: "exchange",
    accent: green,
    tile: paleOrange,
  },
  {
    id: "bank_international_wire_zh",
    title: "国际电汇与海外付款",
    icon: "globe",
    accent: teal,
    tile: paleGreen,
  },
  {
    id: "bank_savings_fixed_deposit_zh",
    title: "设立储蓄和定期存款账户",
    icon: "bank",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "bank_credit_card_application_zh",
    title: "信用卡申请与审批流程",
    icon: "clipboard",
    accent: green,
    tile: paleCream,
  },
  {
    id: "bank_credit_card_lost_report_zh",
    title: "信用卡挂失口语课",
    icon: "lock",
    accent: deepGreen,
    tile: paleGreen,
  },
  {
    id: "bank_credit_card_fraud_report_zh",
    title: "信用卡报告欺诈收费口语课",
    icon: "shield",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "bank_fee_disputes_zh",
    title: "银行费用查询与争议解决",
    icon: "document",
    accent: teal,
    tile: paleGreen,
  },
  {
    id: "bank_customer_service_calls_zh",
    title: "银行客服电话口语课",
    icon: "phone",
    accent: green,
    tile: paleOrange,
  },
  {
    id: "bank_personal_loan_zh",
    title: "申请个人贷款",
    icon: "account",
    accent: green,
    tile: paleCream,
  },
  {
    id: "bank_mortgage_consultation_zh",
    title: "房屋抵押贷款咨询",
    icon: "home",
    accent: green,
    tile: paleCream,
  },
  {
    id: "bank_safe_deposit_box_zh",
    title: "银行保险箱",
    icon: "shield",
    accent: deepGreen,
    tile: paleGreen,
  },
  {
    id: "bank_insurance_products_zh",
    title: "银行提供的保险产品",
    icon: "umbrella",
    accent: green,
    tile: paleCream,
  },
  {
    id: "bank_wealth_management_zh",
    title: "投资产品与财富管理",
    icon: "chart",
    accent: green,
    tile: paleOrange,
  },
  {
    id: "bank_retirement_pension_zh",
    title: "退休储蓄与养老金计划",
    icon: "account",
    accent: teal,
    tile: paleGreen,
  },
  {
    id: "bank_close_account_zh",
    title: "关闭银行账户",
    icon: "lock",
    accent: green,
    tile: paleCream,
  },
]);

const identityImmigrationLessons = buildLessons([
  {
    id: "government_apply_ssn_zh",
    title: "申请社会安全号码（SSN）",
    icon: "id",
    accent: orange,
    tile: paleOrange,
  },
  {
    id: "government_uscis_registration_zh",
    title: "申报入境并向 USCIS 注册",
    icon: "passport",
    accent: orange,
    tile: paleOrange,
  },
  {
    id: "government_apply_itin_zh",
    title: "申请个人纳税识别号码（ITIN）",
    icon: "tax",
    accent: gold,
    tile: paleGold,
  },
  {
    id: "government_lost_stolen_passport_zh",
    title: "申报护照遗失或被盗",
    icon: "passport",
    accent: orange,
    tile: paleOrange,
  },
  {
    id: "government_immigration_office_zh",
    title: "在移民局办理事务",
    icon: "government",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "government_extend_visa_status_zh",
    title: "续签或延长签证身份有效期",
    icon: "visa",
    accent: orange,
    tile: paleOrange,
  },
  {
    id: "government_voter_registration_zh",
    title: "注册选民资格",
    icon: "check",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "government_official_documents_zh",
    title: "申请官方证明文件",
    icon: "document",
    accent: deepGreen,
    tile: paleGreen,
  },
]);

const publicServiceLessons = buildLessons([
  {
    id: "government_snap_benefits_zh",
    title: "申请食品券 / SNAP福利",
    icon: "service",
    accent: gold,
    tile: paleGold,
  },
  {
    id: "government_public_housing_zh",
    title: "申请公共住房",
    icon: "home",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "government_unemployment_benefits_zh",
    title: "申请失业救济金",
    icon: "government",
    accent: gold,
    tile: paleGold,
  },
  {
    id: "government_free_resources_zh",
    title: "利用免费政府资源",
    icon: "book",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "government_file_complaint_zh",
    title: "向政府机构提交投诉",
    icon: "document",
    accent: orange,
    tile: paleOrange,
  },
  {
    id: "government_police_emergency_services_zh",
    title: "应对警方或紧急救援服务",
    icon: "police",
    accent: deepGreen,
    tile: paleGreen,
  },
  {
    id: "government_vaccine_records_zh",
    title: "接种疫苗并获取健康记录",
    icon: "health",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "government_usps_services_zh",
    title: "使用美国邮政服务（USPS）",
    icon: "mail",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "government_library_card_zh",
    title: "申请图书证",
    icon: "library",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "government_selective_service_zh",
    title: "注册兵役登记",
    icon: "clipboard",
    accent: gold,
    tile: paleGold,
  },
]);

const driverVehicleLessons = buildLessons([
  {
    id: "government_state_id_driver_license_zh",
    title: "办理州身份证或驾驶执照",
    icon: "id",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "government_dmv_vehicle_registration_zh",
    title: "在 DMV 办理车辆注册登记",
    icon: "car",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "driver_vehicle_registration_plates_zh",
    title: "办理车辆注册及申领车牌",
    icon: "car",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "driver_apply_first_learner_permit_zh",
    title: "申领首张学习驾驶许可",
    icon: "document",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "driver_prepare_written_test_zh",
    title: "备考驾驶笔试",
    icon: "book",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "driver_take_official_knowledge_test_zh",
    title: "参加官方驾驶知识笔试",
    icon: "clipboard",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "driver_prepare_take_road_test_zh",
    title: "准备并参加路考",
    icon: "car",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "driver_receive_driver_license_zh",
    title: "领取驾驶执照",
    icon: "id",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "driver_renew_replace_lost_license_zh",
    title: "续期或补办遗失的驾驶执照",
    icon: "document",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "driver_update_address_name_zh",
    title: "更新执照上的住址或姓名信息",
    icon: "id",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "driver_convert_foreign_license_zh",
    title: "将境外驾驶执照转换为美国执照",
    icon: "globe",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "driver_license_classes_restrictions_zh",
    title: "了解不同的执照类别及限制条件",
    icon: "document",
    accent: deepGreen,
    tile: paleGreen,
  },
  {
    id: "driver_apply_international_permit_zh",
    title: "在美国申领国际驾驶许可",
    icon: "globe",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "driver_interstate_transfer_rules_zh",
    title: "跨州驾驶及执照转移规则",
    icon: "globe",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "driver_understand_us_traffic_laws_zh",
    title: "了解美国驾驶法规",
    icon: "cone",
    accent: orange,
    tile: paleOrange,
  },
  {
    id: "driver_suspension_points_zh",
    title: "处理执照被吊销或驾照记录扣分问题",
    icon: "shield",
    accent: orange,
    tile: paleOrange,
  },
]);

const insuranceConsultingLessons = buildLessons([
  {
    id: "driver_new_driver_car_insurance_zh",
    title: "新手司机购买汽车保险",
    icon: "shield",
    accent: purple,
    tile: palePurple,
  },
  {
    id: "bank_insurance_products_zh",
    title: "银行提供的保险产品",
    icon: "umbrella",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "health_insurance_basic_types_zh",
    title: "了解美国医疗保险基本类型",
    icon: "health",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "health_insurance_obamacare_aca_zh",
    title: "新移民如何申请 Obamacare（ACA）医疗保险",
    icon: "health",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "health_insurance_choose_plan_zh",
    title: "选择合适的健康保险计划",
    icon: "clipboard",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "health_insurance_coverage_consultation_zh",
    title: "保险覆盖范围咨询",
    icon: "document",
    accent: purple,
    tile: palePurple,
  },
  {
    id: "health_insurance_find_primary_care_doctor_zh",
    title: "寻找初级保健医生",
    icon: "health",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "health_insurance_denial_preauthorization_zh",
    title: "处理保险拒赔或预授权问题",
    icon: "shield",
    accent: purple,
    tile: palePurple,
  },
  {
    id: "renter_insurance_consultation_zh",
    title: "租房者保险咨询",
    icon: "home",
    accent: green,
    tile: paleGreen,
  },
  {
    id: "homeowners_insurance_purchase_zh",
    title: "购买房屋保险",
    icon: "home",
    accent: green,
    tile: paleGreen,
  },
]);

const insuranceTrafficSafetyLessons = buildLessons([
  {
    id: "driver_understand_us_traffic_laws_zh",
    title: "了解美国驾驶法规",
    icon: "cone",
    accent: orange,
    tile: paleOrange,
  },
  {
    id: "driver_police_traffic_stop_zh",
    title: "应对警方例行截停检查",
    icon: "police",
    accent: deepGreen,
    tile: paleGreen,
  },
  {
    id: "driver_accident_insurance_claim_zh",
    title: "报告交通事故及提交保险理赔申请",
    icon: "shield",
    accent: orange,
    tile: paleOrange,
  },
  {
    id: "driver_pay_traffic_ticket_zh",
    title: "缴纳交通罚单及罚款",
    icon: "document",
    accent: orange,
    tile: paleOrange,
  },
  {
    id: "driver_defensive_driving_course_zh",
    title: "参加防御性驾驶或驾驶技能提升课程",
    icon: "car",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "driver_suspension_points_zh",
    title: "处理执照被吊销或驾驶记录扣分问题",
    icon: "shield",
    accent: orange,
    tile: paleOrange,
  },
  {
    id: "driver_cdl_basics_zh",
    title: "商业驾驶执照（CDL）申请基础知识",
    icon: "car",
    accent: teal,
    tile: paleTeal,
  },
  {
    id: "driver_interstate_transfer_rules_zh",
    title: "跨州驾驶及执照转移规则",
    icon: "globe",
    accent: green,
    tile: paleGreen,
  },
]);

const taxGovernmentFormLessons = buildLessons([
  {
    title: "了解美国联邦所得税与州所得税基本规则",
    icon: "tax",
    accent: pink,
    tile: palePink,
  },
  {
    id: "government_apply_itin_zh",
    title: "新移民如何申请ITIN（个人纳税识别号码）",
    icon: "tax",
    accent: gold,
    tile: paleGold,
  },
  {
    title: "第一次报税需要准备哪些文件",
    icon: "clipboard",
    accent: pink,
    tile: palePink,
  },
  {
    title: "区分W-2工薪收入与1099独立承包人收入",
    icon: "document",
    accent: pink,
    tile: palePink,
  },
  {
    title: "申报联邦所得税表格（Form 1040）",
    icon: "document",
    accent: pink,
    tile: palePink,
  },
  {
    title: "申请退税及追踪退税状态",
    icon: "check",
    accent: green,
    tile: paleGreen,
  },
  {
    title: "了解常见税务抵扣项目（标准扣除 vs 分项扣除）",
    icon: "tax",
    accent: pink,
    tile: palePink,
  },
  {
    title: "申请儿童税收抵免（Child Tax Credit）",
    icon: "account",
    accent: green,
    tile: paleGreen,
  },
  {
    title: "自雇人士预估税款（Estimated Tax）申报",
    icon: "chart",
    accent: pink,
    tile: palePink,
  },
  {
    title: "处理税务局信件与审计通知（IRS Notice）",
    icon: "mail",
    accent: pink,
    tile: palePink,
  },
]);

const allFinanceLessons = renumber([
  ...bankFinanceLessons,
  ...identityImmigrationLessons,
  ...publicServiceLessons,
  ...driverVehicleLessons,
  ...insuranceConsultingLessons,
  ...insuranceTrafficSafetyLessons,
  ...taxGovernmentFormLessons,
  {
    title: "申请延期报税（Form 4868）",
    icon: "document",
    accent: pink,
    tile: palePink,
  },
]);

export const financeGovernmentSections: Record<
  FinanceGovernmentSectionId,
  FinanceGovernmentSection
> = {
  "bank-finance": {
    id: "bank-finance",
    title: "银行与金融交易",
    lessons: bankFinanceLessons,
  },
  "identity-immigration": {
    id: "identity-immigration",
    title: "身份与移民相关",
    lessons: identityImmigrationLessons,
  },
  "public-services": {
    id: "public-services",
    title: "政府福利与公共服务",
    lessons: publicServiceLessons,
  },
  "driver-vehicle": {
    id: "driver-vehicle",
    title: "驾照与车辆管理",
    lessons: driverVehicleLessons,
  },
  "insurance-consulting": {
    id: "insurance-consulting",
    title: "保险咨询",
    lessons: insuranceConsultingLessons,
  },
  "insurance-traffic-safety": {
    id: "insurance-traffic-safety",
    title: "交通安全",
    lessons: insuranceTrafficSafetyLessons,
  },
  "tax-government-forms": {
    id: "tax-government-forms",
    title: "税务与政府表格",
    lessons: taxGovernmentFormLessons,
  },
  "all-finance": {
    id: "all-finance",
    title: "金融与行政全部课程",
    lessons: allFinanceLessons,
  },
};

export const financeGovernmentSectionIds = Object.keys(
  financeGovernmentSections
) as FinanceGovernmentSectionId[];

export function getFinanceGovernmentSection(sectionId: string) {
  return financeGovernmentSections[sectionId as FinanceGovernmentSectionId];
}
