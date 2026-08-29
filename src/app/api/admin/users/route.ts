import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses khusus Superuser / Administrator" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const groupId = searchParams.get("groupId");
    const search = searchParams.get("search");

    const where: any = {};
    if (role && role !== "ALL") where.role = role;
    if (groupId && groupId !== "ALL") where.groupId = groupId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { username: { contains: search } },
        { nis: { contains: search } },
      ];
    }

    const [users, groups] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { group: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      }),
      prisma.group.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ users, groups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses khusus Superuser / Administrator" }, { status: 403 });
    }

    const body = await req.json();
    const { username, password, name, role, nis, email, phone, groupId } = body;

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: "Username, password, dan nama wajib diisi" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: `Username '${username}' sudah digunakan oleh pengguna lain` },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: role || "STUDENT",
        nis: nis || null,
        email: email || null,
        phone: phone || null,
        groupId: groupId || null,
      },
      include: { group: true },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses khusus Superuser / Administrator" }, { status: 403 });
    }

    const body = await req.json();

    if (body.action === "BULK_RESET_PASSWORD") {
      const { ids, newPassword } = body;
      const passToSet = newPassword && newPassword.trim() !== "" ? newPassword.trim() : "123";
      const hashedPassword = await hashPassword(passToSet);
      const updated = await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { password: hashedPassword },
      });
      return NextResponse.json({ success: true, count: updated.count, defaultPassword: passToSet });
    }

    if (body.action === "BULK_RESET_DEVICE") {
      const { ids } = body;
      const updated = await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { deviceFingerprint: null, isLoginLocked: false },
      });
      return NextResponse.json({ success: true, count: updated.count });
    }

    if (body.action === "BULK_ASSIGN_GROUP") {
      const { ids, groupId } = body;
      const updated = await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { groupId: groupId || null },
      });
      return NextResponse.json({ success: true, count: updated.count });
    }

    const { id, username, password, name, role, nis, email, phone, groupId, isActive, isLoginLocked } = body;

    if (!id) {
      return NextResponse.json({ error: "ID pengguna wajib disertakan" }, { status: 400 });
    }

    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (nis !== undefined) updateData.nis = nis;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (groupId !== undefined) updateData.groupId = groupId || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isLoginLocked !== undefined) {
      updateData.isLoginLocked = isLoginLocked;
      if (!isLoginLocked) updateData.deviceFingerprint = null;
    }

    if (password && password.trim() !== "") {
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { group: true },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses khusus Superuser / Administrator" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (body && Array.isArray(body.ids)) {
      const safeIds = body.ids.filter((id: string) => id !== sessionUser.id);
      const deleted = await prisma.user.deleteMany({
        where: { id: { in: safeIds } },
      });
      return NextResponse.json({ success: true, count: deleted.count });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID pengguna wajib disertakan" }, { status: 400 });
    }

    // Prevent deleting own session
    if (id === sessionUser.id) {
      return NextResponse.json({ error: "Tidak dapat menghapus akun Anda sendiri yang sedang aktif" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Pengguna berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
