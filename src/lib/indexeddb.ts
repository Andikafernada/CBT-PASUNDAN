"use client";

// IndexedDB Helper for CBT Student Exam Offline Resilience
const DB_NAME = "zyacbt_exam_db";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB tidak didukung oleh browser"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("exam_cache")) {
        db.createObjectStore("exam_cache", { keyPath: "examId" });
      }

      if (!db.objectStoreNames.contains("answer_queue")) {
        const store = db.createObjectStore("answer_queue", { keyPath: "id", autoIncrement: true });
        store.createIndex("by_exam", "examId", { unique: false });
        store.createIndex("by_question", "questionId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const ExamLocalDB = {
  // 1. Cache full exam structure (questions, options, media, instructions)
  async saveExamCache(examId: string, payload: any): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction("exam_cache", "readwrite");
      const store = tx.objectStore("exam_cache");
      store.put({
        examId,
        cachedAt: Date.now(),
        payload,
      });
      return new Promise((resolve) => {
        tx.oncomplete = () => resolve();
      });
    } catch {
      // Fallback to localStorage
      try {
        localStorage.setItem(`cbt_cache_${examId}`, JSON.stringify(payload));
      } catch {}
    }
  },

  async getExamCache(examId: string): Promise<any | null> {
    try {
      const db = await openDB();
      const tx = db.transaction("exam_cache", "readonly");
      const store = tx.objectStore("exam_cache");
      const req = store.get(examId);

      return new Promise((resolve) => {
        req.onsuccess = () => {
          resolve(req.result ? req.result.payload : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      // Fallback
      try {
        const raw = localStorage.getItem(`cbt_cache_${examId}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
  },

  // 2. Queue answers for background sync
  async queueAnswer(examId: string, answerPayload: any): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction("answer_queue", "readwrite");
      const store = tx.objectStore("answer_queue");
      
      store.put({
        examId,
        questionId: answerPayload.questionId,
        payload: answerPayload,
        timestamp: Date.now(),
      });

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve();
      });
    } catch {
      // Fallback to localStorage queue
      try {
        const qKey = `cbt_queue_${examId}`;
        const existing: any[] = JSON.parse(localStorage.getItem(qKey) || "[]");
        const filtered = existing.filter((item) => item.questionId !== answerPayload.questionId);
        filtered.push(answerPayload);
        localStorage.setItem(qKey, JSON.stringify(filtered));
      } catch {}
    }
  },

  async getPendingAnswers(examId: string): Promise<any[]> {
    try {
      const db = await openDB();
      const tx = db.transaction("answer_queue", "readonly");
      const store = tx.objectStore("answer_queue");
      const index = store.index("by_exam");
      const req = index.getAll(examId);

      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      try {
        const qKey = `cbt_queue_${examId}`;
        return JSON.parse(localStorage.getItem(qKey) || "[]");
      } catch {
        return [];
      }
    }
  },

  async removePendingAnswer(id?: number, examId?: string, questionId?: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction("answer_queue", "readwrite");
      const store = tx.objectStore("answer_queue");

      if (id !== undefined) {
        store.delete(id);
      } else if (examId && questionId) {
        const index = store.index("by_question");
        const req = index.getKey(questionId);
        req.onsuccess = () => {
          if (req.result) store.delete(req.result);
        };
      }
    } catch {
      if (examId && questionId) {
        try {
          const qKey = `cbt_queue_${examId}`;
          const existing: any[] = JSON.parse(localStorage.getItem(qKey) || "[]");
          const filtered = existing.filter((item) => item.questionId !== questionId);
          localStorage.setItem(qKey, JSON.stringify(filtered));
        } catch {}
      }
    }
  },

  async clearExamData(examId: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(["exam_cache", "answer_queue"], "readwrite");
      tx.objectStore("exam_cache").delete(examId);
      
      const qStore = tx.objectStore("answer_queue");
      const index = qStore.index("by_exam");
      const req = index.getAllKeys(examId);
      req.onsuccess = () => {
        if (req.result) {
          req.result.forEach((k) => qStore.delete(k));
        }
      };
    } catch {}

    try {
      localStorage.removeItem(`cbt_cache_${examId}`);
      localStorage.removeItem(`cbt_queue_${examId}`);
      localStorage.removeItem(`cbt_backup_${examId}`);
    } catch {}
  },
};
