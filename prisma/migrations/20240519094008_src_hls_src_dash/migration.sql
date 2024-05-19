/*
  Warnings:

  - You are about to drop the column `src` on the `Episode` table. All the data in the column will be lost.
  - Added the required column `src_dash` to the `Episode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `src_hls` to the `Episode` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Episode" DROP COLUMN "src",
ADD COLUMN     "src_dash" TEXT NOT NULL,
ADD COLUMN     "src_hls" TEXT NOT NULL;
