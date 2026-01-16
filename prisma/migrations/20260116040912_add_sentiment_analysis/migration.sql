/*
  Warnings:

  - You are about to drop the `DomainEvent` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SentimentStatus" AS ENUM ('PENDING', 'ANALYZED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "sentimentLabel" TEXT,
ADD COLUMN     "sentimentScore" DOUBLE PRECISION,
ADD COLUMN     "sentimentStatus" "SentimentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

-- DropTable
DROP TABLE "DomainEvent";

-- CreateTable
CREATE TABLE "SentimentJob" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentimentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SentimentJob_reviewId_key" ON "SentimentJob"("reviewId");

-- AddForeignKey
ALTER TABLE "SentimentJob" ADD CONSTRAINT "SentimentJob_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
