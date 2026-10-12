-- The six-digit code is gone: the owner now signs in with a passkey, and this is where they are kept.

-- CreateTable
CREATE TABLE "identity_passkeys" (
    "id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aaguid" TEXT NOT NULL,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "identity_passkeys_pkey" PRIMARY KEY ("id")
);
