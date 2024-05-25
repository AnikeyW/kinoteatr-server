-- CreateTable
CREATE TABLE "Subtitles" (
    "id" SERIAL NOT NULL,
    "src" TEXT NOT NULL,
    "episode_id" INTEGER,

    CONSTRAINT "Subtitles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Subtitles" ADD CONSTRAINT "Subtitles_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
