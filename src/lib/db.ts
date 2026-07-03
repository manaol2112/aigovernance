import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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
const MATURITY_DELEGATES = ["maturitySurvey", "maturitySurveyResponse"] as const;

function hasDelegate(client: PrismaClient, key: string): boolean {
  if (Object.prototype.hasOwnProperty.call(client, key)) return true;
  const delegate = (client as Record<string, unknown>)[key];
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

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;

  if (cached && isCorePrismaReady(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => {
      /* replacing stale singleton */
    });
  }

  const client = createPrismaClient();

  if (!isCorePrismaReady(client)) {
    throw new Error(
      "Prisma client is missing core models. Run `npx prisma generate` and restart the dev server."
    );
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

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
}

export function isDatabaseSetupError(error: unknown): boolean {
  if (error instanceof PrismaNotReadyError) return true;
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    return code === "P2021" || code === "P1010";
  }
  return false;
}
