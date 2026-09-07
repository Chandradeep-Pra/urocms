import { createFastQuestion, type VivaQuestionConfig } from "@/components/viva/types";

/** Fill vacant slots only; preserve authored questions and their IDs verbatim. */
export function fillRemainingQuestions(
  current: VivaQuestionConfig[],
  generated: Array<Omit<VivaQuestionConfig, "id">>,
  questionCount = current.length,
) {
  const seen = new Set(current.map(item => item.question.trim().toLowerCase()).filter(Boolean));
  const available = generated.filter(item => {
    const key = item.question.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  let next = 0;
  const slots = [...current];
  while (slots.length < questionCount) slots.push(createFastQuestion());
  return slots.map(item => {
    if (item.question.trim() || next >= available.length) return item;
    return { ...item, ...available[next++], id: item.id };
  });
}
