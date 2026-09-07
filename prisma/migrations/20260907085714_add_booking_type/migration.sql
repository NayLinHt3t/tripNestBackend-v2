-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('INSTANT', 'MANUAL');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "bookingType" "BookingType" NOT NULL DEFAULT 'MANUAL';
