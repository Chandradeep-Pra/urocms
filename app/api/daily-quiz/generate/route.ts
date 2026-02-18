import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini"; // your gemini instance

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "Topic required" },
        { status: 400 }
      );
    }

    const prompt = `
You are a senior FRCS Urology examiner.

Generate ONE high-quality multiple choice question for "Quiz of the Day".

Topic: ${topic}

Requirements:
- Clinical scenario based
- 4 options only
- One correct answer
- Clear educational explanation
- High-yield learning value

Return STRICT JSON only (no markdown, no commentary):

{
  "question": "string",
  "options": ["string", "string", "string", "string"],
  "correctIndex": number (0-3),
  "explanation": "string"
}
`;

    const result = await geminiModel.generateContent(prompt);
    const raw = result.response.text();

    // 🔐 Clean Gemini output (sometimes adds ```json)
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid format" },
        { status: 500 }
      );
    }

    // 🛡️ Basic validation
    if (
      !parsed.question ||
      !Array.isArray(parsed.options) ||
      parsed.options.length !== 4
    ) {
      return NextResponse.json(
        { error: "Invalid AI structure" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quiz: {
        question: parsed.question,
        image: "",
        options: parsed.options,
        correctIndex: parsed.correctIndex ?? 0,
        explanation: parsed.explanation ?? "",
      },
    });

  } catch (error) {
    console.error("AI Generate Error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
