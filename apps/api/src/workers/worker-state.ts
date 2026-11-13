import { prisma } from "@tron-gas-sponsor/database";

export async function markWorkerRun(
  workerName: string,
  input: {
    ok: boolean;
    cursor?: string | null;
    error?: string | null;
  },
): Promise<void> {
  const now = new Date();
  await prisma.workerState.upsert({
    where: { workerName },
    create: {
      workerName,
      lastRunAt: now,
      lastSuccessAt: input.ok ? now : null,
      lastError: input.error ?? null,
      cursor: input.cursor ?? null,
      isHealthy: input.ok,
    },
    update: {
      lastRunAt: now,
      lastSuccessAt: input.ok ? now : undefined,
      lastError: input.error ?? null,
      cursor: input.cursor === undefined ? undefined : input.cursor,
      isHealthy: input.ok,
    },
  });
}

export async function getWorkerCursor(
  workerName: string,
): Promise<string | null> {
  const row = await prisma.workerState.findUnique({
    where: { workerName },
    select: { cursor: true },
  });
  return row?.cursor ?? null;
}
