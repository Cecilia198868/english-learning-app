export type HistoryItem = {
  time: string;
  action: string;
  value: number;
};

export type StudyRecord = {
  id: string;
  title: string;
  count: number;
  createdAt: string;
  updatedAt: string;
  history: HistoryItem[];
};

export type AppData = {
  records: StudyRecord[];
};

const STORAGE_KEY = "english-app-data";

export function getDefaultData(): AppData {
  return {
    records: [],
  };
}

export function loadAppData(): AppData {
  if (typeof window === "undefined") {
    return getDefaultData();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.records)) {
      return getDefaultData();
    }

    return parsed;
  } catch {
    return getDefaultData();
  }
}

export function saveAppData(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearAppData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function exportAppData() {
  const data = loadAppData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "english-app-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importAppData(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || !Array.isArray(parsed.records)) {
          reject(new Error("文件格式不正确"));
          return;
        }

        saveAppData(parsed);
        resolve(parsed);
      } catch {
        reject(new Error("导入失败，JSON 文件无效"));
      }
    };

    reader.onerror = () => {
      reject(new Error("读取文件失败"));
    };

    reader.readAsText(file);
  });
}