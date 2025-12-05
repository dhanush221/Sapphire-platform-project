-- CreateTable
CREATE TABLE "BreakReminder" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "mood" INTEGER,
    "energy" INTEGER,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreakReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BreakReminder_remindAt_idx" ON "BreakReminder"("remindAt");

-- AddForeignKey
ALTER TABLE "BreakReminder" ADD CONSTRAINT "BreakReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
