/*
  Warnings:

  - A unique constraint covering the columns `[adminId]` on the table `Token` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Token_adminId_key" ON "Token"("adminId");
