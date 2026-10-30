-- A session opened by an MCP client now remembers which client it is, when it was authorized and when it was last used, under an id that outlives each rotation, so the owner can see and revoke it.

-- AlterTable
ALTER TABLE "identity_refresh_sessions" ADD COLUMN "connection_id" TEXT,
ADD COLUMN "client_name" TEXT,
ADD COLUMN "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "last_used_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "identity_refresh_sessions_connection_id_idx" ON "identity_refresh_sessions"("connection_id");
