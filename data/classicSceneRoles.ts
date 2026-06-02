export const classicSceneRoleIconLabels = {
  "default-role": "场景角色",
  "bank-staff": "银行职员",
  "government-staff": "政府工作人员",
  "insurance-agent": "保险顾问",
  "restaurant-server": "餐厅服务员",
  "store-clerk": "店员",
  cashier: "收银员",
  doctor: "医生",
  nurse: "护士",
  "front-desk": "前台工作人员",
  "airport-staff": "机场工作人员",
  "hotel-front-desk": "酒店前台",
  driver: "司机",
  teacher: "老师",
  coworker: "同事",
  manager: "主管",
  hr: "HR",
} as const;

export type ClassicSceneRoleIcon = keyof typeof classicSceneRoleIconLabels;

export type ClassicSceneRoleConfig = {
  roleIcon: ClassicSceneRoleIcon;
  roleLabel: string;
};

export const defaultClassicSceneRoleConfig: ClassicSceneRoleConfig = {
  roleIcon: "default-role",
  roleLabel: "场景角色",
};

const bankStaffRoleConfig: ClassicSceneRoleConfig = {
  roleIcon: "bank-staff",
  roleLabel: "银行职员",
};

export const classicLessonRoleConfigs: Record<string, ClassicSceneRoleConfig> = {
  bank_open_new_account_zh: bankStaffRoleConfig,
  bank_deposit_withdrawal_zh: bankStaffRoleConfig,
  bank_credit_card_application_zh: bankStaffRoleConfig,
  bank_credit_card_lost_report_zh: bankStaffRoleConfig,
  bank_online_banking_app_zh: bankStaffRoleConfig,
};

const classicLessonRolePrefixConfigs: Array<{
  prefix: string;
  roleConfig: ClassicSceneRoleConfig;
}> = [
  {
    prefix: "bank_",
    roleConfig: bankStaffRoleConfig,
  },
];

export function isClassicSceneRoleIcon(
  roleIcon: unknown
): roleIcon is ClassicSceneRoleIcon {
  return (
    typeof roleIcon === "string" &&
    Object.prototype.hasOwnProperty.call(classicSceneRoleIconLabels, roleIcon)
  );
}

export function getClassicLessonRoleConfig(
  lessonId: string,
  override?: Partial<{
    roleIcon: string | null;
    roleLabel: string | null;
  }>
): ClassicSceneRoleConfig {
  const configuredRole =
    classicLessonRoleConfigs[lessonId] ||
    classicLessonRolePrefixConfigs.find(({ prefix }) => lessonId.startsWith(prefix))
      ?.roleConfig ||
    defaultClassicSceneRoleConfig;

  const roleIcon = isClassicSceneRoleIcon(override?.roleIcon)
    ? override.roleIcon
    : configuredRole.roleIcon;
  const roleLabel =
    override?.roleLabel?.trim() ||
    configuredRole.roleLabel ||
    classicSceneRoleIconLabels[roleIcon] ||
    defaultClassicSceneRoleConfig.roleLabel;

  return {
    roleIcon,
    roleLabel,
  };
}
