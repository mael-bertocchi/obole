-- A passkey can now be given a name of its own. Without one, the portal still names it after its authenticator.

-- AlterTable
ALTER TABLE "identity_passkeys" ADD COLUMN "name" TEXT;
