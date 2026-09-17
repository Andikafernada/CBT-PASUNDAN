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

    // Jika examId spesifik diberikan, jangan paksa isSupplementary: false
    const examFindWhere: any = { ...examWhere };
    if (!examId) {
      examFindWhere.isSupplementary = false;
    }

    const exams = await prisma.exam.findMany({
      where: examFindWhere,
      include: {
        subject: {
          include: {
            _count: { select: { questions: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        examQuestions: { select: { id: true } },
        examGroups: {
          include: {
            group: {
              include: {
                users: {
                  where: { role: "STUDENT" },
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    nis: true,
                    groupId: true,
                    group: { select: { id: true, name: true, code: true, isPkl: true } },
                  },
                },
              },
            },
          },
        },
        examSessions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                nis: true,
                groupId: true,
                group: { select: { id: true, name: true, code: true, isPkl: true } },
              },
            },
            answers: {
              select: {
                questionId: true,
                isCorrect: true,
                isDoubtful: true,
                scoreAwarded: true,
                selectedOptionIds: true,
                textAnswer: true,
                matchingAnswer: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Bangun struktur baris rekap nilai
    const gradeRows: any[] = [];

    for (const exam of exams) {
      // Kumpulkan semua siswa dari kelas ujian
      const studentsInGroups: Map<string, { student: any; groupName: string; groupCode: string }> = new Map();
      for (const eg of exam.examGroups) {
        if (groupId && eg.groupId !== groupId) continue;
        for (const s of eg.group.users) {
          studentsInGroups.set(s.id, {
            student: s,
            groupName: eg.group.name,
            groupCode: eg.group.code,
          });
        }
      }

      const sessionByUserId = new Map(exam.examSessions.map((s) => [s.userId, s]));

      // Siswa dari kelas terdaftar
      for (const [userId, { student, groupName, groupCode }] of studentsInGroups) {
        const session = sessionByUserId.get(userId);
        gradeRows.push(buildGradeRow(exam, student, groupName, groupCode, session, exam.isSupplementary));
      }

      // Siswa yang punya sesi tapi tidak ada di daftar kelas
      for (const session of exam.examSessions) {
        if (!studentsInGroups.has(session.userId)) {
          const gName = session.user.group?.name || "-";
          const gCode = session.user.group?.code || "-";
          gradeRows.push(buildGradeRow(exam, session.user, gName, gCode, session, exam.isSupplementary));
        }
      }

      // Cek ujian susulan untuk ujian ini (hanya jika query umum tanpa examId spesifik)
      if (!examId && !exam.isSupplementary) {
        const supplementaryExams = await prisma.exam.findMany({
          where: { parentExamId: exam.id, isSupplementary: true },
          include: {
            subject: {
              include: {
                _count: { select: { questions: true } },
              },
            },
            createdBy: { select: { id: true, name: true } },
            examQuestions: { select: { id: true } },
            examSessions: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    nis: true,
                    groupId: true,
                    group: { select: { id: true, name: true, code: true, isPkl: true } },
                  },
                },
                answers: {
                  select: {
                    questionId: true,
                    isCorrect: true,
                    isDoubtful: true,
                    scoreAwarded: true,
                    selectedOptionIds: true,
                    textAnswer: true,
                    matchingAnswer: true,
                  },
                },
              },
            },
            examGroups: { include: { group: true } },
          },
        });

        for (const suppExam of supplementaryExams) {
          for (const session of suppExam.examSessions) {
            const matchedGroup = suppExam.examGroups.find((eg) => eg.groupId === session.user.groupId)?.group;
            const gName = matchedGroup?.name || session.user.group?.name || "-";
            const gCode = matchedGroup?.code || session.user.group?.code || "-";
            // Berikan suppExam sebagai objek exam agar examId sesuai dengan susulan
            gradeRows.push(buildGradeRow(suppExam, session.user, gName, gCode, session, true, exam.examGroups));
          }
        }
      }
    }

    if (format === "csv") {
      const csvHeader =
        "No,NIS,Nama Siswa,Jurusan,Kelas,Sesi,Ruang,Jalur,Mata Pelajaran,Guru,Judul Ujian,Tanggal Ujian,Status,Nilai,Jawaban Benar,Total Soal,Keterangan\n";
      const csvRows = gradeRows.map((r, i) =>
        [
          i + 1,
          r.nis || "-",
          `"${r.studentName}"`,
          `"${r.jurusan}"`,
          `"${r.groupName}"`,
          `"${r.sessionName}"`,
          `"${r.room}"`,
          `"${r.jalur}"`,
          `"${r.subjectName}"`,
          `"${r.teacherName}"`,
          `"${r.examTitle}"`,
          r.examDate,
          r.attendanceStatus,
          r.score !== null ? r.score : "-",
          r.correctCount || 0,
          r.totalQuestions || 40,
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

function extractJurusan(groupCode: string, groupName: string): string {
  const combined = `${groupCode} ${groupName}`.toUpperCase();
  if (combined.includes("TKRO") || combined.includes("KENDARAAN RINGAN") || combined.includes("TKR")) return "TKRO";
  if (combined.includes("TP") || combined.includes("PEMESINAN")) return "TP";
  if (combined.includes("TBSM") || combined.includes("SEPEDA MOTOR") || combined.includes("TSM")) return "TBSM";
  if (combined.includes("RPL") || combined.includes("PERANGKAT LUNAK")) return "RPL";
  if (combined.includes("TKJ") || combined.includes("JARINGAN")) return "TKJ";
  if (combined.includes("TITL") || combined.includes("LISTRIK")) return "TITL";
  if (combined.includes("TAV") || combined.includes("AUDIO VIDEO") || combined.includes("ELEKTRO")) return "TAV";
  return "UMUM";
}

function buildGradeRow(
  exam: any,
  student: any,
  groupName: string,
  groupCode: string,
  session: any | null,
  isSupplementary: boolean,
  parentExamGroups?: any[]
) {
  let attendanceStatus = "TIDAK_HADIR";
  let score: number | null = null;
  let note = "-";

  let answeredCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let doubtfulCount = 0;

  if (session) {
    score = session.score;
    if (session.status === "COMPLETED") {
      attendanceStatus = isSupplementary ? "HADIR_SUSULAN" : "HADIR";
      note = isSupplementary ? "Hadir Ujian Susulan" : "-";
    } else if (session.status === "FORCE_FINISHED") {
      attendanceStatus = "DIPAKSA_SELESAI";
      note = "Diselesaikan oleh Admin/Pengawas";
    } else if (session.status === "TIMEOUT") {
      attendanceStatus = "WAKTU_HABIS";
      note = "Waktu Ujian Habis (Auto Selesai)";
    } else if (session.status === "IN_PROGRESS") {
      attendanceStatus = "SEDANG_MENGERJAKAN";
      note = "Sesi masih berlangsung";
      score = null;
    }

    // Kalkulasi jawaban siswa dari array answers
    if (session.answers && Array.isArray(session.answers)) {
      session.answers.forEach((ans: any) => {
        let isAns = false;
        if (ans.selectedOptionIds && ans.selectedOptionIds !== "[]") isAns = true;
        if (ans.textAnswer && ans.textAnswer.trim() !== "") isAns = true;
        if (ans.matchingAnswer && ans.matchingAnswer !== "{}") isAns = true;

        if (isAns) {
          answeredCount++;
          if (ans.isCorrect === true) {
            correctCount++;
          } else if (ans.isCorrect === false) {
            incorrectCount++;
          }
        }
        if (ans.isDoubtful) doubtfulCount++;
      });
    }
  } else {
    note = "Tidak hadir, belum mengerjakan";
  }

  // Hitung total butir soal
  const totalQuestions =
    exam.examQuestions && exam.examQuestions.length > 0
      ? exam.examQuestions.length
      : exam.subject?._count?.questions || 40;

  // Tentukan Sesi dan Ruangan
  const matchedEg =
    exam.examGroups?.find((eg: any) => eg.groupId === student.groupId) ||
    parentExamGroups?.find((eg: any) => eg.groupId === student.groupId);

  const sessionName =
    matchedEg?.sessionName ||
    (isSupplementary || exam.isSupplementary ? "Susulan" : "Sesi 1");
  const room = matchedEg?.room || "-";

  const jurusan = extractJurusan(groupCode, groupName);
  const isPkl = (groupCode + " " + groupName).toUpperCase().includes("PKL") || Boolean(student.group?.isPkl);
  const isSusulan = isSupplementary || Boolean(student.bypassExambro && !isPkl);
  const jalur = isPkl ? "PKL (Smartphone HP)" : isSusulan ? "Susulan (Smartphone HP)" : "Reguler (PC Lab)";
  const track = isPkl ? "PKL" : isSusulan ? "SUSULAN" : "REGULER";

  return {
    examId: exam.id,
    examTitle: exam.title,
    subjectName: exam.subject?.name || "-",
    teacherName: exam.createdBy?.name || "-",
    examDate: exam.startTime ? new Date(exam.startTime).toLocaleDateString("id-ID") : "-",
    isSupplementary: Boolean(isSupplementary || exam.isSupplementary),
    studentId: student.id,
    studentName: student.name,
    username: student.username,
    nis: student.nis || "-",
    groupName,
    groupCode,
    jurusan,
    isPkl,
    isSusulan,
    track,
    jalur,
    sessionName,
    room,
    totalQuestions,
    answeredCount,
    correctCount,
    incorrectCount,
    doubtfulCount,
    session: session
      ? {
          id: session.id,
          status: session.status,
          finishedAt: session.finishedAt,
        }
      : null,
    attendanceStatus,
    score,
    note,
  };
}
