-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "height" INTEGER NOT NULL DEFAULT 1080,
ADD COLUMN     "skip_intro_end" INTEGER,
ADD COLUMN     "skip_repeat_end" INTEGER,
ADD COLUMN     "width" INTEGER NOT NULL DEFAULT 1920;
