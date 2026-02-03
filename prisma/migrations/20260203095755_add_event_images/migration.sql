-- CreateTable
CREATE TABLE "EventImages" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventImages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventImages" ADD CONSTRAINT "EventImages_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
