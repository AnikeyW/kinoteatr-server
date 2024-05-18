/*
  Warnings:

  - Changed the type of `release_date` on the `Episode` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Episode" DROP COLUMN "release_date",
ADD COLUMN     "release_date" TIMESTAMP(3) NOT NULL;
