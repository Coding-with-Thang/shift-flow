-- AlterTable
ALTER TABLE "User" ADD COLUMN "authUserId" UUID,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");
