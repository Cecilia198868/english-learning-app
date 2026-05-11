"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import {
  deserializeTrainingItems,
  normalizeToShortTrainingItems,
  type TrainingItem,
  serializeTrainingItems,
} from "@/lib/training";
import { splitAudioToWavChunks } from "@/lib/audioSplit";

type Lesson = {
  id: string;
  title: string;
  txt_content: string;
  created_at: string;
  sourceAudioId?: string;
};

type GeneratedPair = {
  chinese: string;
  english: string;
  startTime?: number;
  endTime?: number;
};

type AudioItem = {
  id: string;
  title?: string;
  name?: string;
  fileName?: string;
  filename?: string;
  originalName?: string;
  label?: string;
  created_at: string;
};

type AudioDBRecord = {
  id: string;
  title?: string;
  name?: string;
  fileName?: string;
  filename?: string;
  originalName?: string;
  label?: string;
  type?: string;
  size?: number;
  created_at: string;
  createdAt?: string;
  file: Blob;
};

type AudioTrainingApiResponse = {
  title?: string;
  transcript?: string;
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
  }>;
  pairs?: GeneratedPair[];
  error?: string;
  message?: string;
};

function normalizeGeneratedPairs(pairs: GeneratedPair[]) {
  return normalizeToShortTrainingItems(
    pairs.map((pair) => ({
      zh: typeof pair.chinese === "string" ? pair.chinese.trim() : "",
      en: typeof pair.english === "string" ? pair.english.trim() : "",
      startTime:
        typeof pair.startTime === "number" ? pair.startTime : undefined,
      endTime: typeof pair.endTime === "number" ? pair.endTime : undefined,
    }))
  ).map((item) => ({
    chinese: item.zh,
    english: item.en,
    startTime: item.startTime,
    endTime: item.endTime,
  }));
}

type TranscribedSegment = {
  text: string;
  startTime: number;
  endTime: number;
};

type TranscribeChunkApiResponse = {
  chunkIndex?: number;
  startOffset?: number;
  transcript?: string;
  segments?: TranscribedSegment[];
  error?: string;
  message?: string;
};

type SegmentsToTrainingApiResponse = {
  title?: string;
  pairs?: GeneratedPair[];
  error?: string;
  message?: string;
};

type LocalLessonData = {
  lessons: Lesson[];
};

type SourceMode = "text-only" | "media-only" | "text-audio" | "featured";

const LESSONS_STORAGE_KEY = "english-app-lessons";
const DB_NAME = "english-learning-app-db";
const DB_VERSION = 1;
const AUDIO_STORE_NAME = "audios";
const LAST_STUDY_PROGRESS_KEY = "lastStudyProgress";
const MAX_AUDIO_SIZE_MB = 100;
const MAX_AUDIO_SIZE = MAX_AUDIO_SIZE_MB * 1024 * 1024;
const DIRECT_AUDIO_TO_TRAINING_MAX_BYTES = 4 * 1024 * 1024;
const AUDIO_CHUNK_SECONDS = 60;
const BANK_FEATURED_LESSONS = [
  { title: "新开银行账户", id: "bank_open_new_account_zh" },
  { title: "网上银行与手机 App 操作", id: "bank_online_banking_app_zh" },
  { title: "存款和取款", id: "bank_deposit_withdrawal_zh" },
  { title: "使用 ATM 机和自我服务", id: "bank_atm_self_service_zh" },
  { title: "银行客服电话口语课", id: "bank_customer_service_calls_zh" },
  { title: "银行费用查询与争议解决", id: "bank_fee_disputes_zh" },
  { title: "信用卡挂失口语课", id: "bank_credit_card_lost_report_zh" },
  { title: "信用卡报告欺诈收费口语课", id: "bank_credit_card_fraud_report_zh" },
  { title: "信用卡申请与审批流程", id: "bank_credit_card_application_zh" },
  { title: "国际电汇与海外付款", id: "bank_international_wire_zh" },
  { title: "货币兑换与国际汇款", id: "bank_currency_exchange_remittance_zh" },
  { title: "申请个人贷款", id: "bank_personal_loan_zh" },
  { title: "房屋抵押贷款咨询", id: "bank_mortgage_consultation_zh" },
  { title: "设立储蓄和定期存款账户", id: "bank_savings_fixed_deposit_zh" },
  { title: "投资产品与财富管理", id: "bank_wealth_management_zh" },
  { title: "退休储蓄与养老金计划", id: "bank_retirement_pension_zh" },
  { title: "关闭银行账户", id: "bank_close_account_zh" },
  { title: "银行保险箱", id: "bank_safe_deposit_box_zh" },
  { title: "银行提供的保险产品", id: "bank_insurance_products_zh" },
  { title: "银行事务口语课", id: "bank_general_banking_zh" },
] as const;

const GOVERNMENT_FEATURED_LESSONS = [
  { title: "申请社会安全号码（SSN）", id: "government_apply_ssn_zh" },
  { title: "办理州身份证或驾驶执照", id: "government_state_id_driver_license_zh" },
  { title: "申报入境并向 USCIS 注册", id: "government_uscis_registration_zh" },
  { title: "申请个人纳税识别号码（ITIN）", id: "government_apply_itin_zh" },
  { title: "使用美国邮政服务（USPS）", id: "government_usps_services_zh" },
  { title: "申请图书证", id: "government_library_card_zh" },
  { title: "注册兵役登记", id: "government_selective_service_zh" },
  { title: "接种疫苗并获取健康记录", id: "government_vaccine_records_zh" },
  { title: "申请食品券 / SNAP 福利", id: "government_snap_benefits_zh" },
  { title: "在 DMV 办理车辆注册登记", id: "government_dmv_vehicle_registration_zh" },
  { title: "申报护照遗失或被盗", id: "government_lost_stolen_passport_zh" },
  { title: "在移民局办理事务", id: "government_immigration_office_zh" },
  { title: "申请失业救济金", id: "government_unemployment_benefits_zh" },
  { title: "申请官方证明文件", id: "government_official_documents_zh" },
  { title: "应对警方或紧急救援服务", id: "government_police_emergency_services_zh" },
  { title: "注册选民资格", id: "government_voter_registration_zh" },
  { title: "申请公共住房", id: "government_public_housing_zh" },
  { title: "向政府机构提交投诉", id: "government_file_complaint_zh" },
  { title: "续签或延长签证身份有效期", id: "government_extend_visa_status_zh" },
  { title: "利用免费政府资源", id: "government_free_resources_zh" },
] as const;

const DRIVER_LICENSE_FEATURED_LESSONS = [
  { title: "了解美国驾驶法规", id: "driver_understand_us_traffic_laws_zh" },
  { title: "申领首张学习驾驶许可", id: "driver_apply_first_learner_permit_zh" },
  { title: "备考驾驶笔试", id: "driver_prepare_written_test_zh" },
  { title: "参加官方驾驶知识笔试", id: "driver_take_official_knowledge_test_zh" },
  { title: "准备并参加路考", id: "driver_prepare_take_road_test_zh" },
  { title: "领取驾驶执照", id: "driver_receive_driver_license_zh" },
  { title: "续期或补办遗失的驾驶执照", id: "driver_renew_replace_lost_license_zh" },
  { title: "更新执照上的住址或姓名信息", id: "driver_update_address_name_zh" },
  { title: "将境外驾驶执照转换为美国执照", id: "driver_convert_foreign_license_zh" },
  { title: "了解不同的执照类别及限制条件", id: "driver_license_classes_restrictions_zh" },
  { title: "在美国申领国际驾驶许可", id: "driver_apply_international_permit_zh" },
  { title: "处理执照被吊销或驾驶记录扣分问题", id: "driver_suspension_points_zh" },
  { title: "新手司机购买汽车保险", id: "driver_new_driver_car_insurance_zh" },
  { title: "办理车辆注册及申领车牌", id: "driver_vehicle_registration_plates_zh" },
  { title: "应对警方例行截停检查", id: "driver_police_traffic_stop_zh" },
  { title: "报告交通事故及提交保险理赔申请", id: "driver_accident_insurance_claim_zh" },
  { title: "缴纳交通罚单及罚款", id: "driver_pay_traffic_ticket_zh" },
  { title: "参加防御性驾驶或驾驶技能提升课程", id: "driver_defensive_driving_course_zh" },
  { title: "商业驾驶执照（CDL）申请基础知识", id: "driver_cdl_basics_zh" },
  { title: "跨州驾驶及执照转移规则", id: "driver_interstate_transfer_rules_zh" },
] as const;

type DashboardClientProps = {
  userEmail: string;
  userImage: string;
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getFileBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(responseText || "服务器返回了非 JSON 错误");
  }
}

function getDefaultLessonsData(): LocalLessonData {
  return {
    lessons: [],
  };
}

function loadLessonsData(): LocalLessonData {
  if (typeof window === "undefined") {
    return getDefaultLessonsData();
  }

  try {
    const raw = localStorage.getItem(LESSONS_STORAGE_KEY);
    if (!raw) return getDefaultLessonsData();

    const parsed = JSON.parse(raw);

    return {
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
    };
  } catch (error) {
    console.error("读取 TXT 数据失败:", error);
    return getDefaultLessonsData();
  }
}

function saveLessonsData(data: LocalLessonData) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("操作失败:", error);
    throw new Error("操作失败");
  }
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("操作失败"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error("打开 IndexedDB 失败:", request.error);
      reject(new Error("打开 IndexedDB 失败"));
    };
  });
}

async function getAllAudiosFromDB(): Promise<AudioItem[]> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const result = (request.result || []) as AudioDBRecord[];

      const items: AudioItem[] = result
        .map((item) => ({
          id: item.id,
          title: item.title,
          name: item.name,
          fileName: item.fileName,
          filename: item.filename,
          originalName: item.originalName,
          label: item.label,
          created_at: item.created_at,
        }))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      resolve(items);
    };

    request.onerror = () => {
      console.error("读取音频列表失败:", request.error);
      reject(new Error("读取音频列表失败，请查看控制台错误。"));
    };
  });
}

async function saveAudioToDB(record: AudioDBRecord): Promise<void> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve();

    request.onerror = () => {
      console.error("保存音频到 IndexedDB 失败:", {
        error: request.error,
        record,
      });
      reject(new Error("保存失败，请查看控制台错误。"));
    };
  });
}

async function getAudioBlobById(id: string): Promise<Blob | null> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as AudioDBRecord | undefined;
      resolve(result?.file || null);
    };

    request.onerror = () => {
      console.error("读取音频 Blob 失败:", request.error);
      reject(new Error("读取音频失败，请查看控制台错误。"));
    };
  });
}

async function getAudioRecordById(id: string): Promise<AudioDBRecord | null> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve((request.result as AudioDBRecord | undefined) || null);
    };

    request.onerror = () => {
      console.error("读取音频记录失败:", request.error);
      reject(new Error("读取音频记录失败，请查看控制台错误。"));
    };
  });
}

async function deleteAudioFromDB(id: string): Promise<void> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();

    request.onerror = () => {
      console.error("删除音频记录失败:", request.error);
      reject(new Error("删除音频失败，请查看控制台错误。"));
    };
  });
}

export default function DashboardClient({
  userEmail,
  userImage,
}: DashboardClientProps) {
  const router = useRouter();
  const [sourceMode, setSourceMode] = useState<SourceMode>("text-audio");
  const [showStartOptions, setShowStartOptions] = useState(false);
  const [expandedLearnSection, setExpandedLearnSection] = useState<
    "featured" | "my-courses" | null
  >(null);
  const [featuredCourseView, setFeaturedCourseView] = useState<
    "hub" | "scenes" | "levels"
  >("hub");
  const [featuredSceneSubView, setFeaturedSceneSubView] = useState<
    "root" | "finance-admin" | "bank" | "government" | "driver-license"
  >("root");
  const [expandedMyCourseSection, setExpandedMyCourseSection] = useState<
    "saved" | "builder" | null
  >(null);
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [txtContent, setTxtContent] = useState("");
  const [message, setMessage] = useState("");
  const [subtitleFileName, setSubtitleFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [isGeneratingTraining, setIsGeneratingTraining] = useState(false);
  const [trainingGenerateStatus, setTrainingGenerateStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [generatedItems, setGeneratedItems] = useState<TrainingItem[]>([]);
  const [generatedPairs, setGeneratedPairs] = useState<GeneratedPair[]>([]);
  const [generatedSourceAudioId, setGeneratedSourceAudioId] = useState<
    string | null
  >(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  const [audioTitle, setAudioTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioMessage, setAudioMessage] = useState("");
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState("");
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(
    null
  );
  const [userImageFailed, setUserImageFailed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);
  const startOptionsRef = useRef<HTMLElement | null>(null);
  const coursesSectionRef = useRef<HTMLDivElement | null>(null);
  const audioSectionRef = useRef<HTMLDivElement | null>(null);
  const showTextSection =
    sourceMode === "text-only" || sourceMode === "text-audio";
  const showAudioSection =
    sourceMode === "media-only" || sourceMode === "text-audio";
  const selectedAudio = useMemo(() => {
    return audios.find((item) => item.id === selectedAudioId) || null;
  }, [audios, selectedAudioId]);

  const fallbackAvatarLabel = (userEmail || "U").slice(0, 1).toUpperCase();

  function isFunctionInvocationTimeoutMessage(message: string) {
    return (
      message.includes("FUNCTION_INVOCATION_TIMEOUT") ||
      message.includes("The function invocation timed out") ||
      message.includes("timed out")
    );
  }

  function loadLessons() {
    const data = loadLessonsData();
    setLessons(data.lessons || []);

    if (data.lessons.length > 0) {
      setExpandedLessonId((prev) => prev ?? data.lessons[0].id);
    } else {
      setExpandedLessonId(null);
    }
  }

  async function loadAudios() {
    try {
      const data = await getAllAudiosFromDB();
      setAudios(data);

      if (data.length > 0) {
        setSelectedAudioId((prev) => prev ?? data[0].id);
      } else {
        setSelectedAudioId(null);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "读取音频列表失败";
      setAudioMessage(msg);
    }
  }

  function scrollToSection(ref: React.RefObject<HTMLElement | null>) {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function openSavedCoursesSection() {
    setShowStartOptions(true);
    setExpandedLearnSection("my-courses");
    setExpandedMyCourseSection("saved");
    scrollToSection(coursesSectionRef);
  }

  function openSavedAudioSection() {
    setShowStartOptions(true);
    setExpandedLearnSection("my-courses");
    setExpandedMyCourseSection("builder");
    scrollToSection(audioSectionRef);
  }

  function handleSaveLesson(successMessage = "保存成功，已跳转到课程列表。") {
    try {
      setMessage("");

      if (!title.trim() || !txtContent.trim()) {
        setMessage("操作失败");
        return;
      }

      const contentToSave =
        generatedPairs.length > 0
          ? serializeTrainingItems(
              normalizeGeneratedPairs(generatedPairs).map((pair) => ({
                zh: pair.chinese,
                en: pair.english,
                startTime: pair.startTime,
                endTime: pair.endTime,
              }))
            )
          : txtContent.trim();

      const newLesson: Lesson = {
        id: createId(),
        title: title.trim(),
        txt_content: contentToSave,
        created_at: new Date().toISOString(),
        sourceAudioId: generatedSourceAudioId || undefined,
      };

      console.log("[lesson-save]", {
        lessonId: newLesson.id,
        title: newLesson.title,
        sourceAudioId: newLesson.sourceAudioId ?? null,
      });

      const current = loadLessonsData();
      const nextLessons = [newLesson, ...(current.lessons || [])];

      saveLessonsData({ lessons: nextLessons });
      setLessons(nextLessons);
      setExpandedLessonId(newLesson.id);

      setTitle("");
      setRawText("");
      setTxtContent("");
      setGeneratedPairs([]);
      setGeneratedSourceAudioId(null);
      setSubtitleFileName("");
      setFileContent("");
      openSavedCoursesSection();
      setMessage(successMessage);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "操作失败";
      setMessage(msg);
    }
  }

  async function handleSubtitleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;
    setMessage("");

    if (!file) {
      setSubtitleFileName("");
      setFileContent("");
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (
      !lowerName.endsWith(".srt") &&
      !lowerName.endsWith(".txt") &&
      !lowerName.endsWith(".text") &&
      !lowerName.endsWith(".doc") &&
      !lowerName.endsWith(".docx") &&
      !lowerName.endsWith(".pdf")
    ) {
      setSubtitleFileName("");
      setFileContent("");
      setMessage("当前文件无法读取，请尝试 txt、docx 或可复制文本的 PDF。");
      event.target.value = "";
      return;
    }

    if (
      lowerName.endsWith(".doc") ||
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".pdf")
    ) {
      setSubtitleFileName(file.name);
      setFileContent("");
      setMessage("Word/PDF 解析功能下一步添加，请先使用 TXT 或 SRT。");
      return;
    }

    try {
      const rawText = await file.text();
      setSubtitleFileName(file.name);
      setFileContent(rawText);
      setRawText(rawText);
      setMessage(`已载入文件：${file.name}`);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "操作失败";
      setSubtitleFileName("");
      setFileContent("");
      setMessage(msg);
    }
  }

  async function handleGenerateTraining() {
    setMessage("");
    setTrainingGenerateStatus("idle");

    const inputText = rawText.trim() ? rawText : fileContent;
    if (!inputText.trim()) {
      setMessage("操作失败");
      setTrainingGenerateStatus("error");
      return;
    }

    setIsGeneratingTraining(true);

    try {
      const res = await fetch("/api/generate-training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });

      const json = (await res.json().catch(() => null)) as
        | TrainingItem[]
        | {
            error?: string;
            message?: string;
            raw?: string;
            result?: TrainingItem[];
            items?: TrainingItem[];
            data?: TrainingItem[];
          }
        | null;

      if (!res.ok) {
        throw new Error(
          !json || Array.isArray(json)
            ? "操作失败"
            : json.error || json.message || json.raw || "操作失败"
        );
      }

      let items: TrainingItem[] = [];

      if (Array.isArray(json)) {
        items = json;
      } else if (json && Array.isArray(json.result)) {
        items = json.result;
      } else if (json && Array.isArray(json.items)) {
        items = json.items;
      } else if (json && Array.isArray(json.data)) {
        items = json.data;
      }

      if (items.length === 0) {
        throw new Error("Invalid frontend response format");
      }

      setGeneratedPairs([]);
      setGeneratedSourceAudioId(null);
      const normalizedItems = normalizeToShortTrainingItems(items);
      setGeneratedItems(normalizedItems);
      setCurrentIndex(0);
      setShowEnglish(false);
      setTxtContent(serializeTrainingItems(normalizedItems));
      setMessage(`已生成 ${normalizedItems.length} 条内容`);
      setTrainingGenerateStatus("success");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "操作失败";
      setMessage(msg);
      setTrainingGenerateStatus("error");
    } finally {
      setIsGeneratingTraining(false);
    }
  }

  function handleDeleteLesson(id: string) {
    try {
      const ok = window.confirm("确定要删除这条课程吗？");
      if (!ok) return;

      const current = loadLessonsData();
      const nextLessons = current.lessons.filter((item) => item.id !== id);

      saveLessonsData({ lessons: nextLessons });
      setLessons(nextLessons);

      if (expandedLessonId === id) {
        setExpandedLessonId(nextLessons.length > 0 ? nextLessons[0].id : null);
      }

      setMessage("删除成功");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "操作失败";
      setMessage(msg);
    }
  }

  async function handleUploadAudio() {
    try {
      setAudioMessage("");

      if (!audioFile) {
        setAudioMessage("请先选择一个音频文件。");
        return;
      }

      if (audioFile.size > MAX_AUDIO_SIZE) {
        setAudioMessage(`文件太大，请选择小于 ${MAX_AUDIO_SIZE_MB}MB 的音频文件。`);
        return;
      }

      const allowedAudioTypes = new Set([
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/mp4",
        "audio/x-m4a",
        "audio/m4a",
        "audio/webm",
      ]);
      const lowerName = audioFile.name.toLowerCase();
      const hasAllowedExtension =
        lowerName.endsWith(".mp3") ||
        lowerName.endsWith(".wav") ||
        lowerName.endsWith(".m4a") ||
        lowerName.endsWith(".mp4") ||
        lowerName.endsWith(".webm");

      if (!hasAllowedExtension && !allowedAudioTypes.has(audioFile.type)) {
        setAudioMessage("请选择 mp3、wav、m4a、mp4 或 webm 音频文件。");
        return;
      }

      const derivedTitle = audioTitle.trim() || getFileBaseName(audioFile.name) || "未命名音频";

      const newAudio: AudioDBRecord = {
        id: createId(),
        title: derivedTitle,
        name: audioFile.name,
        fileName: audioFile.name,
        filename: audioFile.name,
        originalName: audioFile.name,
        label: derivedTitle,
        type: audioFile.type || "audio/mpeg",
        size: audioFile.size,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        file: audioFile,
      };

      await saveAudioToDB(newAudio);
      const nextAudios = await getAllAudiosFromDB();

      setAudios(nextAudios);
      setSelectedAudioId(newAudio.id);
      setAudioTitle("");
      setAudioFile(null);
      openSavedAudioSection();
      setAudioMessage("保存成功");

      const fileInput = document.getElementById(
        "audio-file-input"
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("保存音频资料失败:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "保存失败，请查看控制台错误。";
      setAudioMessage(msg);
    }
  }

  async function handleDeleteAudio(audio: AudioItem) {
    try {
      const ok = window.confirm("确定要删除这条音频吗？");
      if (!ok) return;

      await deleteAudioFromDB(audio.id);
      const nextAudios = await getAllAudiosFromDB();

      setAudios(nextAudios);

      if (selectedAudioId === audio.id) {
        setSelectedAudioId(nextAudios.length > 0 ? nextAudios[0].id : null);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }

      setAudioMessage("删除成功");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "操作失败";
      setAudioMessage(msg);
    }
  }

  function applyGeneratedAudioTraining(
    audio: AudioItem,
    pairs: GeneratedPair[],
    transcript: string,
    generatedTitle?: string
  ) {
    const normalizedPairs = normalizeGeneratedPairs(pairs);

    if (normalizedPairs.length === 0) {
      throw new Error("操作失败");
    }

    const items: TrainingItem[] = normalizedPairs.map((pair) => ({
      zh: pair.chinese,
      en: pair.english,
      startTime: pair.startTime,
      endTime: pair.endTime,
    }));
    const generatedText = normalizedPairs
      .map((pair) => `${pair.chinese}\n${pair.english}`)
      .join("\n\n");
    const nextTitle =
      (typeof generatedTitle === "string" && generatedTitle.trim()) ||
      audio.title ||
      audio.name ||
      audio.fileName ||
      "音频生成课程";

    setTitle(nextTitle);
    setRawText(generatedText);
    setTxtContent(serializeTrainingItems(items));
    setGeneratedPairs(normalizedPairs);
    setGeneratedSourceAudioId(audio.id);
    setGeneratedItems(items);
    setCurrentIndex(0);
    setShowEnglish(false);
    setSourceMode("text-audio");
    setFileContent(transcript);
    setSubtitleFileName("");
    setMessage("训练内容生成成功，请检查后点击保存 TXT。");
  }

  async function getStoredAudioBlob(audio: AudioItem) {
    const audioRecord = await getAudioRecordById(audio.id);
    console.log("已保存音频对象:", audioRecord ?? audio);

    const blobSource =
      audioRecord?.file ||
      (
        audioRecord as (AudioDBRecord & {
          blob?: Blob;
          audioBlob?: Blob;
          audioData?: Blob;
          data?: Blob;
        }) | null
      )?.blob ||
      (
        audioRecord as (AudioDBRecord & {
          blob?: Blob;
          audioBlob?: Blob;
          audioData?: Blob;
          data?: Blob;
        }) | null
      )?.audioBlob ||
      (
        audioRecord as (AudioDBRecord & {
          blob?: Blob;
          audioBlob?: Blob;
          audioData?: Blob;
          data?: Blob;
        }) | null
      )?.audioData ||
      (
        audioRecord as (AudioDBRecord & {
          blob?: Blob;
          audioBlob?: Blob;
          audioData?: Blob;
          data?: Blob;
        }) | null
      )?.data ||
      (await getAudioBlobById(audio.id));

    if (!blobSource) {
      console.log("读取不到音频 blob:", audioRecord ?? audio);
      throw new Error("操作失败");
    }

    const audioTitleForApi =
      audio.title ||
      audio.name ||
      audio.fileName ||
      audio.filename ||
      audio.originalName ||
      audio.label ||
      "音频生成课程";
    const fileName =
      audioRecord?.fileName ||
      audioRecord?.filename ||
      audioRecord?.name ||
      audioRecord?.originalName ||
      `${audioTitleForApi}.mp3`;

    return {
      audioTitleForApi,
      fileName,
      uploadFile:
        blobSource instanceof File
          ? blobSource
          : new File([blobSource], fileName, {
              type: blobSource.type || "audio/mpeg",
            }),
    };
  }

  async function handleGenerateAudioTraining(audio: AudioItem) {
    try {
      setGeneratingAudioId(audio.id);
      setAudioMessage("");

      const { audioTitleForApi, fileName, uploadFile } =
        await getStoredAudioBlob(audio);

      const shouldUseDirectAudioRoute =
        uploadFile.size <= DIRECT_AUDIO_TO_TRAINING_MAX_BYTES &&
        typeof window !== "undefined" &&
        window.location.hostname === "localhost";

      if (shouldUseDirectAudioRoute) {
        setMessage("正在识别音频并生成训练内容，请稍候...");

        const formData = new FormData();
        formData.append("audio", uploadFile);
        formData.append("title", audioTitleForApi);

        const response = await fetch("/api/audio-to-training", {
          method: "POST",
          body: formData,
        });
        const result = await parseJsonResponse<AudioTrainingApiResponse>(response);

        if (!response.ok) {
          const errorMessage =
            result.error || result.message || "生成失败";
          if (
            response.status === 413 ||
            errorMessage.includes("Request Entity Too Large")
          ) {
            throw new Error(
              "音频文件太大，请先用 1–3 分钟短音频测试。长音频需要以后做分段转写。"
            );
          }

          throw new Error(errorMessage);
        }

        const pairs = Array.isArray(result.pairs) ? result.pairs : [];
        applyGeneratedAudioTraining(
          audio,
          pairs,
          typeof result.transcript === "string" ? result.transcript : "",
          result.title
        );
        return;
      }

      if (
        typeof window !== "undefined" &&
        window.location.hostname !== "localhost"
      ) {
        setMessage("线上环境将自动分段处理音频，请稍候...");
      }

      setMessage("正在切分音频...");
      const chunks = await splitAudioToWavChunks(uploadFile, AUDIO_CHUNK_SECONDS);
      console.log("分段数量:", chunks.length);
      console.log("chunk durations:", chunks.map((chunk) => chunk.duration));

      if (chunks.length === 0) {
        throw new Error("操作失败");
      }

      const allSegments: TranscribedSegment[] = [];
      const transcriptParts: string[] = [];

      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        setMessage(`正在转写第 ${i + 1} / ${chunks.length} 段...`);

        const chunkFormData = new FormData();
        chunkFormData.append(
          "audio",
          new File([chunk.blob], `${fileName}-chunk-${chunk.index + 1}.wav`, {
            type: "audio/wav",
          })
        );
        chunkFormData.append("chunkIndex", String(chunk.index));
        chunkFormData.append("startOffset", String(chunk.startOffset));

        const response = await fetch("/api/transcribe-chunk", {
          method: "POST",
          body: chunkFormData,
        });
        const result =
          await parseJsonResponse<TranscribeChunkApiResponse>(response);

        if (!response.ok) {
          throw new Error(
            result.error ||
              result.message ||
              `第 ${i + 1} 段转写失败`
          );
        }

        const chunkSegments = Array.isArray(result.segments)
          ? result.segments.filter(
              (segment) =>
                segment &&
                typeof segment.text === "string" &&
                typeof segment.startTime === "number" &&
                typeof segment.endTime === "number"
            )
          : [];

        if (chunkSegments.length === 0 && !(result.transcript || "").trim()) {
          throw new Error(`第 ${i + 1} 段转写失败`);
        }

        allSegments.push(...chunkSegments);
        if (typeof result.transcript === "string" && result.transcript.trim()) {
          transcriptParts.push(result.transcript.trim());
        }
      }

      setMessage("正在整理训练内容...");
      const response = await fetch("/api/segments-to-training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: audioTitleForApi,
          segments: allSegments,
        }),
      });
      const result =
        await parseJsonResponse<SegmentsToTrainingApiResponse>(response);

      if (!response.ok) {
        throw new Error(result.error || result.message || "生成失败");
      }

      const pairs = Array.isArray(result.pairs) ? result.pairs : [];
      applyGeneratedAudioTraining(
        audio,
        pairs,
        transcriptParts.join(" ").trim(),
        result.title
      );
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "操作失败";
      const msg = isFunctionInvocationTimeoutMessage(rawMessage)
        ? "音频太长，线上处理超时。请缩短音频，或使用分段上传。建议每段不超过 3 分钟。"
        : rawMessage;
      setMessage(msg);
      setAudioMessage(msg);
    } finally {
      setGeneratingAudioId(null);
    }
  }

  function handleSaveAudioAsLesson(audio: AudioItem) {
    try {
      setMessage("");

      if (generatedSourceAudioId !== audio.id || !title.trim() || !txtContent.trim()) {
        setMessage("请先为这条音频生成训练内容，再点击保存。");
        return;
      }

      handleSaveLesson("保存成功，已跳转到课程列表。");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "操作失败";
      setMessage(msg);
    }
  }

  function toggleLesson(id: string) {
    setExpandedLessonId((prev) => (prev === id ? null : id));
  }

  function handleStopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  function setPlaybackRate(rate: number) {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }

  function handleContinueLearning() {
    const lastStudyRaw = localStorage.getItem(LAST_STUDY_PROGRESS_KEY);
    let lastStudyCourseId = "";

    if (lastStudyRaw) {
      try {
        const parsed = JSON.parse(lastStudyRaw) as {
          courseId?: unknown;
          sentenceIndex?: unknown;
        };

        if (typeof parsed.courseId === "string") {
          lastStudyCourseId = parsed.courseId;
        }
      } catch (error) {
        console.error("读取最近学习位置失败:", error);
      }
    }

    const targetLesson =
      (lastStudyCourseId
        ? lessons.find((lesson) => lesson.id === lastStudyCourseId)
        : null) ||
      null;

    if (targetLesson) {
      localStorage.setItem(
        "currentLessonTitle",
        targetLesson.title || "未命名课程"
      );
      router.push(`/study/${targetLesson.id}`);
      return;
    }

    handleOpenStartLearning();
    setExpandedLearnSection("my-courses");
    setExpandedMyCourseSection("saved");
    setMessage("还没有保存的学习位置，请先选择一门课程。");
  }

  function handleOpenStartLearning() {
    setShowStartOptions(true);
    setExpandedLearnSection((current) => current ?? "my-courses");
    setExpandedMyCourseSection((current) => current ?? "saved");
    window.setTimeout(() => {
      startOptionsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function handleBackFromStartOptions() {
    setShowStartOptions(false);
    setExpandedLearnSection(null);
    setExpandedMyCourseSection(null);
    setFeaturedCourseView("hub");
    setFeaturedSceneSubView("root");
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

  function handleSelectLearnSection(section: "featured" | "my-courses") {
    setShowStartOptions(true);
    setExpandedLearnSection((prev) => (prev === section ? null : section));

    if (section === "featured") {
      setFeaturedCourseView("hub");
      setFeaturedSceneSubView("root");
    }

    if (section === "my-courses") {
      setExpandedMyCourseSection((prev) => prev ?? "saved");
    }
  }

  function handleStaticCourseClick() {
    setMessage("课程建设中");
  }

  function openBankDirectory(scrollIntoView = false) {
    setShowStartOptions(true);
    setExpandedLearnSection("featured");
    setExpandedMyCourseSection(null);
    setFeaturedCourseView("scenes");
    setFeaturedSceneSubView("bank");

    if (scrollIntoView) {
      scrollToSection(startOptionsRef);
    }
  }

  function openGovernmentDirectory(scrollIntoView = false) {
    setShowStartOptions(true);
    setExpandedLearnSection("featured");
    setExpandedMyCourseSection(null);
    setFeaturedCourseView("scenes");
    setFeaturedSceneSubView("government");

    if (scrollIntoView) {
      scrollToSection(startOptionsRef);
    }
  }

  function openDriverLicenseDirectory(scrollIntoView = false) {
    setShowStartOptions(true);
    setExpandedLearnSection("featured");
    setExpandedMyCourseSection(null);
    setFeaturedCourseView("scenes");
    setFeaturedSceneSubView("driver-license");

    if (scrollIntoView) {
      scrollToSection(startOptionsRef);
    }
  }

  function openFeaturedLesson(courseId: string, title: string) {
    localStorage.setItem("currentLessonTitle", title);
    router.push(`/study/${courseId}`);
  }

  useEffect(() => {
    loadLessons();
    loadAudios();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("featured") === "bank") {
      openBankDirectory(true);
      return;
    }

    if (searchParams.get("featured") === "government") {
      openGovernmentDirectory(true);
      return;
    }

    if (searchParams.get("featured") === "driver-license") {
      openDriverLicenseDirectory(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedAudioUrl() {
      if (!selectedAudioId) {
        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
          currentObjectUrlRef.current = null;
        }
        setSelectedAudioUrl("");
        return;
      }

      try {
        setLoadingAudio(true);
        const blob = await getAudioBlobById(selectedAudioId);

        if (cancelled) return;

        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
          currentObjectUrlRef.current = null;
        }

        if (!blob) {
          setSelectedAudioUrl("");
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        currentObjectUrlRef.current = objectUrl;
        setSelectedAudioUrl(objectUrl);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setSelectedAudioUrl("");
          setAudioMessage("操作失败");
        }
      } finally {
        if (!cancelled) {
          setLoadingAudio(false);
        }
      }
    }

    loadSelectedAudioUrl();

    return () => {
      cancelled = true;
    };
  }, [selectedAudioId]);

  useEffect(() => {
    return () => {
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060d] font-[var(--font-sora)] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#070814_0%,#04050b_45%,#060713_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(104,76,255,0.18),transparent_26%),radial-gradient(circle_at_bottom,rgba(31,106,255,0.12),transparent_28%)]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto max-w-[430px] px-4 py-6 sm:px-5">
        <div className="mb-7 rounded-[24px] border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(14,15,31,0.94),rgba(10,11,24,0.84))] px-4 py-4 shadow-[0_0_0_1px_rgba(196,84,255,0.08),0_18px_40px_rgba(0,0,0,0.45),0_0_36px_rgba(162,78,255,0.18)] backdrop-blur-2xl">
          <div className="flex min-h-[48px] items-center gap-3">
            {userImage && !userImageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt={userEmail || "user"}
                onError={() => setUserImageFailed(true)}
                className="h-12 w-12 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-fuchsia-300/30 bg-[radial-gradient(circle_at_30%_30%,#7eb7ff_0%,#7a70ff_32%,#923bff_68%,#34114f_100%)] text-sm font-semibold text-white shadow-[0_0_20px_rgba(132,92,255,0.45)]">
                {fallbackAvatarLabel}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.96rem] font-semibold text-white [text-shadow:0_0_12px_rgba(255,255,255,0.16)]">
                {userEmail}
              </div>
              <div className="mt-1 text-xs font-semibold tracking-[0.12em] text-emerald-300">
                已登录
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>

        <div className="space-y-5">
          <Link
            href="/speak-english"
            className="group block w-full cursor-pointer rounded-[28px] border border-fuchsia-400/55 bg-[linear-gradient(180deg,rgba(43,11,63,0.96),rgba(16,8,37,0.92))] px-5 py-6 text-left shadow-[0_0_0_1px_rgba(255,82,234,0.18),0_14px_32px_rgba(0,0,0,0.38),0_0_30px_rgba(255,62,224,0.20)] transition duration-300 hover:scale-[1.015] hover:shadow-[0_0_0_1px_rgba(255,82,234,0.24),0_18px_40px_rgba(0,0,0,0.44),0_0_40px_rgba(255,62,224,0.28)] active:scale-[0.995]"
          >
            <div className="flex min-h-[64px] items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-fuchsia-300/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.55rem] shadow-[0_0_20px_rgba(255,69,227,0.35)]">
                  💬
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[1.9rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_20px_rgba(255,109,236,0.40)]">
                  我要说英语
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-fuchsia-300/55 bg-fuchsia-400/8 text-[1.8rem] text-white shadow-[0_0_18px_rgba(255,62,224,0.35)] transition group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(255,62,224,0.5)]">
                  ›
              </div>
            </div>
          </Link>

          <button
            onClick={handleOpenStartLearning}
            className="group w-full cursor-pointer rounded-[28px] border border-blue-400/60 bg-[linear-gradient(180deg,rgba(10,33,82,0.96),rgba(7,15,45,0.94))] px-5 py-6 text-left shadow-[0_0_0_1px_rgba(80,140,255,0.16),0_14px_32px_rgba(0,0,0,0.38),0_0_30px_rgba(52,126,255,0.18)] transition duration-300 hover:scale-[1.015] hover:shadow-[0_0_0_1px_rgba(80,140,255,0.24),0_18px_40px_rgba(0,0,0,0.44),0_0_40px_rgba(52,126,255,0.26)] active:scale-[0.995]"
          >
            <div className="flex min-h-[64px] items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-blue-300/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.55rem] shadow-[0_0_20px_rgba(52,126,255,0.30)]">
                  📘
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[1.9rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_20px_rgba(105,176,255,0.34)]">
                  课程学习
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-300/55 bg-blue-400/8 text-[1.8rem] text-white shadow-[0_0_18px_rgba(52,126,255,0.30)] transition group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(52,126,255,0.44)]">
                  ›
              </div>
            </div>
          </button>

          <Link
            href="/vocabulary"
            className="group block w-full cursor-pointer rounded-[28px] border border-violet-400/60 bg-[linear-gradient(180deg,rgba(36,12,70,0.96),rgba(14,9,40,0.94))] px-5 py-6 text-left shadow-[0_0_0_1px_rgba(172,87,255,0.16),0_14px_32px_rgba(0,0,0,0.38),0_0_30px_rgba(173,76,255,0.20)] transition duration-300 hover:scale-[1.015] hover:shadow-[0_0_0_1px_rgba(172,87,255,0.24),0_18px_40px_rgba(0,0,0,0.44),0_0_40px_rgba(173,76,255,0.28)] active:scale-[0.995]"
          >
            <div className="flex min-h-[64px] items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-violet-300/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.55rem] shadow-[0_0_20px_rgba(173,76,255,0.32)]">
                  🎯
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[1.9rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_20px_rgba(204,131,255,0.36)]">
                  单词闯关
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-300/55 bg-violet-400/8 text-[1.8rem] text-white shadow-[0_0_18px_rgba(173,76,255,0.32)] transition group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(173,76,255,0.46)]">
                  ›
              </div>
            </div>
          </Link>
        </div>

        {message ? (
          <div className="mt-4 rounded-[22px] border border-blue-400/18 bg-blue-500/8 px-4 py-3 text-sm text-blue-100/92 backdrop-blur-xl">
            {message}
          </div>
        ) : null}

        {showStartOptions ? (
          <section ref={startOptionsRef} className="mt-4 space-y-4 pb-2">
            <div className="app-glass-card px-4 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBackFromStartOptions}
                  className="neon-button shrink-0 rounded-[18px] border border-fuchsia-300/28 bg-[linear-gradient(180deg,rgba(83,58,145,0.44),rgba(56,37,99,0.34))] px-4 py-3 text-sm text-white/92 shadow-[0_0_0_1px_rgba(188,92,255,0.10),0_0_16px_rgba(139,92,246,0.18)]"
                >
                  返回上一页
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <div className="text-[1.2rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_14px_rgba(255,255,255,0.14)]">
                    课程学习
                  </div>
                </div>
                <div className="h-11 w-[88px] shrink-0" />
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleContinueLearning}
                className="group block w-full rounded-[28px] border border-emerald-400/55 bg-[linear-gradient(180deg,rgba(6,48,44,0.96),rgba(7,24,31,0.94))] px-5 py-5 text-left shadow-[0_0_0_1px_rgba(0,255,195,0.14),0_14px_32px_rgba(0,0,0,0.38),0_0_24px_rgba(0,255,195,0.15)] transition duration-300 hover:scale-[1.012] hover:shadow-[0_0_0_1px_rgba(0,255,195,0.18),0_18px_40px_rgba(0,0,0,0.42),0_0_30px_rgba(0,255,195,0.20)]"
              >
                <div className="flex min-h-[72px] items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-emerald-300/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.5rem] shadow-[0_0_18px_rgba(0,255,195,0.22)]">
                    ⚡
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_16px_rgba(85,255,208,0.24)]">
                      继续上次学习
                    </div>
                    <div className="mt-1 text-[0.95rem] leading-6 text-white/72">
                      直接回到最近保存的一节课程
                    </div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-400/8 text-[1.8rem] text-white shadow-[0_0_16px_rgba(0,255,195,0.22)] transition group-hover:scale-105">
                    ›
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSelectLearnSection("featured")}
                className="group block w-full rounded-[28px] border border-blue-400/60 bg-[linear-gradient(180deg,rgba(10,33,82,0.96),rgba(7,15,45,0.94))] px-5 py-5 text-left shadow-[0_0_0_1px_rgba(80,140,255,0.16),0_14px_32px_rgba(0,0,0,0.38),0_0_24px_rgba(52,126,255,0.15)] transition duration-300 hover:scale-[1.012] hover:shadow-[0_0_0_1px_rgba(80,140,255,0.20),0_18px_40px_rgba(0,0,0,0.42),0_0_30px_rgba(52,126,255,0.22)]"
              >
                <div className="flex min-h-[72px] items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-blue-300/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.5rem] shadow-[0_0_18px_rgba(52,126,255,0.24)]">
                    ⭐
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_16px_rgba(105,176,255,0.28)]">
                      精选课程
                    </div>
                    <div className="mt-1 text-[0.95rem] leading-6 text-white/72">
                      实用场景口语与分级口语学习
                    </div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-300/45 bg-blue-400/8 text-[1.8rem] text-white shadow-[0_0_16px_rgba(52,126,255,0.24)] transition group-hover:scale-105">
                    ›
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSelectLearnSection("my-courses")}
                className="group block w-full rounded-[28px] border border-emerald-400/55 bg-[linear-gradient(180deg,rgba(6,48,44,0.96),rgba(7,24,31,0.94))] px-5 py-5 text-left shadow-[0_0_0_1px_rgba(0,255,195,0.14),0_14px_32px_rgba(0,0,0,0.38),0_0_24px_rgba(0,255,195,0.15)] transition duration-300 hover:scale-[1.012] hover:shadow-[0_0_0_1px_rgba(0,255,195,0.18),0_18px_40px_rgba(0,0,0,0.42),0_0_30px_rgba(0,255,195,0.20)]"
              >
                <div className="flex min-h-[72px] items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-emerald-300/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.5rem] shadow-[0_0_18px_rgba(0,255,195,0.22)]">
                    📁
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_16px_rgba(85,255,208,0.24)]">
                      我的课程
                    </div>
                    <div className="mt-1 text-[0.95rem] leading-6 text-white/72">
                      查看已有课程，或制作自己的课程
                    </div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-400/8 text-[1.8rem] text-white shadow-[0_0_16px_rgba(0,255,195,0.22)] transition group-hover:scale-105">
                    ›
                  </div>
                </div>
              </button>
            </div>

            {expandedLearnSection === "featured" ? (
              <div className="space-y-4">
                <div className="app-glass-card px-4 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (featuredCourseView === "hub") {
                          setExpandedLearnSection(null);
                          return;
                        }
                        if (
                          featuredCourseView === "scenes" &&
                          ["bank", "government", "driver-license"].includes(featuredSceneSubView)
                        ) {
                          setFeaturedSceneSubView("finance-admin");
                          return;
                        }
                        if (featuredCourseView === "scenes" && featuredSceneSubView !== "root") {
                          setFeaturedSceneSubView("root");
                          return;
                        }
                        setFeaturedCourseView("hub");
                      }}
                      className="neon-button shrink-0 rounded-[18px] border border-fuchsia-300/28 bg-[linear-gradient(180deg,rgba(83,58,145,0.44),rgba(56,37,99,0.34))] px-4 py-3 text-sm text-white/92 shadow-[0_0_0_1px_rgba(188,92,255,0.10),0_0_16px_rgba(139,92,246,0.18)]"
                    >
                      返回上一页
                    </button>
                    <div className="min-w-0 flex-1 text-center">
                      <div className="text-[1.2rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_14px_rgba(255,255,255,0.14)]">
                        精选课程
                      </div>
                    </div>
                    <div className="h-11 w-[108px] shrink-0" />
                  </div>
                </div>

                {featuredCourseView === "hub" ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setFeaturedCourseView("scenes")}
                      className="group block w-full rounded-[28px] border border-cyan-400/58 bg-[linear-gradient(180deg,rgba(8,43,63,0.96),rgba(6,25,40,0.94))] px-5 py-5 text-left shadow-[0_0_0_1px_rgba(62,215,255,0.14),0_14px_32px_rgba(0,0,0,0.38),0_0_24px_rgba(44,199,255,0.16)] transition duration-300 hover:scale-[1.012] hover:shadow-[0_0_0_1px_rgba(62,215,255,0.20),0_18px_40px_rgba(0,0,0,0.42),0_0_30px_rgba(44,199,255,0.22)]"
                    >
                      <div className="flex min-h-[72px] items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-cyan-300/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.5rem] shadow-[0_0_18px_rgba(44,199,255,0.22)]">
                          🏦
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_16px_rgba(108,235,255,0.24)]">
                            实用场景口语
                          </div>
                          <div className="mt-1 text-[0.95rem] leading-6 text-white/72">
                            银行、面试、政府、餐厅、电话、旅游等
                          </div>
                        </div>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-400/8 text-[1.8rem] text-white shadow-[0_0_16px_rgba(44,199,255,0.22)] transition group-hover:scale-105">
                          ›
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setFeaturedCourseView("levels")}
                      className="group block w-full rounded-[28px] border border-violet-400/60 bg-[linear-gradient(180deg,rgba(36,12,70,0.96),rgba(14,9,40,0.94))] px-5 py-5 text-left shadow-[0_0_0_1px_rgba(172,87,255,0.16),0_14px_32px_rgba(0,0,0,0.38),0_0_24px_rgba(173,76,255,0.16)] transition duration-300 hover:scale-[1.012] hover:shadow-[0_0_0_1px_rgba(172,87,255,0.20),0_18px_40px_rgba(0,0,0,0.42),0_0_30px_rgba(173,76,255,0.22)]"
                    >
                      <div className="flex min-h-[72px] items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-violet-300/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.5rem] shadow-[0_0_18px_rgba(173,76,255,0.22)]">
                          🎓
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_16px_rgba(204,131,255,0.24)]">
                            分级口语学习
                          </div>
                          <div className="mt-1 text-[0.95rem] leading-6 text-white/72">
                            成人初级、中级、高级、小学生、初中生、高中生
                          </div>
                        </div>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-300/45 bg-violet-400/8 text-[1.8rem] text-white shadow-[0_0_16px_rgba(173,76,255,0.22)] transition group-hover:scale-105">
                          ›
                        </div>
                      </div>
                    </button>
                  </div>
                ) : null}

                {featuredCourseView === "scenes" ? (
                  <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                    {featuredSceneSubView === "root" ? (
                      <div className="grid gap-3">
                        {[
                        {
                          title: "金融与行政事务",
                          description: "银行、政府、保险、签证等",
                          icon: "🏛️",
                          className:
                            "border-cyan-300/20 hover:border-cyan-300/35 hover:bg-cyan-400/6",
                          arrowClass:
                            "border-cyan-300/35 bg-cyan-400/8",
                        },
                        {
                          title: "购物与消费",
                          description: "超市、商场、退货、付款等",
                          icon: "🛍️",
                          className:
                            "border-sky-300/20 hover:border-sky-300/35 hover:bg-sky-400/6",
                          arrowClass:
                            "border-sky-300/35 bg-sky-400/8",
                        },
                        {
                          title: "餐饮与外卖",
                          description: "点餐、打包、付款、口味要求等",
                          icon: "🍽️",
                          className:
                            "border-emerald-300/20 hover:border-emerald-300/35 hover:bg-emerald-400/6",
                          arrowClass:
                            "border-emerald-300/35 bg-emerald-400/8",
                        },
                        {
                          title: "交通与出行",
                          description: "打车、公交、机场、导航等",
                          icon: "🚕",
                          className:
                            "border-blue-300/20 hover:border-blue-300/35 hover:bg-blue-400/6",
                          arrowClass:
                            "border-blue-300/35 bg-blue-400/8",
                        },
                        {
                          title: "住宿与家居",
                          description: "租房、酒店、家具、水电问题等",
                          icon: "🏠",
                          className:
                            "border-violet-300/20 hover:border-violet-300/35 hover:bg-violet-400/6",
                          arrowClass:
                            "border-violet-300/35 bg-violet-400/8",
                        },
                        {
                          title: "健康与医疗",
                          description: "医院、药店、症状、预约等",
                          icon: "💊",
                          className:
                            "border-rose-300/20 hover:border-rose-300/35 hover:bg-rose-400/6",
                          arrowClass:
                            "border-rose-300/35 bg-rose-400/8",
                        },
                        {
                          title: "服务与维修",
                          description: "维修、客服、网络、安装等",
                          icon: "🛠️",
                          className:
                            "border-amber-300/20 hover:border-amber-300/35 hover:bg-amber-400/6",
                          arrowClass:
                            "border-amber-300/35 bg-amber-400/8",
                        },
                        {
                          title: "教育、工作与社交生活",
                          description: "学校、面试、同事、聚会等",
                          icon: "🎓",
                          className:
                            "border-fuchsia-300/20 hover:border-fuchsia-300/35 hover:bg-fuchsia-400/6",
                          arrowClass:
                            "border-fuchsia-300/35 bg-fuchsia-400/8",
                        },
                      ].map((item) => (
                          <button
                            key={item.title}
                            onClick={() => {
                              if (item.title === "金融与行政事务") {
                                setFeaturedSceneSubView("finance-admin");
                                return;
                              }
                              handleStaticCourseClick();
                            }}
                            className={`group w-full rounded-[24px] border bg-[linear-gradient(180deg,rgba(11,16,32,0.96),rgba(17,24,39,0.88))] px-4 py-4 text-left shadow-[0_12px_26px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 ${item.className}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.35rem]">
                                {item.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[1.08rem] font-bold text-white">
                                  {item.title}
                                </div>
                                <div className="mt-1 text-sm leading-6 text-white/70">
                                  {item.description}
                                </div>
                              </div>
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[1.4rem] text-white ${item.arrowClass}`}
                              >
                                ›
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {featuredSceneSubView === "finance-admin" ? (
                      <div className="space-y-3">
                        <div className="px-1 pb-1 text-center text-sm font-medium tracking-[0.08em] text-white/52">
                          金融与行政事务
                        </div>
                        {[
                          { title: "银行", icon: "🏦" },
                          { title: "政府服务", icon: "🏛️" },
                          { title: "驾照", icon: "🚗" },
                          { title: "身份证", icon: "🪪" },
                          { title: "保险咨询", icon: "🛡️" },
                          { title: "税务", icon: "🧾" },
                        ].map((item) => (
                          <button
                            key={item.title}
                            onClick={() => {
                              if (item.title === "银行") {
                                openBankDirectory();
                                return;
                              }
                              if (item.title === "政府服务") {
                                openGovernmentDirectory();
                                return;
                              }
                              if (item.title === "驾照") {
                                openDriverLicenseDirectory();
                                return;
                              }
                              handleStaticCourseClick();
                            }}
                            className="group w-full rounded-[24px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(11,16,32,0.96),rgba(17,24,39,0.88))] px-4 py-4 text-left shadow-[0_12px_26px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-400/6"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.35rem]">
                                {item.icon}
                              </div>
                              <div className="min-w-0 flex-1 text-[1.08rem] font-bold text-white">
                                {item.title}
                              </div>
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-400/8 text-[1.4rem] text-white">
                                ›
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {featuredSceneSubView === "bank" ? (
                      <div className="space-y-3">
                        <div className="px-1 pb-1 text-center text-sm font-medium tracking-[0.08em] text-white/52">
                          银行
                        </div>
                        {BANK_FEATURED_LESSONS.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              openFeaturedLesson(item.id, item.title);
                            }}
                            className="group w-full rounded-[24px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(11,16,32,0.96),rgba(17,24,39,0.88))] px-4 py-4 text-left shadow-[0_12px_26px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-400/6"
                          >
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1 text-[1.02rem] font-bold leading-7 text-white">
                                {item.title}
                              </div>
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-400/8 text-[1.4rem] text-white">
                                ›
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {featuredSceneSubView === "government" ? (
                      <div className="space-y-3">
                        <div className="px-1 pb-1 text-center text-sm font-medium tracking-[0.08em] text-white/52">
                          政府服务
                        </div>
                        {GOVERNMENT_FEATURED_LESSONS.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              openFeaturedLesson(item.id, item.title);
                            }}
                            className="group w-full rounded-[24px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(11,16,32,0.96),rgba(17,24,39,0.88))] px-4 py-4 text-left shadow-[0_12px_26px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-400/6"
                          >
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1 text-[1.02rem] font-bold leading-7 text-white">
                                {item.title}
                              </div>
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-400/8 text-[1.4rem] text-white">
                                ›
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {featuredSceneSubView === "driver-license" ? (
                      <div className="space-y-3">
                        <div className="px-1 pb-1 text-center text-sm font-medium tracking-[0.08em] text-white/52">
                          驾照
                        </div>
                        {DRIVER_LICENSE_FEATURED_LESSONS.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              openFeaturedLesson(item.id, item.title);
                            }}
                            className="group w-full rounded-[24px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(11,16,32,0.96),rgba(17,24,39,0.88))] px-4 py-4 text-left shadow-[0_12px_26px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-400/6"
                          >
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1 text-[1.02rem] font-bold leading-7 text-white">
                                {item.title}
                              </div>
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-400/8 text-[1.4rem] text-white">
                                ›
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {featuredCourseView === "levels" ? (
                  <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                    <div className="grid gap-3">
                      {[
                        "成人初级口语学习",
                        "成人中级口语学习",
                        "成人高级口语学习",
                        "小学生口语学习",
                        "初中生口语学习",
                        "高中生口语学习",
                      ].map((item) => (
                        <button
                          key={item}
                          onClick={handleStaticCourseClick}
                          className="group w-full rounded-[24px] border border-violet-300/20 bg-[linear-gradient(180deg,rgba(11,16,32,0.96),rgba(17,24,39,0.88))] px-4 py-4 text-left shadow-[0_12px_26px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-violet-400/6"
                        >
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1 text-[1.08rem] font-bold text-white">
                              {item}
                            </div>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-300/35 bg-violet-400/8 text-[1.4rem] text-white">
                              ›
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {expandedLearnSection === "my-courses" ? (
              <div className="space-y-4">
                <div className="app-glass-card px-4 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedLearnSection(null)}
                      className="neon-button shrink-0 rounded-[18px] border border-fuchsia-300/28 bg-[linear-gradient(180deg,rgba(83,58,145,0.44),rgba(56,37,99,0.34))] px-4 py-3 text-sm text-white/92 shadow-[0_0_0_1px_rgba(188,92,255,0.10),0_0_16px_rgba(139,92,246,0.18)]"
                    >
                      返回
                    </button>
                    <div className="min-w-0 flex-1 text-center">
                      <div className="text-[1.2rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_14px_rgba(255,255,255,0.14)]">
                        我的课程
                      </div>
                    </div>
                    <div className="h-11 w-[72px] shrink-0" />
                  </div>
                </div>

                <div className="space-y-4">
                    <button
                      onClick={() =>
                        setExpandedMyCourseSection((prev) =>
                          prev === "saved" ? null : "saved"
                        )
                      }
                      className="group w-full rounded-[28px] border border-blue-400/60 bg-[linear-gradient(180deg,rgba(10,33,82,0.96),rgba(7,15,45,0.94))] px-5 py-5 text-left shadow-[0_0_0_1px_rgba(80,140,255,0.16),0_14px_32px_rgba(0,0,0,0.38),0_0_24px_rgba(52,126,255,0.15)] transition duration-300 hover:scale-[1.012] hover:shadow-[0_0_0_1px_rgba(80,140,255,0.20),0_18px_40px_rgba(0,0,0,0.42),0_0_30px_rgba(52,126,255,0.22)]"
                    >
                      <div className="flex min-h-[72px] items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-blue-300/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.5rem] shadow-[0_0_18px_rgba(52,126,255,0.24)]">
                          📘
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_16px_rgba(105,176,255,0.28)]">
                            已有课程
                          </div>
                          <div className="mt-1 text-[0.95rem] leading-6 text-white/72">
                            查看已保存课程并进入学习
                          </div>
                        </div>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-300/45 bg-blue-400/8 text-[1.8rem] text-white shadow-[0_0_16px_rgba(52,126,255,0.24)] transition group-hover:scale-105">
                          ›
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        setExpandedMyCourseSection((prev) =>
                          prev === "builder" ? null : "builder"
                        )
                      }
                      className="group w-full rounded-[28px] border border-emerald-400/55 bg-[linear-gradient(180deg,rgba(6,48,44,0.96),rgba(7,24,31,0.94))] px-5 py-5 text-left shadow-[0_0_0_1px_rgba(0,255,195,0.14),0_14px_32px_rgba(0,0,0,0.38),0_0_24px_rgba(0,255,195,0.15)] transition duration-300 hover:scale-[1.012] hover:shadow-[0_0_0_1px_rgba(0,255,195,0.18),0_18px_40px_rgba(0,0,0,0.42),0_0_30px_rgba(0,255,195,0.20)]"
                    >
                      <div className="flex min-h-[72px] items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-emerald-300/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[1.5rem] shadow-[0_0_18px_rgba(0,255,195,0.22)]">
                          ✚
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-white [text-shadow:0_0_16px_rgba(85,255,208,0.24)]">
                            制作我的课程
                          </div>
                          <div className="mt-1 text-[0.95rem] leading-6 text-white/72">
                            导入文本资料或音频资料，生成自己的训练内容
                          </div>
                        </div>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-400/8 text-[1.8rem] text-white shadow-[0_0_16px_rgba(0,255,195,0.22)] transition group-hover:scale-105">
                          ›
                        </div>
                      </div>
                    </button>
                </div>

                {expandedMyCourseSection === "saved" ? (
                  <div
                    ref={coursesSectionRef}
                    className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5"
                  >
                    <h2 className="text-xl font-bold">已有课程</h2>

                    <div className="mt-4 space-y-3">
                      {lessons.length === 0 ? (
                        <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                          还没有保存任何课程。
                        </div>
                      ) : (
                        lessons.map((lesson, index) => {
                          const isExpanded = expandedLessonId === lesson.id;

                          return (
                            <div
                              key={lesson.id}
                              className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
                            >
                              <div className="flex items-center gap-3 px-4 py-4">
                                <button
                                  onClick={() => toggleLesson(lesson.id)}
                                  className="min-w-0 flex-1 text-left hover:text-blue-300"
                                >
                                  <div className="truncate text-base font-bold">
                                    {index + 1}. {lesson.title}
                                  </div>
                                  <div className="mt-1 text-xs text-white/50">
                                    {isExpanded ? "点击收起" : "点击展开"}
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    localStorage.setItem(
                                      "currentLessonTitle",
                                      lesson.title || "未命名课程"
                                    );
                                    router.push(`/study/${lesson.id}`);
                                  }}
                                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium"
                                >
                                  学习
                                </button>

                                <button
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium"
                                >
                                  删除
                                </button>
                              </div>

                              {isExpanded ? (
                                <div className="border-t border-white/10 px-4 py-4">
                                  <div className="space-y-2 text-sm text-white/80">
                                    {deserializeTrainingItems(lesson.txt_content).map(
                                      (item, itemIndex) => (
                                        <div
                                          key={`${lesson.id}-${itemIndex}`}
                                          className="rounded-2xl bg-white/5 px-3 py-2"
                                        >
                                          {item.zh ? <p>{item.zh}</p> : null}
                                          <p className={item.zh ? "mt-1 text-white/55" : ""}>
                                            {item.en}
                                          </p>
                                          {!item.zh ? (
                                            <p className="mt-1 text-white/45">
                                              暂无中文翻译
                                            </p>
                                          ) : null}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}

                {expandedMyCourseSection === "builder" ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                      <h2 className="text-xl font-bold">制作我的课程</h2>
                      <div className="mt-4 grid gap-3">
                        {[
                          { value: "text-only", label: "只用文本资料" },
                          { value: "media-only", label: "只用音频资料" },
                          { value: "text-audio", label: "文本 + 音频资料" },
                        ].map((option) => {
                          const isActive = sourceMode === option.value;

                          return (
                            <button
                              key={option.value}
                              onClick={() => setSourceMode(option.value as SourceMode)}
                              className={`w-full rounded-2xl px-4 py-3 text-left font-semibold transition ${
                                isActive
                                  ? "bg-emerald-600 text-white"
                                  : "border border-white/10 bg-black/20 text-white/75 hover:bg-white/8"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {showTextSection ? (
                      <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                        <h2 className="text-xl font-bold">导入文本资料</h2>

                        <input
                          type="text"
                          placeholder="输入课程标题"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="mt-4 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 outline-none placeholder:text-white/35"
                        />

                        <div className="mt-3 grid gap-3">
                          <input
                            id="subtitle-file-input"
                            type="file"
                            accept=".txt,.text,.srt,.doc,.docx,.pdf"
                            onChange={handleSubtitleFileChange}
                            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm"
                          />

                          <button
                            onClick={handleGenerateTraining}
                            disabled={isGeneratingTraining}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {isGeneratingTraining ? (
                              <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                                <span>生成中...</span>
                              </>
                            ) : (
                              "一键生成训练内容"
                            )}
                          </button>
                        </div>

                        {isGeneratingTraining ? (
                          <div className="mt-3 text-sm text-white/70">
                            正在生成训练内容，请稍等...
                          </div>
                        ) : trainingGenerateStatus === "success" ? (
                          <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300">
                            已生成，请保存
                          </div>
                        ) : trainingGenerateStatus === "error" ? (
                          <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200">
                            生成失败，请重试
                          </div>
                        ) : null}

                        {subtitleFileName ? (
                          <div className="mt-3 text-xs text-white/55">
                            当前字幕：{subtitleFileName}
                          </div>
                        ) : null}

                        <textarea
                          placeholder="把中文或英文文本粘贴到这里，或上传 TXT/SRT 后一键生成训练内容"
                          value={rawText}
                          onChange={(e) => setRawText(e.target.value)}
                          rows={8}
                          className="mt-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 outline-none placeholder:text-white/35"
                        />

                        {generatedItems.length > 0 ? (
                          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-white/85">
                                当前训练预览
                              </div>
                              <div className="text-xs text-white/50">
                                {currentIndex + 1} / {generatedItems.length}
                              </div>
                            </div>

                            <p className="rounded-2xl bg-white/5 px-3 py-3 text-sm leading-6">
                              {generatedItems[currentIndex]?.zh || "暂无中文翻译"}
                            </p>

                            <div className="mt-3 rounded-2xl bg-white/5 px-3 py-3 text-sm leading-6 text-white/75">
                              {showEnglish
                                ? generatedItems[currentIndex]?.en || ""
                                : "点击显示英文后可查看原句"}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  setCurrentIndex((prev) => Math.max(prev - 1, 0))
                                }
                                disabled={currentIndex === 0}
                                className="rounded-2xl bg-slate-700 px-3 py-2 text-sm disabled:opacity-40"
                              >
                                上一句
                              </button>
                              <button
                                onClick={() =>
                                  setCurrentIndex((prev) =>
                                    Math.min(prev + 1, generatedItems.length - 1)
                                  )
                                }
                                disabled={currentIndex >= generatedItems.length - 1}
                                className="rounded-2xl bg-blue-600 px-3 py-2 text-sm disabled:opacity-40"
                              >
                                下一句
                              </button>
                              <button
                                onClick={() => setShowEnglish(true)}
                                className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm"
                              >
                                显示英文
                              </button>
                              <button
                                onClick={() => setShowEnglish(false)}
                                className="rounded-2xl bg-slate-700 px-3 py-2 text-sm"
                              >
                                隐藏英文
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <button
                          onClick={() => handleSaveLesson()}
                          className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500"
                        >
                          保存文本课程
                        </button>
                      </div>
                    ) : null}

                    {showAudioSection ? (
                      <div className="space-y-4">
                        <div
                          ref={audioSectionRef}
                          className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5"
                        >
                          <h2 className="text-xl font-bold">导入音频资料</h2>

                          <input
                            type="text"
                            placeholder="输入音频标题"
                            value={audioTitle}
                            onChange={(e) => setAudioTitle(e.target.value)}
                            className="mt-4 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 outline-none placeholder:text-white/35"
                          />

                          <input
                            id="audio-file-input"
                            type="file"
                            accept=".mp3,.wav,.m4a,.mp4,.webm,audio/mpeg,audio/wav,audio/mp4,audio/webm,audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setAudioFile(file);
                            }}
                            className="mt-3 block w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3"
                          />

                          <button
                            onClick={handleUploadAudio}
                            className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500"
                          >
                            保存音频资料
                          </button>

                          {audioMessage ? (
                            <div className="mt-3 rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
                              {audioMessage}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                          <h2 className="text-xl font-bold">已保存音频</h2>

                          <div className="mt-4 space-y-3">
                            {audios.length === 0 ? (
                              <p className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                                还没有上传任何音频。
                              </p>
                            ) : (
                              audios.map((audio, index) => {
                                const savedAudioTitle =
                                  audio.title ||
                                  audio.name ||
                                  audio.fileName ||
                                  audio.filename ||
                                  audio.originalName ||
                                  audio.label ||
                                  "未命名音频";
                                const linkedLesson =
                                  lessons.find((lesson) => lesson.sourceAudioId === audio.id) ||
                                  null;

                                return (
                                  <div
                                    key={audio.id}
                                    className={`rounded-2xl border px-4 py-4 ${
                                      selectedAudioId === audio.id
                                        ? "border-blue-400 bg-blue-500/20"
                                        : "border-white/10 bg-black/20"
                                    }`}
                                  >
                                    <div className="mb-3 flex min-w-0 items-center gap-2">
                                      <span className="shrink-0 font-bold">
                                        {index + 1}.
                                      </span>
                                      <button
                                        onClick={() => setSelectedAudioId(audio.id)}
                                        className="min-w-0 flex-1 truncate text-left font-semibold hover:text-blue-300"
                                        title={savedAudioTitle}
                                      >
                                        {savedAudioTitle}
                                      </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        onClick={() => handleGenerateAudioTraining(audio)}
                                        disabled={generatingAudioId === audio.id}
                                        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
                                      >
                                        {generatingAudioId === audio.id
                                          ? "生成中..."
                                          : "一键生成训练内容"}
                                      </button>

                                      <button
                                        onClick={() => handleSaveAudioAsLesson(audio)}
                                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium"
                                      >
                                        保存
                                      </button>

                                      {linkedLesson ? (
                                        <Link
                                          href={`/study/${linkedLesson.id}`}
                                          onClick={() => {
                                            localStorage.setItem(
                                              "currentLessonTitle",
                                              linkedLesson.title || savedAudioTitle
                                            );
                                          }}
                                          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium"
                                        >
                                          学习
                                        </Link>
                                      ) : (
                                        <button
                                          disabled
                                          className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-medium text-white/60"
                                        >
                                          先保存课程
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleDeleteAudio(audio)}
                                        className="rounded-xl bg-red-600 px-3 py-2 text-sm"
                                      >
                                        删除
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                          <h2 className="text-xl font-bold">音频播放器</h2>

                          <div className="mt-4">
                            {selectedAudio ? (
                              <div className="rounded-2xl bg-black/20 p-5">
                                <h3 className="mb-4 text-lg font-semibold">
                                  {selectedAudio.title}
                                </h3>

                                {loadingAudio ? (
                                  <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                                    正在加载音频...
                                  </div>
                                ) : null}

                                {!loadingAudio &&
                                selectedAudioUrl &&
                                selectedAudioUrl.trim() !== "" ? (
                                  <audio
                                    ref={audioRef}
                                    src={selectedAudioUrl}
                                    controls
                                    className="w-full"
                                  />
                                ) : null}

                                <div className="mt-4 flex flex-nowrap items-center gap-2">
                                  <button
                                    onClick={handleStopAudio}
                                    className="shrink-0 whitespace-nowrap rounded-xl bg-orange-600 px-3 py-2 text-sm"
                                  >
                                    停止
                                  </button>
                                  {[0.75, 1, 1.25, 1.5].map((rate) => (
                                    <button
                                      key={rate}
                                      onClick={() => setPlaybackRate(rate)}
                                      className="shrink-0 whitespace-nowrap rounded-xl bg-slate-700 px-3 py-2 text-sm"
                                    >
                                      {rate}x
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                                请先在上方音频列表中点击一条音频。
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

      </div>
    </main>
  );
}
