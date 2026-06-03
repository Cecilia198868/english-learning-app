import type { ClassicSceneCategoryIcon } from "./classicSceneCategoryMenus";
import type { ClassicSceneRoleConfig } from "./classicSceneRoles";
import type { TrainingItem } from "@/lib/training";

export type ShoppingSceneSectionId =
  | "basic-shopping"
  | "payment-checkout"
  | "returns-after-sale"
  | "bargain-promotion"
  | "special-shopping"
  | "daily-bill-management";

export type ShoppingSceneCourseDefinition = {
  accent: string;
  icon: ClassicSceneCategoryIcon;
  id: string;
  items: TrainingItem[];
  number: number;
  roleConfig: Partial<ClassicSceneRoleConfig>;
  tile: string;
  title: string;
};

export type ShoppingSceneCourseSection = {
  accent: string;
  id: ShoppingSceneSectionId;
  lessons: ShoppingSceneCourseDefinition[];
  subtitle: string;
  title: string;
};

const subtitle = "选择一个具体场景，开始你的口语练习之旅吧！";

const basicAccent = "#6aa14e";
const basicTile = "#eef8e9";
const paymentAccent = "#f5821f";
const paymentTile = "#fff2df";
const returnAccent = "#7851c8";
const returnTile = "#f5efff";
const bargainAccent = "#f0527c";
const bargainTile = "#fff0f5";
const specialAccent = "#48ad9d";
const specialTile = "#ecf9f6";
const billAccent = "#3f7cdd";
const billTile = "#eef6ff";

const storeClerkRoleConfig: Partial<ClassicSceneRoleConfig> = {
  roleIcon: "store-clerk",
  roleLabel: "店员",
};

const cashierRoleConfig: Partial<ClassicSceneRoleConfig> = {
  roleIcon: "cashier",
  roleLabel: "收银员",
};

const serviceRoleConfig: Partial<ClassicSceneRoleConfig> = {
  roleIcon: "front-desk",
  roleLabel: "客服人员",
};

function item(zh: string, en: string): TrainingItem {
  return { zh, en };
}

function makeBasicItems(
  productZh: string,
  productEn: string,
  useZh: string,
  useEn: string,
  locationZh = "它在哪一排？",
  locationEn = "Which aisle is it in?"
): TrainingItem[] {
  return [
    item(`你好，我想买${productZh}。`, `Hi, I'm looking for ${productEn}.`),
    item(locationZh, locationEn),
    item("今天有促销吗？", "Is it on sale today?"),
    item("有小包装的吗？", "Do you have a smaller size?"),
    item(`这个适合${useZh}吗？`, `Is this good for ${useEn}?`),
    item("保质期到哪天？", "When does it expire?"),
    item("我想比较价格。", "I'd like to compare the prices."),
    item("请帮我拿这个。", "I'll take this one, please."),
    item("可以给我收据吗？", "Can I get a receipt?"),
    item("谢谢你的帮助。", "Thank you for your help."),
  ];
}

function makePaymentItems(
  methodZh: string,
  methodEn: string,
  issueZh = "机器没反应。",
  issueEn = "The machine isn't responding."
): TrainingItem[] {
  return [
    item("你好，我准备结账。", "Hi, I'm ready to check out."),
    item(`我想用${methodZh}。`, `I'd like to pay with ${methodEn}.`),
    item("总共多少钱？", "What's the total?"),
    item("这个价格含税吗？", "Does this price include tax?"),
    item(issueZh, issueEn),
    item("请再试一次。", "Please try it again."),
    item("需要我签名吗？", "Do I need to sign?"),
    item("可以给我电子收据吗？", "Can I get an e-receipt?"),
    item("请确认付款成功。", "Please confirm the payment went through."),
    item("谢谢，辛苦了。", "Thank you. I appreciate it."),
  ];
}

function makeReturnItems(
  actionZh: string,
  actionEn: string,
  issueZh: string,
  issueEn: string
): TrainingItem[] {
  return [
    item(`我想${actionZh}这个商品。`, `I'd like to ${actionEn} this item.`),
    item("这是我的收据。", "Here is my receipt."),
    item(issueZh, issueEn),
    item("我昨天才买的。", "I bought it just yesterday."),
    item("可以退到原卡吗？", "Can it go back to my original card?"),
    item("退款多久能到账？", "How long will the refund take?"),
    item("能换同款吗？", "Can I exchange it for the same one?"),
    item("需要原包装吗？", "Do you need the original packaging?"),
    item("请给我确认单。", "Please give me a confirmation slip."),
    item("谢谢你帮我处理。", "Thank you for handling this for me."),
  ];
}

function makeBargainItems(
  productZh: string,
  productEn: string,
  promoZh = "促销今天有效吗？",
  promoEn = "Is the promotion valid today?"
): TrainingItem[] {
  return [
    item(`${productZh}能便宜点吗？`, `Can you lower the price for ${productEn}?`),
    item("买两个有折扣吗？", "Is there a discount if I buy two?"),
    item("我看到别家更便宜。", "I saw it cheaper at another store."),
    item("可以用优惠券吗？", "Can I use a coupon?"),
    item(promoZh, promoEn),
    item("会员价是多少？", "What's the member price?"),
    item("现金付款会便宜吗？", "Is it cheaper if I pay cash?"),
    item("最低能到多少？", "What's the lowest price you can do?"),
    item("好的，我买这个。", "Okay, I'll take this one."),
    item("谢谢你给我优惠。", "Thank you for the discount."),
  ];
}

function makeSpecialItems(
  topicZh: string,
  topicEn: string,
  detailZh: string,
  detailEn: string
): TrainingItem[] {
  return [
    item(`我想咨询${topicZh}。`, `I'd like to ask about ${topicEn}.`),
    item(detailZh, detailEn),
    item("可以看一下样品吗？", "May I see a sample?"),
    item("这个有保修吗？", "Does this come with a warranty?"),
    item("什么时候能送到？", "When can it be delivered?"),
    item("能预约安装吗？", "Can I schedule installation?"),
    item("可以分期付款吗？", "Can I pay in installments?"),
    item("需要付押金吗？", "Do I need to pay a deposit?"),
    item("请帮我下单。", "Please help me place the order."),
    item("谢谢你的说明。", "Thank you for explaining this."),
  ];
}

function makeBillItems(
  billZh: string,
  billEn: string,
  issueZh = "我觉得金额不对。",
  issueEn = "I think the amount is wrong."
): TrainingItem[] {
  return [
    item(`我想查看${billZh}。`, `I'd like to review ${billEn}.`),
    item("这个费用是什么？", "What is this charge for?"),
    item(issueZh, issueEn),
    item("能帮我查一下吗？", "Could you check it for me?"),
    item("可以调整账单吗？", "Can the bill be adjusted?"),
    item("我想设置自动付款。", "I'd like to set up auto-pay."),
    item("付款截止日是哪天？", "What is the payment due date?"),
    item("可以发到邮箱吗？", "Can you send it to my email?"),
    item("请给我确认号码。", "Please give me a confirmation number."),
    item("谢谢你解释清楚。", "Thank you for explaining it clearly."),
  ];
}

function lesson(
  number: number,
  id: string,
  title: string,
  icon: ClassicSceneCategoryIcon,
  accent: string,
  tile: string,
  items: TrainingItem[],
  roleConfig: Partial<ClassicSceneRoleConfig>
): ShoppingSceneCourseDefinition {
  return { number, id, title, icon, accent, tile, items, roleConfig };
}

export const shoppingSceneCourseSections: Record<
  ShoppingSceneSectionId,
  ShoppingSceneCourseSection
> = {
  "basic-shopping": {
    id: "basic-shopping",
    title: "基础购物场景",
    subtitle,
    accent: "#2f6a39",
    lessons: [
      lesson(1, "shopping_basic_supermarket_zh", "在超市购物", "cart", basicAccent, basicTile, makeBasicItems("牛奶和面包", "milk and bread", "早餐", "breakfast"), storeClerkRoleConfig),
      lesson(2, "shopping_basic_mall_clothes_daily_zh", "在商场购买衣服和日用品", "bag", basicAccent, basicTile, makeBasicItems("外套和毛巾", "a jacket and towels", "日常使用", "daily use", "试衣间在哪里？", "Where is the fitting room?"), storeClerkRoleConfig),
      lesson(3, "shopping_basic_pharmacy_personal_care_zh", "在药店购买药品和个人护理品", "medicine", basicAccent, basicTile, makeBasicItems("感冒药和牙膏", "cold medicine and toothpaste", "轻微感冒", "a mild cold"), storeClerkRoleConfig),
      lesson(4, "shopping_basic_electronics_zh", "购买电子产品", "repair", basicAccent, basicTile, makeBasicItems("耳机和充电器", "headphones and a charger", "我的手机", "my phone"), storeClerkRoleConfig),
      lesson(5, "shopping_basic_online_order_zh", "在线购物平台下单", "cart", basicAccent, basicTile, makeBasicItems("这个网购商品", "this online item", "送礼", "a gift", "预计几天送到？", "How many days will delivery take?"), serviceRoleConfig),
      lesson(6, "shopping_basic_check_stock_zh", "询问商品库存", "store", basicAccent, basicTile, makeBasicItems("这款商品", "this item", "今天使用", "today", "还有现货吗？", "Do you still have it in stock?"), storeClerkRoleConfig),
      lesson(7, "shopping_basic_size_color_zh", "比较商品尺寸和颜色", "bag", basicAccent, basicTile, makeBasicItems("不同颜色的这款", "this item in different colors", "我的尺寸", "my size", "有大一号的吗？", "Do you have one size up?"), storeClerkRoleConfig),
      lesson(8, "shopping_basic_try_clothes_zh", "试穿衣服和换尺码", "store", basicAccent, basicTile, makeBasicItems("这件衬衫", "this shirt", "上班穿", "work", "我可以试穿吗？", "May I try it on?"), storeClerkRoleConfig),
      lesson(9, "shopping_basic_shoes_accessories_zh", "购买鞋子和配饰", "bag", basicAccent, basicTile, makeBasicItems("运动鞋和腰带", "sneakers and a belt", "旅行", "travel", "有半码的吗？", "Do you have half sizes?"), storeClerkRoleConfig),
      lesson(10, "shopping_basic_convenience_store_zh", "在便利店购物", "store", basicAccent, basicTile, makeBasicItems("水和纸巾", "water and tissues", "路上用", "the road", "收银台在哪里？", "Where is the checkout counter?"), storeClerkRoleConfig),
      lesson(11, "shopping_basic_farmers_market_zh", "在农贸市场买菜", "cart", basicAccent, basicTile, makeBasicItems("番茄和青菜", "tomatoes and greens", "今晚做饭", "dinner tonight", "这些是本地的吗？", "Are these local?"), storeClerkRoleConfig),
      lesson(12, "shopping_basic_gift_wrapping_zh", "购买礼物和包装", "bag", basicAccent, basicTile, makeBasicItems("生日礼物", "a birthday gift", "朋友生日", "a friend's birthday", "可以礼品包装吗？", "Can you gift wrap it?"), storeClerkRoleConfig),
      lesson(13, "shopping_basic_ingredients_expiry_zh", "咨询保质期和成分", "document", basicAccent, basicTile, makeBasicItems("这款饼干", "these cookies", "孩子吃", "children", "成分表在哪里？", "Where is the ingredient list?"), storeClerkRoleConfig),
      lesson(14, "shopping_basic_children_products_zh", "购买儿童用品", "bag", basicAccent, basicTile, makeBasicItems("儿童水杯", "a kids' water bottle", "上学用", "school", "适合六岁孩子吗？", "Is it good for a six-year-old?"), storeClerkRoleConfig),
      lesson(15, "shopping_basic_beauty_skincare_zh", "购买美妆护肤品", "store", basicAccent, basicTile, makeBasicItems("保湿霜", "moisturizer", "敏感皮肤", "sensitive skin", "可以试用一下吗？", "May I try a sample?"), storeClerkRoleConfig),
      lesson(16, "shopping_basic_stationery_office_zh", "购买文具和办公用品", "clipboard", basicAccent, basicTile, makeBasicItems("笔记本和文件夹", "notebooks and folders", "办公室", "the office", "办公用品在哪边？", "Where are the office supplies?"), storeClerkRoleConfig),
      lesson(17, "shopping_basic_delivery_installation_zh", "询问送货和安装", "delivery", basicAccent, basicTile, makeBasicItems("这件大件商品", "this large item", "家里使用", "home use", "可以送货上门吗？", "Can you deliver it to my home?"), storeClerkRoleConfig),
      lesson(18, "shopping_basic_cart_final_check_zh", "处理购物车和结账前确认", "cart", basicAccent, basicTile, makeBasicItems("购物车里的商品", "the items in my cart", "今天需要", "today", "可以帮我确认吗？", "Could you help me check them?"), storeClerkRoleConfig),
    ],
  },
  "payment-checkout": {
    id: "payment-checkout",
    title: "支付与结账",
    subtitle,
    accent: paymentAccent,
    lessons: [
      lesson(1, "shopping_payment_supermarket_checkout_zh", "超市结账与支付方式", "cart", paymentAccent, paymentTile, makePaymentItems("信用卡", "a credit card"), cashierRoleConfig),
      lesson(2, "shopping_payment_credit_debit_card_zh", "使用信用卡或借记卡付款", "wallet", paymentAccent, paymentTile, makePaymentItems("借记卡", "a debit card"), cashierRoleConfig),
      lesson(3, "shopping_payment_mobile_wallet_zh", "使用移动支付（Apple Pay / Google Pay）", "repair", paymentAccent, paymentTile, makePaymentItems("Apple Pay", "Apple Pay", "手机没有识别。", "My phone wasn't recognized."), cashierRoleConfig),
      lesson(4, "shopping_payment_change_issue_zh", "处理收银员找零问题", "wallet", paymentAccent, paymentTile, makePaymentItems("现金", "cash", "找零好像不对。", "The change seems wrong."), cashierRoleConfig),
      lesson(5, "shopping_payment_installment_consult_zh", "分期付款咨询", "calendar", paymentAccent, paymentTile, makePaymentItems("分期付款", "installments", "我想了解每月金额。", "I'd like to know the monthly amount."), cashierRoleConfig),
      lesson(6, "shopping_payment_receipt_request_zh", "申请纸质或电子收据", "bill", paymentAccent, paymentTile, makePaymentItems("信用卡", "a credit card", "我需要收据报销。", "I need the receipt for reimbursement."), cashierRoleConfig),
      lesson(7, "shopping_payment_invoice_reimbursement_zh", "开具发票或报销凭证", "document", paymentAccent, paymentTile, makePaymentItems("公司卡", "a company card", "可以开发票吗？", "Can you issue an invoice?"), cashierRoleConfig),
      lesson(8, "shopping_payment_gift_card_zh", "使用礼品卡付款", "wallet", paymentAccent, paymentTile, makePaymentItems("礼品卡", "a gift card", "余额不够。", "The balance isn't enough."), cashierRoleConfig),
      lesson(9, "shopping_payment_failed_transaction_zh", "处理支付失败", "service", paymentAccent, paymentTile, makePaymentItems("这张卡", "this card", "付款失败了。", "The payment failed."), cashierRoleConfig),
      lesson(10, "shopping_payment_split_bill_zh", "分单付款或AA制", "wallet", paymentAccent, paymentTile, makePaymentItems("两张卡", "two cards", "我们想分开付款。", "We'd like to pay separately."), cashierRoleConfig),
      lesson(11, "shopping_payment_tax_service_fee_zh", "询问税费和服务费", "bill", paymentAccent, paymentTile, makePaymentItems("信用卡", "a credit card", "这里有额外费用吗？", "Are there any extra fees?"), cashierRoleConfig),
      lesson(12, "shopping_payment_self_checkout_zh", "使用店内自助结账", "cart", paymentAccent, paymentTile, makePaymentItems("自助结账机", "the self-checkout machine", "条码扫不上。", "The barcode won't scan."), cashierRoleConfig),
      lesson(13, "shopping_payment_price_match_zh", "申请价格匹配", "chart", paymentAccent, paymentTile, makePaymentItems("信用卡", "a credit card", "可以价格匹配吗？", "Can you match this price?"), cashierRoleConfig),
      lesson(14, "shopping_payment_deposit_preauthorization_zh", "预授权和押金支付", "calendar", paymentAccent, paymentTile, makePaymentItems("信用卡预授权", "a credit card preauthorization", "押金多久释放？", "When will the deposit be released?"), cashierRoleConfig),
    ],
  },
  "returns-after-sale": {
    id: "returns-after-sale",
    title: "退换货与售后",
    subtitle,
    accent: returnAccent,
    lessons: [
      lesson(1, "shopping_return_refund_process_zh", "退货和退款流程", "return", returnAccent, returnTile, makeReturnItems("退", "return", "我买错了尺寸。", "I bought the wrong size."), serviceRoleConfig),
      lesson(2, "shopping_return_exchange_reason_zh", "换货原因说明", "document", returnAccent, returnTile, makeReturnItems("换", "exchange", "颜色和我想的不一样。", "The color is different from what I expected."), serviceRoleConfig),
      lesson(3, "shopping_return_defective_item_zh", "处理有缺陷商品", "return", returnAccent, returnTile, makeReturnItems("退", "return", "它打开后就坏了。", "It was broken when I opened it."), serviceRoleConfig),
      lesson(4, "shopping_return_customer_service_refund_zh", "申请退款时与客服沟通", "service", returnAccent, returnTile, makeReturnItems("申请退款", "request a refund for", "订单还没有处理。", "The order hasn't been processed yet."), serviceRoleConfig),
      lesson(5, "shopping_return_extended_warranty_zh", "延长保修服务咨询", "shield", returnAccent, returnTile, makeReturnItems("咨询保修", "ask about the warranty for", "我想延长保修。", "I'd like to extend the warranty."), serviceRoleConfig),
      lesson(6, "shopping_return_no_receipt_zh", "退换没有小票的商品", "bill", returnAccent, returnTile, makeReturnItems("退换", "return or exchange", "我找不到小票了。", "I can't find the receipt."), serviceRoleConfig),
      lesson(7, "shopping_return_online_order_zh", "退换网购商品", "delivery", returnAccent, returnTile, makeReturnItems("退", "return", "网购尺码不合适。", "The online order doesn't fit."), serviceRoleConfig),
      lesson(8, "shopping_return_follow_refund_zh", "跟进退款进度", "service", returnAccent, returnTile, makeReturnItems("查询退款", "check the refund for", "退款还没到账。", "The refund hasn't arrived yet."), serviceRoleConfig),
      lesson(9, "shopping_return_wrong_item_zh", "处理错发商品", "return", returnAccent, returnTile, makeReturnItems("退换", "exchange", "寄来的商品不对。", "The item sent to me is wrong."), serviceRoleConfig),
      lesson(10, "shopping_return_cancel_unshipped_order_zh", "取消未发货订单", "document", returnAccent, returnTile, makeReturnItems("取消", "cancel", "订单还没有发货。", "The order hasn't shipped yet."), serviceRoleConfig),
      lesson(11, "shopping_return_warranty_coverage_zh", "咨询保修范围", "shield", returnAccent, returnTile, makeReturnItems("咨询", "ask about", "我想知道保修范围。", "I'd like to know what the warranty covers."), serviceRoleConfig),
      lesson(12, "shopping_return_repair_service_zh", "申请维修服务", "tools", returnAccent, returnTile, makeReturnItems("申请维修", "request repair for", "屏幕突然不亮了。", "The screen suddenly stopped turning on."), serviceRoleConfig),
      lesson(13, "shopping_return_escalate_support_zh", "处理售后客服升级", "service", returnAccent, returnTile, makeReturnItems("升级处理", "escalate", "我已经联系过两次。", "I've contacted support twice already."), serviceRoleConfig),
      lesson(14, "shopping_return_damaged_package_zh", "包装破损商品退回", "return", returnAccent, returnTile, makeReturnItems("退回", "return", "包裹送到时破了。", "The package arrived damaged."), serviceRoleConfig),
      lesson(15, "shopping_return_sale_item_zh", "退换促销商品", "sale", returnAccent, returnTile, makeReturnItems("退换", "return or exchange", "促销商品可以退吗？", "Can sale items be returned?"), serviceRoleConfig),
      lesson(16, "shopping_return_modify_request_zh", "修改或撤销退货申请", "document", returnAccent, returnTile, makeReturnItems("修改", "modify", "我想保留这个商品。", "I'd like to keep this item."), serviceRoleConfig),
    ],
  },
  "bargain-promotion": {
    id: "bargain-promotion",
    title: "讨价还价与促销",
    subtitle,
    accent: bargainAccent,
    lessons: [
      lesson(1, "shopping_bargain_flea_market_zh", "在跳蚤市场或二手店讨价还价", "sale", bargainAccent, bargainTile, makeBargainItems("这个二手包", "this used bag"), storeClerkRoleConfig),
      lesson(2, "shopping_bargain_coupon_discount_zh", "申请优惠券和折扣", "bill", bargainAccent, bargainTile, makeBargainItems("这件商品", "this item", "优惠券今天能用吗？", "Can I use the coupon today?"), storeClerkRoleConfig),
      lesson(3, "shopping_bargain_black_friday_zh", "黑色星期五与促销季购物", "bag", bargainAccent, bargainTile, makeBargainItems("这台电视", "this TV", "黑五价格还有效吗？", "Is the Black Friday price still valid?"), storeClerkRoleConfig),
      lesson(4, "shopping_bargain_compare_prices_zh", "比较不同商店价格", "chart", bargainAccent, bargainTile, makeBargainItems("这款咖啡机", "this coffee maker"), storeClerkRoleConfig),
      lesson(5, "shopping_bargain_membership_card_zh", "会员卡办理与使用", "document", bargainAccent, bargainTile, makeBargainItems("会员价格", "the member price", "办会员今天有优惠吗？", "Is there a sign-up discount today?"), storeClerkRoleConfig),
      lesson(6, "shopping_bargain_clearance_discount_zh", "询问清仓折扣", "sale", bargainAccent, bargainTile, makeBargainItems("这件清仓商品", "this clearance item", "清仓价还能再低吗？", "Can the clearance price be lower?"), storeClerkRoleConfig),
      lesson(7, "shopping_bargain_bundle_items_zh", "多件商品打包议价", "bag", bargainAccent, bargainTile, makeBargainItems("这些一起买", "these items together", "打包买有优惠吗？", "Is there a bundle discount?"), storeClerkRoleConfig),
      lesson(8, "shopping_bargain_student_employee_discount_zh", "使用学生或员工折扣", "document", bargainAccent, bargainTile, makeBargainItems("学生折扣", "the student discount", "学生证可以用吗？", "Can I use my student ID?"), storeClerkRoleConfig),
      lesson(9, "shopping_bargain_out_of_stock_promo_zh", "促销商品缺货处理", "store", bargainAccent, bargainTile, makeBargainItems("促销商品", "the sale item", "缺货能保留价格吗？", "Can you honor the sale price when it restocks?"), storeClerkRoleConfig),
      lesson(10, "shopping_bargain_price_protection_zh", "询问价格保护", "shield", bargainAccent, bargainTile, makeBargainItems("价格保护", "price protection", "降价后能补差价吗？", "Can I get the price difference back?"), storeClerkRoleConfig),
      lesson(11, "shopping_bargain_final_price_zh", "与店员确认最终价格", "wallet", bargainAccent, bargainTile, makeBargainItems("最终价格", "the final price", "请确认最终价。", "Please confirm the final price."), storeClerkRoleConfig),
      lesson(12, "shopping_bargain_decline_upsell_zh", "礼貌拒绝推销", "service", bargainAccent, bargainTile, makeBargainItems("额外服务", "the extra service", "谢谢，我暂时不需要。", "Thanks, I don't need it for now."), storeClerkRoleConfig),
    ],
  },
  "special-shopping": {
    id: "special-shopping",
    title: "特殊消费场景",
    subtitle,
    accent: specialAccent,
    lessons: [
      lesson(1, "shopping_special_furniture_home_zh", "购买家具和家居用品", "home", specialAccent, specialTile, makeSpecialItems("沙发和餐桌", "a sofa and dining table", "尺寸适合小公寓吗？", "Will the size fit a small apartment?"), storeClerkRoleConfig),
      lesson(2, "shopping_special_gas_station_zh", "在加油站加油与支付", "service", specialAccent, specialTile, makeSpecialItems("加油和付款", "gas and payment", "我想加满普通汽油。", "I'd like to fill up with regular gas."), cashierRoleConfig),
      lesson(3, "shopping_special_used_car_rental_zh", "购买二手车或租车", "car", specialAccent, specialTile, makeSpecialItems("二手车或租车", "a used car or rental car", "可以看车辆记录吗？", "May I see the vehicle history?"), storeClerkRoleConfig),
      lesson(4, "shopping_special_cancel_subscription_zh", "订阅服务（Netflix、Gym等）取消", "document", specialAccent, specialTile, makeSpecialItems("取消订阅服务", "canceling a subscription", "我想取消下个月续费。", "I'd like to cancel next month's renewal."), serviceRoleConfig),
      lesson(5, "shopping_special_bill_dispute_zh", "处理账单纠纷", "bill", specialAccent, specialTile, makeSpecialItems("账单纠纷", "a billing dispute", "这笔费用我没有授权。", "I didn't authorize this charge."), serviceRoleConfig),
      lesson(6, "shopping_special_duty_free_zh", "机场免税店购物", "airport", specialAccent, specialTile, makeSpecialItems("免税商品", "duty-free items", "我需要出示登机牌吗？", "Do I need to show my boarding pass?"), storeClerkRoleConfig),
      lesson(7, "shopping_special_luxury_goods_zh", "购买奢侈品", "bag", specialAccent, specialTile, makeSpecialItems("这款名牌包", "this designer bag", "可以查验真伪吗？", "Can you verify its authenticity?"), storeClerkRoleConfig),
      lesson(8, "shopping_special_custom_order_zh", "定制商品下单", "clipboard", specialAccent, specialTile, makeSpecialItems("定制商品", "a custom order", "我想刻上名字。", "I'd like to add a name engraving."), storeClerkRoleConfig),
      lesson(9, "shopping_special_large_delivery_zh", "大件商品配送预约", "delivery", specialAccent, specialTile, makeSpecialItems("大件配送", "large-item delivery", "周六可以送货吗？", "Can it be delivered on Saturday?"), serviceRoleConfig),
      lesson(10, "shopping_special_rental_equipment_zh", "租赁设备或工具", "tools", specialAccent, specialTile, makeSpecialItems("租赁工具", "renting tools", "我只需要租一天。", "I only need to rent it for one day."), storeClerkRoleConfig),
    ],
  },
  "daily-bill-management": {
    id: "daily-bill-management",
    title: "日常消费与账单管理",
    subtitle,
    accent: billAccent,
    lessons: [
      lesson(1, "shopping_bill_utility_payment_zh", "处理水电费、网费等账单支付", "bill", billAccent, billTile, makeBillItems("水电网账单", "my utility and internet bills"), serviceRoleConfig),
      lesson(2, "shopping_bill_correct_wrong_bill_zh", "质疑或纠正错误账单", "document", billAccent, billTile, makeBillItems("这张错误账单", "this incorrect bill"), serviceRoleConfig),
      lesson(3, "shopping_bill_cancel_duplicate_subscription_zh", "取消重复订阅服务", "wallet", billAccent, billTile, makeBillItems("重复订阅", "a duplicate subscription", "我被重复扣款了。", "I was charged twice."), serviceRoleConfig),
      lesson(4, "shopping_bill_installment_request_zh", "申请账单分期付款", "calendar", billAccent, billTile, makeBillItems("这笔账单", "this bill", "我想分期付款。", "I'd like to pay in installments."), serviceRoleConfig),
      lesson(5, "shopping_bill_compare_providers_zh", "比较不同运营商的价格和服务", "chart", billAccent, billTile, makeBillItems("运营商套餐", "provider plans", "我想比较价格。", "I'd like to compare prices."), serviceRoleConfig),
      lesson(6, "shopping_bill_phone_plan_zh", "查询手机套餐账单", "service", billAccent, billTile, makeBillItems("手机套餐账单", "my phone plan bill"), serviceRoleConfig),
      lesson(7, "shopping_bill_credit_card_autopay_zh", "处理信用卡自动扣款", "wallet", billAccent, billTile, makeBillItems("信用卡自动扣款", "my credit card auto-payment", "自动扣款日期不对。", "The auto-pay date is wrong."), serviceRoleConfig),
      lesson(8, "shopping_bill_setup_autopay_zh", "设置自动付款", "calendar", billAccent, billTile, makeBillItems("自动付款设置", "auto-pay setup", "我不想错过付款。", "I don't want to miss payments."), serviceRoleConfig),
      lesson(9, "shopping_bill_change_address_zh", "更改账单地址", "document", billAccent, billTile, makeBillItems("账单地址", "my billing address", "我刚搬家了。", "I just moved."), serviceRoleConfig),
      lesson(10, "shopping_bill_download_records_zh", "下载消费记录", "bill", billAccent, billTile, makeBillItems("消费记录", "my spending records", "我需要报税用。", "I need them for taxes."), serviceRoleConfig),
      lesson(11, "shopping_bill_fee_waiver_zh", "申请费用减免", "shield", billAccent, billTile, makeBillItems("这笔费用", "this fee", "可以帮我减免吗？", "Can you waive it for me?"), serviceRoleConfig),
      lesson(12, "shopping_bill_late_fee_zh", "询问逾期费用", "calendar", billAccent, billTile, makeBillItems("逾期费用", "the late fee", "我晚付了一天。", "I paid one day late."), serviceRoleConfig),
      lesson(13, "shopping_bill_rewards_points_zh", "查看会员积分", "chart", billAccent, billTile, makeBillItems("会员积分", "my reward points", "积分什么时候过期？", "When do the points expire?"), serviceRoleConfig),
      lesson(14, "shopping_bill_family_shared_zh", "管理家庭共享账单", "community", billAccent, billTile, makeBillItems("家庭共享账单", "my family shared bill", "我想添加家人。", "I'd like to add a family member."), serviceRoleConfig),
      lesson(15, "shopping_bill_budget_alerts_zh", "咨询预算和消费提醒", "chart", billAccent, billTile, makeBillItems("消费提醒", "spending alerts", "超预算时能提醒我吗？", "Can you alert me when I go over budget?"), serviceRoleConfig),
    ],
  },
};

export const shoppingSceneCourseDefinitions = Object.values(
  shoppingSceneCourseSections
).flatMap((section) => section.lessons);
