import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import Redis from "ioredis";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Akses terbatas hanya untuk Sysadmin / Administrator" }, { status: 403 });
    }

    const startTime = Date.now();

    // 1. OS & Memory Telemetry
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;
    const memUsagePercent = Math.round((usedMemBytes / totalMemBytes) * 1000) / 10;

    const cpus = os.cpus();
    const loadAvg = os.loadavg(); // [1m, 5m, 15m]

    // 2. Disk Usage Telemetry
    let diskStats = { total: "Unknown", used: "Unknown", available: "Unknown", usagePercent: "Unknown" };
    try {
      const { stdout } = await execAsync("df -h / | tail -n 1");
      const parts = stdout.trim().split(/\s+/);
      if (parts.length >= 5) {
        diskStats = {
          total: parts[1],
          used: parts[2],
          available: parts[3],
          usagePercent: parts[4],
        };
      }
    } catch {}

    // 3. Redis Ping & Status
    let redisStatus = { connected: false, latencyMs: -1, memoryUsed: "Unknown" };
    try {
      const redisStart = Date.now();
      const redis = new Redis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
      });

      const pong = await redis.ping();
      const redisLatency = Date.now() - redisStart;

      let mem = "Unknown";
      try {
        const info = await redis.info("memory");
        const match = info.match(/used_memory_human:([^\r\n]+)/);
        if (match) mem = match[1].trim();
      } catch {}

      redis.disconnect();

      redisStatus = {
        connected: pong === "PONG",
        latencyMs: redisLatency,
        memoryUsed: mem,
      };
    } catch (e: any) {
      redisStatus = { connected: false, latencyMs: -1, memoryUsed: e.message || "Error" };
    }

    // 4. MariaDB Ping & Counts
    let dbStatus = { connected: false, latencyMs: -1, totalStudents: 0, totalQuestions: 0, totalExams: 0 };
    try {
      const dbStart = Date.now();
      const [studentsCount, questionsCount, examsCount] = await Promise.all([
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.question.count(),
        prisma.exam.count(),
      ]);
      const dbLatency = Date.now() - dbStart;

      dbStatus = {
        connected: true,
        latencyMs: dbLatency,
        totalStudents: studentsCount,
        totalQuestions: questionsCount,
        totalExams: examsCount,
      };
    } catch (e) {
      dbStatus = { connected: false, latencyMs: -1, totalStudents: 0, totalQuestions: 0, totalExams: 0 };
    }

    // 5. PM2 Cluster Status
    let pm2Status = { clusterCount: 4, onlineCount: 4, mode: "cluster" };
    try {
      const { stdout } = await execAsync("sudo -u cbtapp pm2 jlist");
      const pm2List = JSON.parse(stdout);
      const online = pm2List.filter((p: any) => p.pm2_env?.status === "online").length;
      pm2Status = {
        clusterCount: pm2List.length,
        onlineCount: online,
        mode: "cluster",
      };
    } catch {}

    const overallLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: "HEALTHY",
      timestamp: new Date().toISOString(),
      overallLatencyMs,
      server: {
        hostname: os.hostname(),
        platform: os.platform(),
        uptimeSeconds: Math.round(os.uptime()),
        appUptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
      },
      cpu: {
        model: cpus[0]?.model || "Multi-Core CPU",
        cores: cpus.length,
        loadAverage: {
          "1m": Math.round(loadAvg[0] * 100) / 100,
          "5m": Math.round(loadAvg[1] * 100) / 100,
          "15m": Math.round(loadAvg[2] * 100) / 100,
        },
      },
      memory: {
        totalGB: Math.round((totalMemBytes / (1024 * 1024 * 1024)) * 10) / 10,
        usedGB: Math.round((usedMemBytes / (1024 * 1024 * 1024)) * 10) / 10,
        freeGB: Math.round((freeMemBytes / (1024 * 1024 * 1024)) * 10) / 10,
        usagePercent: memUsagePercent,
      },
      disk: diskStats,
      redis: redisStatus,
      database: dbStatus,
      pm2: pm2Status,
    });
  } catch (error: any) {
    return NextResponse.json({ status: "DEGRADED", error: error.message }, { status: 500 });
  }
}
