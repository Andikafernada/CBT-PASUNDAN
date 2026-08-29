import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, password, deviceFingerprint: reqFingerprint } = body;

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

    // Verify password (plain text fallback for initial migrated data or bcrypt hash)
    let isMatch = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$")) {
      isMatch = await verifyPassword(password, user.password);
    } else {
      // Legacy plain text check
      isMatch = user.password === password;
    }

    if (!isMatch) {
      return NextResponse.json(
        { error: "Username atau password tidak sesuai" },
        { status: 401 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";
    const activeFingerprint = reqFingerprint || Buffer.from(`${userAgent}-${clientIp}`).toString("base64").substring(0, 32);

    // Single Device Lock Check (For Students)
    if (user.role === "STUDENT") {
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
        deviceFingerprint: activeFingerprint,
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
