-- AlterTable
ALTER TABLE "Series" ADD COLUMN     "quality" INTEGER NOT NULL DEFAULT 1080,
ADD COLUMN     "rate_imdb" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN     "rate_kinopoisk" INTEGER NOT NULL DEFAULT 9;

-- CreateTable
CREATE TABLE "Countries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SeriesToCountry" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_SeriesToGenre" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Countries_name_key" ON "Countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_SeriesToCountry_AB_unique" ON "_SeriesToCountry"("A", "B");

-- CreateIndex
CREATE INDEX "_SeriesToCountry_B_index" ON "_SeriesToCountry"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_SeriesToGenre_AB_unique" ON "_SeriesToGenre"("A", "B");

-- CreateIndex
CREATE INDEX "_SeriesToGenre_B_index" ON "_SeriesToGenre"("B");

-- AddForeignKey
ALTER TABLE "_SeriesToCountry" ADD CONSTRAINT "_SeriesToCountry_A_fkey" FOREIGN KEY ("A") REFERENCES "Countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SeriesToCountry" ADD CONSTRAINT "_SeriesToCountry_B_fkey" FOREIGN KEY ("B") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SeriesToGenre" ADD CONSTRAINT "_SeriesToGenre_A_fkey" FOREIGN KEY ("A") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SeriesToGenre" ADD CONSTRAINT "_SeriesToGenre_B_fkey" FOREIGN KEY ("B") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
