-- CreateTable
CREATE TABLE "SentimentResult" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "class" INTEGER NOT NULL,
    "sentimentLabel" TEXT NOT NULL,
    "sentimentScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentimentResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SentimentResult_reviewId_key" ON "SentimentResult"("reviewId");

-- AddForeignKey
ALTER TABLE "SentimentResult" ADD CONSTRAINT "SentimentResult_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
