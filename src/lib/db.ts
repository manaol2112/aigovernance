import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  maturitySchemaVersion?: number;
};

/** Bump when survey/workshop/register schema changes so dev hot-reload drops stale clients. */
const MATURITY_SCHEMA_VERSION = 18;

/** Models every page needs — keep minimal so hot-reload never bricks unrelated routes. */
const CORE_DELEGATES = [
  "assessment",
  "canonicalControl",
  "framework",
  "appSetting",
  "aISystem",
  "governanceEvidence",
  "controlDependency",
  "reviewerDisagreement",
  "governanceInitiative",
] as const;

/** Newer models — checked only where used (maturity survey). */
const MATURITY_DELEGATES = [
  "maturitySurvey",
  "maturitySurveyResponse",
  "maturitySurveyDocumentResponse",
  "questionPack",
  "question",
  "questionPackPillarWeight",
  "maturitySurveyPackQuestion",
  "maturitySurveyPackResponse",
] as const;

/** Guided workshop models — checked on workshop routes/APIs. */
const GUIDED_WORKSHOP_DELEGATES = [
  "guidedWorkshop",
  "guidedWorkshopResponse",
  "guidedWorkshopPackQuestion",
  "guidedWorkshopPackResponse",
] as const;

/** AI System Register prototype — independent of Full Assessment. */
const AI_REGISTER_DELEGATES = [
  "organization",
  "organizationMember",
  "aiSystemRegisterItem",
  "aiSystemRiskAssessment",
  "aiSystemEvidence",
  "aiSystemRegisterChangeLog",
] as const;

function hasDelegate(client: PrismaClient, key: string): boolean {
  if (Object.prototype.hasOwnProperty.call(client, key)) return true;
  const delegate = (client as unknown as Record<string, unknown>)[key];
  return typeof delegate === "object" && delegate !== null;
}

function getResolvedClient(): PrismaClient {
  return getPrismaClient();
}

function isCorePrismaReady(client: PrismaClient): boolean {
  return CORE_DELEGATES.every((key) => hasDelegate(client, key));
}

function isMaturityPrismaReady(client: PrismaClient): boolean {
  return MATURITY_DELEGATES.every((key) => hasDelegate(client, key));
}

function isGuidedWorkshopPrismaReady(client: PrismaClient): boolean {
  return GUIDED_WORKSHOP_DELEGATES.every((key) => hasDelegate(client, key));
}

function isAiRegisterPrismaReady(client: PrismaClient): boolean {
  return AI_REGISTER_DELEGATES.every((key) => hasDelegate(client, key));
}

function isMaturitySchemaCurrent(): boolean {
  const surveyFields = Prisma.MaturitySurveyScalarFieldEnum;
  const settingFields = Prisma.AppSettingScalarFieldEnum;
  return (
    "parentSurveyId" in surveyFields &&
    "focusPillarIds" in surveyFields &&
    "questionCatalogSource" in surveyFields &&
    "maturityQuestionCatalogSource" in settingFields
  );
}

function isGuidedWorkshopSchemaCurrent(): boolean {
  if (!("GuidedWorkshopScalarFieldEnum" in Prisma)) return false;
  const fields = Prisma.GuidedWorkshopScalarFieldEnum;
  return "questionCatalogSource" in fields;
}

function prismaModelNames(): Set<string> {
  try {
    const models = Prisma.dmmf?.datamodel?.models ?? [];
    return new Set(models.map((model) => model.name));
  } catch {
    return new Set();
  }
}

function registerItemHasField(field: string): boolean {
  try {
    const fields = Prisma.AiSystemRegisterItemScalarFieldEnum as
      | Record<string, string>
      | undefined;
    if (!fields) return false;
    return field in fields || Boolean(fields[field]);
  } catch {
    return false;
  }
}

function isAiRegisterSchemaCurrent(): boolean {
  const models = prismaModelNames();
  if (models.size > 0) {
    return (
      models.has("Organization") &&
      models.has("OrganizationMember") &&
      models.has("AiSystemRegisterItem") &&
      models.has("AiSystemRiskAssessment") &&
      models.has("AiSystemEvidence") &&
      models.has("AiSystemRegisterChangeLog") &&
      registerItemHasField("keyControlCodes") &&
      registerItemHasField("riskAcceptanceStatus") &&
      registerItemHasField("aiCapabilities") &&
      registerItemHasField("businessCriticality") &&
      registerItemHasField("assessmentSuite")
    );
  }

  // Fallback when DMMF is unavailable in a bundled runtime.
  try {
    return (
      Boolean(Prisma.OrganizationScalarFieldEnum) &&
      Boolean(Prisma.OrganizationMemberScalarFieldEnum) &&
      Boolean(Prisma.AiSystemRegisterItemScalarFieldEnum) &&
      Boolean(Prisma.AiSystemEvidenceScalarFieldEnum) &&
      Boolean(Prisma.AiSystemRegisterChangeLogScalarFieldEnum) &&
      registerItemHasField("keyControlCodes") &&
      registerItemHasField("riskAcceptanceStatus") &&
      registerItemHasField("aiCapabilities") &&
      registerItemHasField("businessCriticality") &&
      registerItemHasField("assessmentSuite")
    );
  } catch {
    return false;
  }
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = withConnectionLimit(process.env.DATABASE_URL);

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(databaseUrl
      ? {
          datasources: {
            db: { url: databaseUrl },
          },
        }
      : {}),
  });
}

/** Cap pool size so App Platform workers don't exhaust DO Postgres connection slots. */
function withConnectionLimit(databaseUrl: string | undefined): string | undefined {
  if (!databaseUrl || databaseUrl.includes("connection_limit=")) return databaseUrl;
  const limit = process.env.NODE_ENV === "production" ? "3" : "10";
  const separator = databaseUrl.includes("?") ? "&" : "?";
  return `${databaseUrl}${separator}connection_limit=${limit}`;
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  const schemaCurrent =
    isMaturitySchemaCurrent() &&
    isGuidedWorkshopSchemaCurrent() &&
    isAiRegisterSchemaCurrent();

  if (
    cached &&
    isCorePrismaReady(cached) &&
    schemaCurrent &&
    isGuidedWorkshopPrismaReady(cached) &&
    isAiRegisterPrismaReady(cached) &&
    globalForPrisma.maturitySchemaVersion === MATURITY_SCHEMA_VERSION
  ) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => {
      /* replacing stale singleton */
    });
    globalForPrisma.prisma = undefined;
  }

  if (!schemaCurrent) {
    const missing = [
      !isMaturitySchemaCurrent() ? "maturity survey fields" : null,
      !isGuidedWorkshopSchemaCurrent() ? "guided workshop models" : null,
      !isAiRegisterSchemaCurrent() ? "AI System Register models" : null,
    ]
      .filter(Boolean)
      .join(", ");
    throw new PrismaNotReadyError(
      `Prisma client is out of date (missing ${missing || "schema fields"}). Run \`npx prisma generate\`, restart the dev server (\`npm run dev\`), then try again.`
    );
  }

  const client = createPrismaClient();

  if (!isCorePrismaReady(client)) {
    throw new Error(
      "Prisma client is missing core models. Run `npx prisma generate` and restart the dev server."
    );
  }

  if (!isGuidedWorkshopPrismaReady(client)) {
    throw new PrismaNotReadyError(
      "Guided workshop models are not in the Prisma client. Run `npx prisma generate` and restart the dev server."
    );
  }

  if (!isAiRegisterPrismaReady(client)) {
    throw new PrismaNotReadyError(
      "AI System Register models are not in the Prisma client. Run `npx prisma generate` and restart the dev server."
    );
  }

  globalForPrisma.prisma = client;
  globalForPrisma.maturitySchemaVersion = MATURITY_SCHEMA_VERSION;

  return client;
}

/** Lazy singleton — recovers after `prisma generate` without re-importing this module. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export class PrismaNotReadyError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "Database client is out of date. Run `npx prisma generate` (or `npm run dev`) and refresh."
    );
    this.name = "PrismaNotReadyError";
  }
}

/** Call before using maturity survey models in API routes or server components. */
export function assertPrismaReady(): void {
  const client = getResolvedClient();
  if (!isCorePrismaReady(client)) {
    throw new PrismaNotReadyError();
  }
  if (!isMaturityPrismaReady(client)) {
    throw new PrismaNotReadyError(
      "Maturity survey models are not in the Prisma client. Run `npx prisma generate` and restart the dev server."
    );
  }
  if (!isMaturitySchemaCurrent()) {
    throw new PrismaNotReadyError(
      "Prisma client is missing maturity survey continuation fields. Run `npx prisma generate`, restart the dev server (`npm run dev`), then try again."
    );
  }
}

/** Call before using guided workshop models in API routes or server components. */
export function assertGuidedWorkshopPrismaReady(): void {
  const client = getResolvedClient();
  if (!isCorePrismaReady(client)) {
    throw new PrismaNotReadyError();
  }
  if (!isGuidedWorkshopPrismaReady(client)) {
    throw new PrismaNotReadyError(
      "Guided workshop models are not in the Prisma client. Run `npx prisma generate` and restart the dev server."
    );
  }
  if (!isGuidedWorkshopSchemaCurrent()) {
    throw new PrismaNotReadyError(
      "Prisma client is missing guided workshop models. Run `npx prisma generate`, restart the dev server (`npm run dev`), then try again."
    );
  }
}

/** Call before using AI System Register models in API routes or server components. */
export function assertAiRegisterPrismaReady(): void {
  const client = getResolvedClient();
  if (!isCorePrismaReady(client)) {
    throw new PrismaNotReadyError();
  }
  if (!isAiRegisterPrismaReady(client) || !isAiRegisterSchemaCurrent()) {
    throw new PrismaNotReadyError(
      "AI System Register models are not in the Prisma client. Run `npx prisma generate`, restart the dev server (`npm run dev`), then try again."
    );
  }
}

export function isDatabaseSetupError(error: unknown): boolean {
  if (error instanceof PrismaNotReadyError) return true;
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    return code === "P2021" || code === "P1010";
  }
  return false;
}
