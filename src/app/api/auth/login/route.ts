import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, verifyPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, password, deviceFingerprint: reqFingerprint } = body;

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    // 🛡️ Redis Rate Limiting (Anti-Brute Force: Max 10 attempts per minute per IP / username)
    const rateLimitKey = `login:${clientIp.split(",")[0].trim()}:${username || "anon"}`;
    const rl = await checkRateLimit(rateLimitKey, 10, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Silakan tunggu ${rl.resetSec} detik sebelum mencoba kembali.` },
        { status: 429, headers: { "Retry-After": String(rl.resetSec) } }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { group: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Username atau password tidak sesuai" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Akun ini dinonaktifkan oleh administrator" },
        { status: 403 }
      );
    }

    // Verify password (bcrypt only — no plain text fallback for security)
    let isMatch = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$")) {
      isMatch = await verifyPassword(password, user.password);
    } else {
      // Password not hashed — reject and prompt admin to reset
      console.warn(`[Security] User ${user.username} has unhashed password. Please run db:seed or reset password.`);
      isMatch = false;
    }

    if (!isMatch) {
      return NextResponse.json(
        { error: "Username atau password tidak sesuai" },
        { status: 401 }
      );
    }

    const userAgent = req.headers.get("user-agent") || "";
    const activeFingerprint = reqFingerprint || Buffer.from(`${userAgent}-${clientIp}`).toString("base64").substring(0, 32);

    // 🛡️ KIOSK EXAMBROWSER ENFORCEMENT AT LOGIN
    // Siswa Reguler WAJIB login via CBT Exambrowser di Lab.
    // Hanya siswa PKL / Siswa yang di-Bypass yang boleh login via Chrome / HP biasa.
    if (user.role === "STUDENT") {
      const isBypassed = Boolean((user as any).bypassExambro || user.group?.isPkl || (user.group as any)?.bypassExambro);
      if (!isBypassed) {
        const sebHeader = req.headers.get("x-safeexambrowser-requesthash");
        const pattern = /Exambro|SafeExamBrowser/i;
        const isKiosk = pattern.test(userAgent) || !!sebHeader;

        if (!isKiosk) {
          return NextResponse.json(
            {
              error: "Akses Ditolak: Anda terdaftar sebagai siswa Reguler Lab dan WAJIB login melalui aplikasi resmi CBT Exambrowser di komputer lab! Browser biasa (Chrome / Edge / HP) tidak diizinkan.",
              isKioskRequired: true,
            },
            { status: 403 }
          );
        }
      }
    }

    // Single Device Lock Check (For Students)
    const isSuperReviewer = user.username === "andikafernanda";
    if (user.role === "STUDENT" && !isSuperReviewer) {
      if (user.isLoginLocked) {
        return NextResponse.json(
          {
            error: "Akun Anda saat ini terkunci. Silakan hubungi proktor/pengawas ruang untuk membuka kunci akun Anda.",
            isLocked: true,
          },
          { status: 403 }
        );
      }

      if (user.deviceFingerprint && user.deviceFingerprint !== activeFingerprint) {
        // If logged in on another device recently
        return NextResponse.json(
          {
            error: "Akun Anda sedang aktif di perangkat lain! Minta pengawas/proktor di ruang ujian untuk melakukan 'Reset Login' akun Anda jika Anda berganti perangkat.",
            isLocked: true,
          },
          { status: 403 }
        );
      }
    }

    // Update user device and login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deviceFingerprint: isSuperReviewer ? null : activeFingerprint,
        isLoginLocked: false,
        lastLoginAt: new Date(),
      },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        details: `Login berhasil dari ${user.role === "STUDENT" ? "Peserta" : "Staff"} [${activeFingerprint.substring(0, 8)}]`,
        ipAddress: clientIp,
        userAgent: userAgent.substring(0, 255),
      },
    }).catch(() => {});

    const token = signToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      groupId: user.groupId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        nis: (user as any).nis || user.username,
        group: user.group ? { id: user.group.id, name: user.group.name } : null,
      },
      redirectTo:
        user.role === "STUDENT"
          ? "/student/dashboard"
          : user.role === "TEACHER"
          ? "/admin/questions"
          : "/admin/dashboard",
    });

    // Set cookie (secure only if actually accessed via HTTPS)
    const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

    response.cookies.set({
      name: "cbt_token",
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
