import { PrismaClient } from "@prisma/client";

const resolvedUrl = process.env.DATABASE_URL_POOLER?.trim() || process.env.DATABASE_URL?.trim();
if (resolvedUrl) process.env.DATABASE_URL = resolvedUrl;

const prisma = new PrismaClient();

async function main() {
  const note = `connection-test ${new Date().toISOString()}`;

  const result = await prisma.$transaction(async (tx) => {
    // Temp table avoids schema drift / migrations; it exists only for this transaction.
    await tx.$executeRaw`
      CREATE TEMP TABLE connection_test (
        id bigserial PRIMARY KEY,
        inserted_at timestamptz NOT NULL DEFAULT now(),
        note text NOT NULL
      )
    `;

    const inserted = await tx.$queryRaw<
      Array<{ id: bigint; inserted_at: Date; note: string }>
    >`INSERT INTO connection_test (note) VALUES (${note}) RETURNING id, inserted_at, note`;

    const now = await tx.$queryRaw<Array<{ now: Date }>>`SELECT now()`;

    return { inserted: inserted[0], now: now[0]?.now };
  });

  console.log({
    ok: true,
    now: result.now?.toISOString(),
    inserted: {
      id: result.inserted.id.toString(),
      inserted_at: result.inserted.inserted_at.toISOString(),
      note: result.inserted.note,
    },
  });
}

main()
  .catch((err) => {
    console.error({ ok: false, error: String(err), stack: err?.stack });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

