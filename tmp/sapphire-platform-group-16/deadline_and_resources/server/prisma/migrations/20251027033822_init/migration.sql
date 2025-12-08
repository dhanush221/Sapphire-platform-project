/*
  Warnings:

  - You are about to drop the column `notes` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `transcriptUrl` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Meeting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "notes",
DROP COLUMN "time",
DROP COLUMN "transcriptUrl",
DROP COLUMN "updatedAt",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "recordingUrl" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "transcript" TEXT;

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
