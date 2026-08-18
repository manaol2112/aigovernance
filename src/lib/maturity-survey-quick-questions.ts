/**
 * Executive-friendly critical question per risk pillar (quick scan mode).
 * Client-safe — no server dependencies.
 */

export type PillarCriticalQuestion = {
  prompt: string;
  subtitle: string;
};

export const PILLAR_CRITICAL_QUESTIONS: Record<string, PillarCriticalQuestion> = {
  governance: {
    prompt: "How mature is your AI governance — board oversight, policies, roles, and accountability?",
    subtitle: "Covers board engagement, AI policy, risk appetite, and clear ownership for AI decisions.",
  },
  compliance: {
    prompt: "How mature is your AI documentation, logging, and traceability for regulatory and audit needs?",
    subtitle: "Spans technical documentation, records of processing, and quality management evidence.",
  },
  "safety-reliability": {
    prompt: "How confident are you in the safety, accuracy, reliability, and security of AI outputs and behavior?",
    subtitle: "Addresses harm prevention, robustness testing, adversarial risk, and resilience under edge cases.",
  },
  oversight: {
    prompt: "How effective is human oversight — monitoring, override, escalation, and incident response?",
    subtitle: "Includes human-in-the-loop design, operational monitoring, and response to AI incidents.",
  },
  systemic: {
    prompt: "How do you evaluate and govern systemic or large-scale societal risks from AI (including GPAI)?",
    subtitle: "Relevant when deploying or building general-purpose or high-reach AI capabilities.",
  },
  "supply-chain": {
    prompt: "How do you assess and govern third-party AI, vendors, and ecosystem dependencies in your supply chain?",
    subtitle: "Includes vendor due diligence, contractual controls, partner risk, and dependency management.",
  },
  transparency: {
    prompt: "How transparent are your AI systems to users and stakeholders about capabilities and limitations?",
    subtitle: "Covers disclosure, explainability, and appropriate communication when AI is in use.",
  },
  fairness: {
    prompt: "How effectively do you identify and mitigate bias and fairness risks in AI systems?",
    subtitle: "Includes impact assessments, protected groups, and fundamental rights considerations.",
  },
  "privacy-data": {
    prompt: "How strong is your data governance for AI — quality, provenance, privacy, and lifecycle controls?",
    subtitle: "Spans data collection, minimization, retention, and lawful processing for model training and inference.",
  },
  workforce: {
    prompt: "How ready is your workforce — roles, training, and human capital — to operate AI responsibly?",
    subtitle: "Covers competency requirements, training programs, interdisciplinary teams, and role clarity.",
  },
  "financial-resilience": {
    prompt: "How prepared are you for financial and operational disruption from AI failures or dependencies?",
    subtitle: "Includes business continuity, resilience planning, decommissioning, and sustainability of AI operations.",
  },
};

export function getPillarCriticalQuestion(pillarId: string): PillarCriticalQuestion {
  return (
    PILLAR_CRITICAL_QUESTIONS[pillarId] ?? {
      prompt: "How would you rate maturity for this AI governance pillar?",
      subtitle: "Consider policies, practices, evidence, and consistent execution.",
    }
  );
}
