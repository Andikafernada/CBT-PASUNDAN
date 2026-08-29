import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET /api/admin/grades
// Query params:
//   subjectId, groupId, examId, teacherId (Super Admin/Operator only)
//   format=csv (untuk export)

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const groupId = searchParams.get("groupId");
    const examId = searchParams.get("examId");
    const teacherId = searchParams.get("teacherId");
    const format = searchParams.get("format");

    // Filter berdasarkan role
    let examWhere: any = {};

    if (user.role === "TEACHER") {
      // Guru dapat melihat ujian yang dia buat, mapel yang diampunya, atau mapel tempat dia membuat bank soal
      const assignments = await prisma.teacherAssignment.findMany({
        where: { userId: user.id },
        select: { subjectId: true },
      });
      const assignedSubjectIds = assignments.filter((a) => a.subjectId).map((a) => a.subjectId!);

      const teacherQuestions = await prisma.question.findMany({
        where: { createdByUserId: user.id },
        select: { subjectId: true },
        distinct: ["subjectId"],
      });
      const questionSubjectIds = teacherQuestions.map((q) => q.subjectId);

      const allAllowedSubjectIds = Array.from(new Set([...assignedSubjectIds, ...questionSubjectIds]));

      examWhere.OR = [
        { createdByUserId: user.id },
        ...(allAllowedSubjectIds.length > 0 ? [{ subjectId: { in: allAllowedSubjectIds } }] : []),
      ];
    }

    // Optional filters
    if (subjectId) examWhere.subjectId = subjectId;
    if (examId) examWhere.id = examId;
    if (teacherId && (user.role === "ADMIN" || user.role === "OPERATOR")) {
      examWhere.createdByUserId = teacherId;
    }

    const exams = await prisma.exam.findMany({
      where: { ...examWhere, isSupplementary: false },
      include: {
        subject: true,
        createdBy: { select: { id: true, name: true } },
        examGroups: {
          include: {
            group: {
              include: {
                users: {
                  where: { role: "STUDENT" },
                  select: { id: true, name: true, username: true, nis: true },
                },
              },
            },
          },
        },
        examSessions: {
          include: {
            user: { select: { id: true, name: true, username: true, nis: true, groupId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Bangun struktur baris rekap nilai
    const gradeRows: any[] = [];

    for (const exam of exams) {
      // Kumpulkan semua siswa dari kelas ujian
      const studentsInGroups: Map<string, { student: any; groupName: string }> = new Map();
      for (const eg of exam.examGroups) {
        if (groupId && eg.groupId !== groupId) continue;
        for (const s of eg.group.users) {
          studentsInGroups.set(s.id, { student: s, groupName: eg.group.name });
        }
      }

      const sessionByUserId = new Map(exam.examSessions.map((s) => [s.userId, s]));

      // Siswa dari kelas
      for (const [userId, { student, groupName }] of studentsInGroups) {
        const session = sessionByUserId.get(userId);
        gradeRows.push(buildGradeRow(exam, student, groupName, session, false));
      }

      // Siswa yang punya sesi tapi tidak ada di daftar kelas
      for (const session of exam.examSessions) {
        if (!studentsInGroups.has(session.userId)) {
          gradeRows.push(buildGradeRow(exam, session.user, session.user.groupId || "-", session, false));
        }
      }

      // Cek ujian susulan untuk ujian ini
      const supplementaryExams = await prisma.exam.findMany({
        where: { parentExamId: exam.id, isSupplementary: true },
        include: {
          examSessions: {
            include: { user: { select: { id: true, name: true, username: true, nis: true, groupId: true } } },
          },
          examGroups: { include: { group: true } },
        },
      });

      for (const suppExam of supplementaryExams) {
        for (const session of suppExam.examSessions) {
          const groupName = suppExam.examGroups.find((eg) => eg.groupId === session.user.groupId)?.group.name || "-";
          gradeRows.push(buildGradeRow(exam, session.user, groupName, session, true));
        }
      }
    }

    if (format === "csv") {
      const csvHeader = "No,NIS,Nama Siswa,Kelas,Mata Pelajaran,Guru,Judul Ujian,Tanggal Ujian,Status,Nilai,Keterangan\n";
      const csvRows = gradeRows.map((r, i) =>
        [
          i + 1,
          r.nis || "-",
          `"${r.studentName}"`,
          `"${r.groupName}"`,
          `"${r.subjectName}"`,
          `"${r.teacherName}"`,
          `"${r.examTitle}"`,
          r.examDate,
          r.attendanceStatus,
          r.score !== null ? r.score : "-",
          `"${r.note}"`,
        ].join(",")
      ).join("\n");

      return new NextResponse(csvHeader + csvRows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="rekap-nilai-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ grades: gradeRows, total: gradeRows.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function buildGradeRow(exam: any, student: any, groupName: string, session: any | null, isSupplementary: boolean) {
  let attendanceStatus = "TIDAK_HADIR";
  let score: number | null = null;
  let note = "-";

  if (session) {
    score = session.score;
    if (session.status === "COMPLETED") {
      attendanceStatus = isSupplementary ? "HADIR_SUSULAN" : "HADIR";
      note = isSupplementary ? "Hadir Ujian Susulan" : "-";
    } else if (session.status === "FORCE_FINISHED") {
      attendanceStatus = "DIPAKSA_SELESAI";
      note = "Dipaksa Selesai oleh Admin/Guru";
    } else if (session.status === "TIMEOUT") {
      attendanceStatus = "WAKTU_HABIS";
      note = "Waktu Ujian Habis (Auto Selesai)";
    } else if (session.status === "IN_PROGRESS") {
      attendanceStatus = "SEDANG_MENGERJAKAN";
      note = "Sesi masih berlangsung";
      score = null;
    }
  } else {
    note = "Tidak hadir, belum mengerjakan";
  }

  return {
    examId: exam.id,
    examTitle: exam.title,
    subjectName: exam.subject?.name || "-",
    teacherName: exam.createdBy?.name || "-",
    examDate: exam.startTime ? new Date(exam.startTime).toLocaleDateString("id-ID") : "-",
    isSupplementary,
    studentId: student.id,
    studentName: student.name,
    username: student.username,
    nis: student.nis || "-",
    groupName,
    session: session ? {
      id: session.id,
      status: session.status,
      finishedAt: session.finishedAt,
    } : null,
    attendanceStatus,
    score,
    note,
  };
}
