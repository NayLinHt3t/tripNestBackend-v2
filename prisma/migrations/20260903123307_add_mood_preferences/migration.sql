-- CreateTable
CREATE TABLE "UserMoodPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMoodPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMoodPreference_userId_mood_key" ON "UserMoodPreference"("userId", "mood");

-- AddForeignKey
ALTER TABLE "UserMoodPreference" ADD CONSTRAINT "UserMoodPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
