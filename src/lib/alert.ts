/**
 * CBT HEBAT SMK PASUNDAN 2 Bandung — Development by Andika Fernanda
 * Observability Alerting Service (Telegram & System Logger)
 */

interface AlertPayload {
  title: string;
  message: string;
  level?: "INFO" | "WARN" | "CRITICAL";
  details?: Record<string, any>;
}

// In-memory throttling map to prevent notification floods: alertKey -> timestamp
const alertCooldowns = new Map<string, number>();
const COOLDOWN_MS = 60 * 1000; // 1 minute per alert type

export async function sendSystemAlert(payload: AlertPayload): Promise<{ success: boolean; reason?: string }> {
  const { title, message, level = "WARN", details } = payload;
  const alertKey = `${level}:${title}`;
  const now = Date.now();
  const lastSent = alertCooldowns.get(alertKey);

  if (lastSent && now - lastSent < COOLDOWN_MS) {
    return { success: false, reason: "COOLDOWN_ACTIVE" };
  }

  // Record timestamp to enforce cooldown
  alertCooldowns.set(alertKey, now);

  const emoji = level === "CRITICAL" ? "🚨" : level === "WARN" ? "⚠️" : "ℹ️";
  const timestampStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

  const formattedLog = `[${timestampStr}] [ALERT ${level}] ${title}: ${message} ${details ? JSON.stringify(details) : ""}`;
  if (level === "CRITICAL") {
    console.error(formattedLog);
  } else if (level === "WARN") {
    console.warn(formattedLog);
  } else {
    console.log(formattedLog);
  }

  // Telegram delivery if configured
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return { success: true, reason: "LOGGED_LOCAL_NO_TELEGRAM_ENV" };
  }

  try {
    let text = `${emoji} *[CBT HEBAT ALERT - ${level}]*\n`;
    text += `*${title}*\n`;
    text += `${message}\n\n`;
    text += `🕒 _Waktu_: ${timestampStr} WIB\n`;
    text += `🖥️ _Server_: SMK Pasundan 2 Bandung (172.16.0.210)\n`;

    if (details && Object.keys(details).length > 0) {
      text += `\n*Detail Metrik*:\n\`\`\`\n${JSON.stringify(details, null, 2)}\n\`\`\``;
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("⚠️ Telegram alert failed:", response.status, errText);
      return { success: false, reason: `HTTP_${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    console.warn("⚠️ Error sending Telegram alert:", err.message);
    return { success: false, reason: err.message };
  }
}
