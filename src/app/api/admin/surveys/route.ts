import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const LIKERT_WEIGHTS: Record<string, number> = {
  SS: 5,
  S: 4,
  N: 3,
  TS: 2,
  STS: 1,
};

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "OPERATOR" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const groupId = searchParams.get("groupId");
    const search = searchParams.get("search");

    // Build filter where
    const where: any = {};

    if (subjectId && subjectId !== "ALL") {
      where.subjectId = subjectId;
    }

    if (groupId && groupId !== "ALL") {
      where.user = {
        groupId: groupId,
      };
    }

    if (search && search.trim() !== "") {
      const q = search.trim();
      where.user = {
        ...(where.user || {}),
        OR: [
          { name: { contains: q } },
          { nis: { contains: q } },
          { username: { contains: q } },
        ],
      };
    }

    // Fetch surveys
    const surveys = await prisma.learningSurvey.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nis: true,
            username: true,
            group: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Calculate aggregated statistics
    const totalRespondents = surveys.length;
    const questionsStats: Record<string, any> = {};

    for (let i = 1; i <= 7; i++) {
      const key = `q${i}`;
      const counts: Record<string, number> = { SS: 0, S: 0, N: 0, TS: 0, STS: 0 };
      let totalWeight = 0;

      surveys.forEach((s: any) => {
        const val = s[key];
        if (counts[val] !== undefined) {
          counts[val]++;
          totalWeight += LIKERT_WEIGHTS[val] || 3;
        }
      });

      const avgScore = totalRespondents > 0 ? Number((totalWeight / totalRespondents).toFixed(2)) : 0;
      const satisfactionRate = totalRespondents > 0
        ? Number((((counts.SS + counts.S) / totalRespondents) * 100).toFixed(1))
        : 0;

      questionsStats[key] = {
        counts,
        avgScore,
        satisfactionRate,
      };
    }

    // Calculate overall average
    let grandWeight = 0;
    Object.values(questionsStats).forEach((st: any) => {
      grandWeight += st.avgScore;
    });
    const overallAvg = Number((grandWeight / 7).toFixed(2));

    // Fetch list of subjects and groups for filters
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    const groups = await prisma.group.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      totalRespondents,
      overallAvg,
      questionsStats,
      surveys,
      subjects,
      groups,
    });
  } catch (error: any) {
    console.error("Error fetching admin survey reports:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
