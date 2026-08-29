import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [students, groups] = await Promise.all([
      prisma.user.findMany({
        where: { role: "STUDENT" },
        include: { group: true },
        orderBy: { name: "asc" },
      }),
      prisma.group.findMany({
        include: {
          _count: { select: { users: true, examGroups: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ students, groups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // --- GROUP / ROMBEL CRUD ---
    if (action === "CREATE_GROUP") {
      const { code, name, description } = body;
      if (!code || !name) {
        return NextResponse.json({ error: "Kode dan Nama Rombel/Kelas wajib diisi" }, { status: 400 });
      }

      const existing = await prisma.group.findUnique({ where: { code } });
      if (existing) {
        return NextResponse.json({ error: `Rombel dengan kode '${code}' sudah ada` }, { status: 400 });
      }

      const group = await prisma.group.create({
        data: { code, name, description: description || "" },
      });
      return NextResponse.json({ success: true, group });
    }

    if (action === "UPDATE_GROUP") {
      const { id, code, name, description } = body;
      if (!id || !code || !name) {
        return NextResponse.json({ error: "ID, Kode, dan Nama Rombel/Kelas wajib diisi" }, { status: 400 });
      }

      const group = await prisma.group.update({
        where: { id },
        data: { code, name, description: description || "" },
      });
      return NextResponse.json({ success: true, group });
    }

    if (action === "DELETE_GROUP") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "ID Rombel/Kelas wajib diisi" }, { status: 400 });
      }

      // Unassign students from this group before deleting
      await prisma.user.updateMany({
        where: { groupId: id },
        data: { groupId: null },
      });

      // Delete exam group associations
      await prisma.examGroup.deleteMany({
        where: { groupId: id },
      });

      await prisma.group.delete({
        where: { id },
      });

      return NextResponse.json({ success: true });
    }

    // --- STUDENT CRUD ---
    if (action === "CREATE_STUDENT") {
      const { username, password, name, nis, groupId } = body;
      if (!username || !password || !name) {
        return NextResponse.json({ error: "Username, password, dan nama wajib diisi" }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return NextResponse.json({ error: `Username '${username}' sudah terdaftar` }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password);
      const student = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          plainPassword: password,
          name,
          nis: nis || "",
          groupId: groupId || null,
          role: "STUDENT",
        },
        include: { group: true },
      });
      return NextResponse.json({ success: true, student });
    }

    if (action === "UPDATE_STUDENT") {
      const { id, name, nis, groupId, password } = body;
      if (!id || !name) {
        return NextResponse.json({ error: "ID dan Nama siswa wajib diisi" }, { status: 400 });
      }

      const updateData: any = {
        name,
        nis: nis || "",
        groupId: groupId || null,
      };

      if (password && password.trim() !== "") {
        updateData.password = await hashPassword(password);
        updateData.plainPassword = password;
      }

      const student = await prisma.user.update({
        where: { id },
        data: updateData,
        include: { group: true },
      });
      return NextResponse.json({ success: true, student });
    }

    if (action === "DELETE_STUDENT") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "ID Siswa wajib diisi" }, { status: 400 });
      }

      await prisma.user.delete({
        where: { id },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "RESET_STUDENT_DEVICE") {
      const { id } = body;
      await prisma.user.update({
        where: { id },
        data: { deviceFingerprint: null, isLoginLocked: false },
      });
      return NextResponse.json({ success: true });
    }

    // --- BULK OPERATIONS FOR STUDENTS ---
    if (action === "BULK_DELETE") {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Daftar ID siswa tidak boleh kosong" }, { status: 400 });
      }

      // Delete user answers & sessions cascade or direct
      const deleted = await prisma.user.deleteMany({
        where: {
          id: { in: ids },
          role: "STUDENT",
        },
      });

      return NextResponse.json({ success: true, count: deleted.count });
    }

    if (action === "BULK_RESET_PASSWORD") {
      const { ids, newPassword } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Daftar ID siswa tidak boleh kosong" }, { status: 400 });
      }

      const passToSet = newPassword && newPassword.trim() !== "" ? newPassword.trim() : "123";
      const hashedPassword = await hashPassword(passToSet);

      const updated = await prisma.user.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          password: hashedPassword,
          plainPassword: passToSet,
        },
      });

      return NextResponse.json({ success: true, count: updated.count, defaultPassword: passToSet });
    }

    if (action === "BULK_ASSIGN_GROUP") {
      const { ids, groupId } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Daftar ID siswa tidak boleh kosong" }, { status: 400 });
      }

      const updated = await prisma.user.updateMany({
        where: {
          id: { in: ids },
          role: "STUDENT",
        },
        data: {
          groupId: groupId || null,
        },
      });

      return NextResponse.json({ success: true, count: updated.count });
    }

    if (action === "BULK_RESET_DEVICE") {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Daftar ID siswa tidak boleh kosong" }, { status: 400 });
      }

      const updated = await prisma.user.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          deviceFingerprint: null,
          isLoginLocked: false,
        },
      });

      return NextResponse.json({ success: true, count: updated.count });
    }

    if (action === "BULK_TOGGLE_ACTIVE") {
      const { ids, isActive } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Daftar ID siswa tidak boleh kosong" }, { status: 400 });
      }

      const updated = await prisma.user.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          isActive: typeof isActive === "boolean" ? isActive : true,
        },
      });

      return NextResponse.json({ success: true, count: updated.count });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
