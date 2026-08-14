import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { getGeminiJsonModel } from "@/lib/gemini";

type GeneratedQuestion = {
  question: string;
  answerKeywords: string[];
  linkedExhibitIds: string[];
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
          id: String(item?.id || "").trim(),
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

Use as much clinically relevant context from the title, level, stem, objectives, marking criteria and exhibits as possible across the complete sequence. Do not ignore supplied facts, but distribute context naturally between questions instead of repeating the whole stem. The sequence must feel like a real examiner-candidate conversation. Each prompt should be concise, usually one sentence and ideally under 18 words after any necessary case update. Give only the minimum context needed for that turn. Do not list multiple clues, expected answer components, differential diagnoses, management steps or teaching hints in the prompt. Never turn the marking keywords into hints. Ask exactly one primary clinical task at a time, with a focused follow-up only when needed.

Do not generate a greeting, ask the candidate's name, or include a candidate name in these saved clinical questions. The runtime greets the candidate before question one using the authenticated profile name or the name collected on the viva start screen. Question one here must be the first real clinical question after that greeting.

Use the supplied case facts without inventing patient findings, results or exhibit details. If information is absent, ask what the candidate would do or seek next. Progress naturally through interpretation, assessment, decisions, management, complications, safety and follow-up only when clinically relevant; do not mechanically cover every category.

Exhibits are optional. Link an exhibit only when the examiner explicitly asks the candidate to view or interpret it. When linked, briefly introduce what the candidate has just performed or is being shown, then ask for interpretation. Do not repeat every detail from the exhibit description or reveal the conclusion. A good style is: "You've performed a flexible cystoscopy and are shown this finding. What is your interpretation?" Questions that do not need an exhibit must return an empty linkedExhibitIds array.

Mode: ${mode}
Pacing: ${pace}
Title: ${title || "Untitled case"}
Candidate level: ${level}
Case stem: ${stem}
Objectives: ${JSON.stringify(objectives)}
Must mention: ${JSON.stringify(mustMention)}
Critical fail points: ${JSON.stringify(criticalFail)}
Available exhibits (use only these exact IDs): ${JSON.stringify(exhibits)}

Return only this JSON shape:
{
  "questions": [
    {
      "question": "one natural examiner prompt",
      "answerKeywords": ["3 to 6 concise internal marking keywords"],
      "linkedExhibitIds": ["zero or one exact available exhibit ID"]
    }
  ]
}
`);

    const parsed = JSON.parse(result.response.text()) as { questions?: unknown };
    if (!Array.isArray(parsed.questions)) throw new Error("AI returned an invalid question list");

    const validExhibitIds = new Set(
      exhibits.map((exhibit: { id: string }) => exhibit.id).filter(Boolean)
    );
    const questions: GeneratedQuestion[] = parsed.questions
      .map((item: Record<string, unknown>) => ({
        question: String(item?.question || "").trim(),
        answerKeywords: Array.isArray(item?.answerKeywords)
          ? Array.from(new Set(item.answerKeywords.map(String).map((keyword) => keyword.trim()).filter(Boolean))).slice(0, 12)
          : [],
        linkedExhibitIds: Array.isArray(item?.linkedExhibitIds)
          ? Array.from(new Set(item.linkedExhibitIds.map(String).map((id) => id.trim()).filter((id) => validExhibitIds.has(id)))).slice(0, 1)
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
