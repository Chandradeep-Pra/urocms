import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { getGeminiJsonModel } from "@/lib/gemini";

type GeneratedQuestion = {
  question: string;
  answerKeywords: string[];
};

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const body = await req.json();
    const stem = String(body?.stem || "").trim();
    const title = String(body?.title || "").trim();
    const level = String(body?.level || "Intermediate").trim();
    const mode = body?.mode === "fastAndFurious" ? "fastAndFurious" : "calmAndComposed";
    const questionCount = Math.min(15, Math.max(1, Number(body?.questionCount) || 3));
    const objectives = Array.isArray(body?.objectives)
      ? body.objectives.map(String).map((item: string) => item.trim()).filter(Boolean).slice(0, 20)
      : [];
    const mustMention = Array.isArray(body?.mustMention)
      ? body.mustMention.map(String).map((item: string) => item.trim()).filter(Boolean).slice(0, 20)
      : [];
    const criticalFail = Array.isArray(body?.criticalFail)
      ? body.criticalFail.map(String).map((item: string) => item.trim()).filter(Boolean).slice(0, 20)
      : [];
    const exhibits = Array.isArray(body?.exhibits)
      ? body.exhibits.slice(0, 20).map((item: Record<string, unknown>) => ({
          label: String(item?.label || "").trim(),
          description: String(item?.description || "").trim(),
        }))
      : [];

    if (!stem) {
      return NextResponse.json({ error: "Add a case stem before generating questions" }, { status: 400 });
    }

    const pace = mode === "calmAndComposed"
      ? "calm, progressive and conversational; allow deeper clinical reasoning and follow-up"
      : "brief, direct and rapid-fire; each question should have a focused answer";
    const model = getGeminiJsonModel();
    const result = await model.generateContent(`
You are an expert medical viva examiner. Create exactly ${questionCount} clinically accurate viva questions for the supplied case.

The sequence must feel like a real examiner-candidate conversation: begin with assessment or interpretation, then progress logically through differential diagnosis, investigations, decisions, management, complications, safety and follow-up when relevant. Questions must be answerable from accepted clinical knowledge and the supplied case. Do not invent patient findings, test results or exhibit details. If information is absent, ask what the candidate would do or seek next. Avoid duplicate questions and avoid giving away the answer in the question.

Mode: ${mode}
Pacing: ${pace}
Title: ${title || "Untitled case"}
Candidate level: ${level}
Case stem: ${stem}
Objectives: ${JSON.stringify(objectives)}
Must mention: ${JSON.stringify(mustMention)}
Critical fail points: ${JSON.stringify(criticalFail)}
Available exhibit descriptions: ${JSON.stringify(exhibits)}

Return only this JSON shape:
{
  "questions": [
    {
      "question": "one natural examiner prompt",
      "answerKeywords": ["3 to 8 concise marking keywords"]
    }
  ]
}
`);

    const parsed = JSON.parse(result.response.text()) as { questions?: unknown };
    if (!Array.isArray(parsed.questions)) throw new Error("AI returned an invalid question list");

    const questions: GeneratedQuestion[] = parsed.questions
      .map((item: Record<string, unknown>) => ({
        question: String(item?.question || "").trim(),
        answerKeywords: Array.isArray(item?.answerKeywords)
          ? Array.from(new Set(item.answerKeywords.map(String).map((keyword) => keyword.trim()).filter(Boolean))).slice(0, 12)
          : [],
      }))
      .filter((item: GeneratedQuestion) => item.question)
      .slice(0, questionCount);

    if (!questions.length) throw new Error("AI did not generate usable questions");
    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Viva question generation error:", error);
    const message = error instanceof Error ? error.message : "Question generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
