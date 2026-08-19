-- Hand-written migration (Prisma's auto-diff can't safely handle enum value
-- removal or moving data from a dropped column into a new table).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── RoleName enum: add SUPER_ADMIN, drop CASHIER (no rows reference it —
--    reassigned to MANAGER by hand before this migration was written) ──
CREATE TYPE "RoleName_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'MANAGER');
ALTER TABLE "Role" ALTER COLUMN "name" TYPE "RoleName_new" USING ("name"::text::"RoleName_new");
DROP TYPE "RoleName";
ALTER TYPE "RoleName_new" RENAME TO "RoleName";

-- ── User: add username (backfilled from email), make email optional ──
ALTER TABLE "User" ADD COLUMN "username" TEXT;
UPDATE "User" SET "username" = split_part("email", '@', 1) WHERE "username" IS NULL;
-- the former cashier@anoramedfarm.uz account is now a Manager persona
UPDATE "User" SET "username" = 'manager' WHERE "id" = 'cmszplir90005pr3aigzz2bef';
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- ── QueueEntry: add totalPrice (backfilled from the old single price) ──
ALTER TABLE "QueueEntry" ADD COLUMN "totalPrice" DECIMAL(10,2);
UPDATE "QueueEntry" SET "totalPrice" = "price";
ALTER TABLE "QueueEntry" ALTER COLUMN "totalPrice" SET NOT NULL;

-- ── QueueEntryService join table + migrate existing single-service rows ──
CREATE TABLE "QueueEntryService" (
    "id" TEXT NOT NULL,
    "queueEntryId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "QueueEntryService_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QueueEntryService_queueEntryId_serviceId_key" ON "QueueEntryService"("queueEntryId", "serviceId");
ALTER TABLE "QueueEntryService" ADD CONSTRAINT "QueueEntryService_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "QueueEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QueueEntryService" ADD CONSTRAINT "QueueEntryService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "QueueEntryService" ("id", "queueEntryId", "serviceId", "price")
SELECT gen_random_uuid()::text, "id", "serviceId", "price" FROM "QueueEntry";

ALTER TABLE "QueueEntry" DROP CONSTRAINT IF EXISTS "QueueEntry_serviceId_fkey";
ALTER TABLE "QueueEntry" DROP COLUMN "serviceId";
ALTER TABLE "QueueEntry" DROP COLUMN "price";
