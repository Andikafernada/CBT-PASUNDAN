"use client";

// IndexedDB Helper for CBT Student Exam Offline Resilience & Batch Disaster Recovery
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
  // 1. Cache full exam structure with persistent targetEndTime
  async saveExamCache(examId: string, payload: any, targetEndTime?: number): Promise<void> {
    try {
      const calculatedEnd = targetEndTime || (typeof payload?.exam?.remainingSeconds === "number" ? Date.now() + payload.exam.remainingSeconds * 1000 : undefined);
      
      const db = await openDB();
      const tx = db.transaction("exam_cache", "readwrite");
      const store = tx.objectStore("exam_cache");
      store.put({
        examId,
        cachedAt: Date.now(),
        targetEndTime: calculatedEnd,
        payload,
      });

      if (calculatedEnd) {
        try {
          localStorage.setItem(`cbt_target_end_${examId}`, String(calculatedEnd));
        } catch {}
      }

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve();
      });
    } catch {
      // Fallback to localStorage
      try {
        localStorage.setItem(`cbt_cache_${examId}`, JSON.stringify(payload));
        if (targetEndTime) {
          localStorage.setItem(`cbt_target_end_${examId}`, String(targetEndTime));
        }
      } catch {}
    }
  },

  // ⚡ Live Answer Cache Update: keeps exam_cache updated with all answers selected & targetEndTime
  async updateCachedQuestions(examId: string, updatedQuestions: any[], targetEndTime?: number): Promise<void> {
    try {
      // Always update localStorage fast backup first
      try {
        localStorage.setItem(`cbt_backup_${examId}`, JSON.stringify(updatedQuestions));
        if (targetEndTime) {
          localStorage.setItem(`cbt_target_end_${examId}`, String(targetEndTime));
        }
      } catch {}

      const db = await openDB();
      const tx = db.transaction("exam_cache", "readwrite");
      const store = tx.objectStore("exam_cache");
      const req = store.get(examId);

      req.onsuccess = () => {
        if (req.result && req.result.payload) {
          req.result.payload.questions = updatedQuestions;
          req.result.updatedAt = Date.now();
          if (targetEndTime) {
            req.result.targetEndTime = targetEndTime;
          }
          store.put(req.result);
        }
      };
    } catch {}
  },

  async getExamCache(examId: string): Promise<any | null> {
    let payload: any = null;
    let targetEndTime: number | undefined;

    try {
      const db = await openDB();
      const tx = db.transaction("exam_cache", "readonly");
      const store = tx.objectStore("exam_cache");
      const req = store.get(examId);

      const record: any = await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (record) {
        payload = record.payload;
        targetEndTime = record.targetEndTime;
      }
    } catch {
      try {
        const raw = localStorage.getItem(`cbt_cache_${examId}`);
        payload = raw ? JSON.parse(raw) : null;
      } catch {}
    }

    // Also check localStorage target end time
    if (!targetEndTime) {
      try {
        const storedEnd = localStorage.getItem(`cbt_target_end_${examId}`);
        if (storedEnd) targetEndTime = Number(storedEnd);
      } catch {}
    }

    // 🔒 Dynamic offline remaining time adjustment:
    // If targetEndTime exists, calculate true remaining seconds rather than using static initial time!
    if (payload && payload.exam && targetEndTime && targetEndTime > Date.now()) {
      const realRemaining = Math.max(0, Math.round((targetEndTime - Date.now()) / 1000));
      payload.exam.remainingSeconds = realRemaining;
    }

    // Smart Merge with localStorage backup if questions have newer answers
    try {
      const localBackupRaw = localStorage.getItem(`cbt_backup_${examId}`);
      if (localBackupRaw && payload && Array.isArray(payload.questions)) {
        const localQuestions: any[] = JSON.parse(localBackupRaw);
        const localMap = new Map<string, any>();
        localQuestions.forEach((q) => {
          if (q.id && q.answer) localMap.set(q.id, q.answer);
        });

        payload.questions = payload.questions.map((q: any) => {
          const localAns = localMap.get(q.id);
          if (localAns) {
            const hasLocalSelected = Array.isArray(localAns.selectedOptionIds) && localAns.selectedOptionIds.length > 0;
            const hasLocalText = localAns.textAnswer && localAns.textAnswer.trim() !== "";
            const hasLocalMatching = localAns.matchingAnswer && Object.keys(localAns.matchingAnswer).length > 0;

            if (hasLocalSelected || hasLocalText || hasLocalMatching) {
              return { ...q, answer: { ...q.answer, ...localAns } };
            }
          }
          return q;
        });
      }
    } catch {}

    return payload;
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

  // 3. ⚡ BATCH DISASTER RECOVERY: Flush entire queue in single bulk HTTP request
  async flushPendingAnswersBulk(examId: string): Promise<{
    success: boolean;
    syncedCount: number;
    serverRemainingSeconds?: number;
    error?: string;
  }> {
    try {
      const pending = await this.getPendingAnswers(examId);
      if (!Array.isArray(pending) || pending.length === 0) {
        return { success: true, syncedCount: 0 };
      }

      // Consolidate answers: deduplicate by questionId (latest wins)
      const answersMap = new Map<string, any>();
      for (const item of pending) {
        const payload = item.payload || item;
        if (payload?.questionId) {
          answersMap.set(payload.questionId, payload);
        }
      }

      const answers = Array.from(answersMap.values());

      const res = await fetch(`/api/student/exams/${examId}/save-answer-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, syncedCount: 0, error: err.error || "Batch sync failed" };
      }

      const resData = await res.json().catch(() => ({}));

      // On successful bulk save, clear synced items from queue
      for (const item of pending) {
        const payload = item.payload || item;
        await this.removePendingAnswer(item.id, examId, payload?.questionId);
      }

      // Also clean localStorage fallback queue
      try {
        localStorage.removeItem(`cbt_queue_${examId}`);
      } catch {}

      return {
        success: true,
        syncedCount: resData.savedCount || answers.length,
        serverRemainingSeconds: resData.serverRemainingSeconds,
      };
    } catch (e: any) {
      return { success: false, syncedCount: 0, error: e?.message };
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
      localStorage.removeItem(`cbt_target_end_${examId}`);
    } catch {}
  },
};
