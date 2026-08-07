import { prisma } from "@/lib/db";

export type StoredCustomFollowUp = {
  id: string;
  text: string;
  createdAt: string;
};

export type ControlCustomFollowUps = {
  questions: StoredCustomFollowUp[];
  updatedAt: string;
};

export type FollowUpQuestionsStore = Record<string, ControlCustomFollowUps>;

function parseStore(raw: unknown): FollowUpQuestionsStore {
  if (!raw || typeof raw !== "object") return {};
  const store: FollowUpQuestionsStore = {};
  for (const [controlId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as { questions?: unknown; updatedAt?: string };
    const questions: StoredCustomFollowUp[] = [];
    if (Array.isArray(v.questions)) {
      for (const q of v.questions) {
        if (typeof q === "string" && q.trim()) {
          questions.push({
            id: `legacy-${questions.length}`,
            text: q.trim(),
            createdAt: v.updatedAt ?? new Date().toISOString(),
          });
        } else if (q && typeof q === "object") {
          const o = q as Partial<StoredCustomFollowUp>;
          if (typeof o.text === "string" && o.text.trim()) {
            questions.push({
              id: o.id ?? `custom-${questions.length}`,
              text: o.text.trim(),
              createdAt: o.createdAt ?? new Date().toISOString(),
            });
          }
        }
      }
    }
    store[controlId] = {
      questions,
      updatedAt: v.updatedAt ?? new Date().toISOString(),
    };
  }
  return store;
}

export async function loadFollowUpQuestionsStore(
  assessmentId: string
): Promise<FollowUpQuestionsStore> {
  const repo = await prisma.assessmentRepository.findUnique({
    where: { assessmentId },
    select: { followUpQuestions: true },
  });
  return parseStore(repo?.followUpQuestions);
}

export async function saveFollowUpQuestionsStore(
  assessmentId: string,
  store: FollowUpQuestionsStore
): Promise<void> {
  await prisma.assessmentRepository.upsert({
    where: { assessmentId },
    create: {
      assessmentId,
      followUpQuestions: store,
    },
    update: {
      followUpQuestions: store,
    },
  });
}

export async function addCustomFollowUpQuestion(
  assessmentId: string,
  controlId: string,
  text: string
): Promise<StoredCustomFollowUp> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Question text is required");

  const store = await loadFollowUpQuestionsStore(assessmentId);
  const entry = store[controlId] ?? { questions: [], updatedAt: new Date().toISOString() };
  const item: StoredCustomFollowUp = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed,
    createdAt: new Date().toISOString(),
  };
  entry.questions.push(item);
  entry.updatedAt = new Date().toISOString();
  store[controlId] = entry;
  await saveFollowUpQuestionsStore(assessmentId, store);
  return item;
}

export async function removeCustomFollowUpQuestion(
  assessmentId: string,
  controlId: string,
  questionId: string
): Promise<void> {
  const store = await loadFollowUpQuestionsStore(assessmentId);
  const entry = store[controlId];
  if (!entry) return;
  entry.questions = entry.questions.filter((q) => q.id !== questionId);
  entry.updatedAt = new Date().toISOString();
  store[controlId] = entry;
  await saveFollowUpQuestionsStore(assessmentId, store);
}
