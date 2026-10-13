-- CreateEnum
CREATE TYPE "watchlist_media_type" AS ENUM ('movie', 'tv');

-- CreateTable
CREATE TABLE "watchlist_entries" (
    "id" TEXT NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "media_type" "watchlist_media_type" NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_fr" TEXT NOT NULL,
    "original_title" TEXT NOT NULL,
    "release_date" TEXT,
    "poster_path" TEXT,
    "genre_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "collection_id" INTEGER,
    "collection_name_en" TEXT,
    "collection_name_fr" TEXT,
    "runtime" INTEGER,
    "seasons" INTEGER,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watched_at" TIMESTAMP(3),
    "rating" INTEGER,
    "comment" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlist_entries_watched_at_idx" ON "watchlist_entries"("watched_at");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_entries_media_type_tmdb_id_key" ON "watchlist_entries"("media_type", "tmdb_id");
