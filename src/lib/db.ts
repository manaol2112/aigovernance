import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  maturitySchemaVersion?: number;
};

/** Bump when survey/workshop schema changes so dev hot-reload drops stale clients. */
const MATURITY_SCHEMA_VERSION = 4;

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
] as const;

/** Guided workshop models — checked on workshop routes/APIs. */
const GUIDED_WORKSHOP_DELEGATES = ["guidedWorkshop", "guidedWorkshopResponse"] as const;

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

function isMaturitySchemaCurrent(): boolean {
  const fields = Prisma.MaturitySurveyScalarFieldEnum;
  return "parentSurveyId" in fields && "focusPillarIds" in fields;
}

function isGuidedWorkshopSchemaCurrent(): boolean {
  return "GuidedWorkshopScalarFieldEnum" in Prisma;
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
  const schemaCurrent = isMaturitySchemaCurrent() && isGuidedWorkshopSchemaCurrent();

  if (
    cached &&
    isCorePrismaReady(cached) &&
    schemaCurrent &&
    isGuidedWorkshopPrismaReady(cached) &&
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
    throw new PrismaNotReadyError(
      "Prisma client is out of date (missing survey or workshop models). Run `npx prisma generate`, restart the dev server (`npm run dev`), then try again."
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

export function isDatabaseSetupError(error: unknown): boolean {
  if (error instanceof PrismaNotReadyError) return true;
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    return code === "P2021" || code === "P1010";
  }
  return false;
}
