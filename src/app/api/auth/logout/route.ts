import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { deviceFingerprint: null },
      }).catch(() => {});

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGOUT",
          details: `User ${user.username} logout secara normal`,
        },
      }).catch(() => {});
    }
  } catch {}

  const response = NextResponse.json({ success: true, message: "Berhasil logout" });
  response.cookies.set({
    name: "cbt_token",
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}
