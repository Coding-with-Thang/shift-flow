-- Default alias is derived as username when null; allow unset custom alias.
ALTER TABLE "User" ALTER COLUMN "publicAlias" DROP NOT NULL;
