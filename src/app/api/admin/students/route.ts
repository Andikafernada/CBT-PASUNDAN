import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword, generateRandomPassword } from "@/lib/auth";
import { generateStudentsWithAI } from "@/lib/ai-generator";

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
          name,
          nis: nis || "",
          groupId: groupId || null,
          role: "STUDENT",
        },
        include: { group: true },
      });
      return NextResponse.json({ success: true, student, plainPassword: password });
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
      }

      const student = await prisma.user.update({
        where: { id },
        data: updateData,
        include: { group: true },
      });
      return NextResponse.json({ success: true, student, plainPassword: password && password.trim() !== "" ? password : undefined });
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
    if (action === "GENERATE_AI_STUDENTS") {
      const { count, groupId, prefix, passwordType, customPassword, useAI } = body;
      const numCount = Number(count);
      if (isNaN(numCount) || numCount < 1 || numCount > 1000) {
        return NextResponse.json(
          { error: "Jumlah siswa harus berupa angka antara 1 hingga 1000" },
          { status: 400 }
        );
      }

      let groupName = "Umum";
      if (groupId && groupId !== "NONE" && groupId !== "") {
        const grp = await prisma.group.findUnique({ where: { id: groupId } });
        if (grp) groupName = grp.name;
      }

      const { students, source } = await generateStudentsWithAI({
        count: numCount,
        groupId: groupId && groupId !== "NONE" && groupId !== "" ? groupId : null,
        className: groupName,
        prefix: prefix || "siswa",
        passwordType: passwordType || "READABLE_WORD",
        customPassword: customPassword || "",
        useAI: useAI !== false,
      });

      const insertPayload = students.map((s) => ({
        name: s.name,
        username: s.username,
        password: s.hashedPassword,
        nis: s.nis,
        groupId: s.groupId,
        role: "STUDENT",
        isActive: true,
        isLoginLocked: false,
        deviceFingerprint: null,
      }));

      const created = await prisma.user.createMany({
        data: insertPayload,
        skipDuplicates: true,
      });

      const returnList = students.map((s) => ({
        name: s.name,
        username: s.username,
        plainPassword: s.plainPassword,
        password: s.plainPassword,
        nis: s.nis,
        groupName,
      }));

      return NextResponse.json({
        success: true,
        count: created.count,
        source,
        students: returnList,
        message: `Berhasil membuat ${created.count} akun siswa secara otomatis (${source === "AI_OPENCODE" ? "AI OpenCode" : "AI Generator"}).`,
      });
    }

    if (action === "DELETE_ALL_STUDENTS") {
      const { groupId } = body;
      const whereStudent: any = { role: "STUDENT" };
      if (groupId && groupId !== "ALL") {
        whereStudent.groupId = groupId;
      }

      // Find all matching students
      const studentsToDelete = await prisma.user.findMany({
        where: whereStudent,
        select: { id: true },
      });

      const studentIds = studentsToDelete.map((s) => s.id);

      if (studentIds.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          message: "Tidak ada siswa yang ditemukan untuk dihapus",
        });
      }

      // Explicitly delete sessions, answers, reflections, and violation logs
      const sessions = await prisma.examSession.findMany({
        where: { userId: { in: studentIds } },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);

      if (sessionIds.length > 0) {
        await prisma.examAnswer.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
        await prisma.studentReflection.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
        await prisma.violationLog.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
        await prisma.examSession.deleteMany({
          where: { id: { in: sessionIds } },
        });
      }

      // Clean audit logs if any
      await prisma.auditLog.deleteMany({
        where: { userId: { in: studentIds } },
      }).catch(() => {});

      // Delete the student users
      const deleted = await prisma.user.deleteMany({
        where: { id: { in: studentIds } },
      });

      return NextResponse.json({
        success: true,
        count: deleted.count,
        message: `Berhasil menghapus ${deleted.count} data siswa secara permanen.`,
      });
    }

    if (action === "BULK_DELETE") {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Daftar ID siswa tidak boleh kosong" }, { status: 400 });
      }

      // Explicitly delete sessions, answers, reflections, and violation logs
      const sessions = await prisma.examSession.findMany({
        where: { userId: { in: ids } },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);

      if (sessionIds.length > 0) {
        await prisma.examAnswer.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
        await prisma.studentReflection.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
        await prisma.violationLog.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
        await prisma.examSession.deleteMany({
          where: { id: { in: sessionIds } },
        });
      }

      await prisma.auditLog.deleteMany({
        where: { userId: { in: ids } },
      }).catch(() => {});

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

      const useCustom = newPassword && newPassword.trim() !== "";
      const requested = useCustom ? newPassword.trim() : "";
      const results: { id: string; username: string; name: string; plainPassword: string }[] = [];

      for (const id of ids) {
        const existing = await prisma.user.findUnique({
          where: { id },
          select: { username: true, name: true },
        });
        const pass = useCustom ? requested : generateRandomPassword();
        const hashedPassword = await hashPassword(pass);
        await prisma.user.update({
          where: { id },
          data: { password: hashedPassword },
        });
        if (existing) {
          results.push({ id, username: existing.username, name: existing.name, plainPassword: pass });
        }
      }

      const count = results.length;
      if (useCustom) {
        return NextResponse.json({ success: true, count, defaultPassword: requested });
      }
      return NextResponse.json({ success: true, count, passwords: results });
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

        if (action === "BULK_TOGGLE_BYPASS_EXAMBRO") {
      const { ids, bypassExambro } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Daftar ID siswa tidak boleh kosong" }, { status: 400 });
      }

      const updated = await prisma.user.updateMany({
        where: {
          id: { in: ids },
          role: "STUDENT",
        },
        data: {
          bypassExambro: Boolean(bypassExambro),
        },
      });

      return NextResponse.json({ success: true, count: updated.count });
    }

        if (action === "TOGGLE_GROUP_BYPASS_EXAMBRO") {
      const { id, bypassExambro } = body;
      if (!id) {
        return NextResponse.json({ error: "ID rombel/kelas wajib diisi" }, { status: 400 });
      }

      const updated = await prisma.group.update({
        where: { id },
        data: {
          bypassExambro: Boolean(bypassExambro),
          isPkl: Boolean(bypassExambro),
        },
      });

      return NextResponse.json({ success: true, group: updated });
    }

    if (action === "TOGGLE_BYPASS_EXAMBRO") {
      const { id, bypassExambro } = body;
      if (!id) {
        return NextResponse.json({ error: "ID siswa tidak boleh kosong" }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          bypassExambro: Boolean(bypassExambro),
        },
      });

      return NextResponse.json({ success: true, user: updated });
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

    // --- GENERATE SISWA DENGAN AI (OPENCODE / SMART FALLBACK) ---
    if (action === "GENERATE_AI_STUDENTS") {
      const {
        count = 10,
        groupId,
        prefix = "siswa",
        passwordType = "READABLE_WORD",
        customPassword = "",
        useAI = true,
      } = body;

      let className = "Umum";
      if (groupId) {
        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (group) className = group.name;
      }

      const { students: generated, source } = await generateStudentsWithAI({
        count: Number(count) || 10,
        groupId: groupId || null,
        className,
        prefix,
        passwordType,
        customPassword,
        useAI,
      });

      if (generated.length === 0) {
        return NextResponse.json({ error: "Gagal membuat data siswa AI" }, { status: 400 });
      }

      const created = await prisma.user.createMany({
        data: generated.map((s) => ({
          username: s.username,
          name: s.name,
          password: s.hashedPassword,
          nis: s.nis,
          role: "STUDENT",
          groupId: s.groupId || null,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      return NextResponse.json({
        success: true,
        count: created.count,
        source,
        credentials: generated.map((s) => ({
          name: s.name,
          username: s.username,
          password: s.plainPassword,
          nis: s.nis,
          className,
        })),
        message: `Berhasil membuat ${created.count} akun siswa secara otomatis menggunakan ${source === "AI_OPENCODE" ? "OpenCode AI" : "AI Smart Generator"}!`,
      });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
