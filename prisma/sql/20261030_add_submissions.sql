-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('CHARITY', 'CAMPAIGN', 'ARTWORK');

-- AlterTable: existing + admin-created records are APPROVED; only the public submission endpoints create PENDING ones
ALTER TABLE "CharityProfile" ADD COLUMN     "submissionStatus" "SubmissionStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "Project" ADD COLUMN     "submissionStatus" "SubmissionStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "Product" ADD COLUMN     "submissionStatus" "SubmissionStatus" NOT NULL DEFAULT 'APPROVED';

-- A pending campaign submission carries the submitter's charity info instead of a charity link
ALTER TABLE "Project" ALTER COLUMN "charityId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "type" "SubmissionType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "contact" JSONB NOT NULL,
    "extra" JSONB,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Submission_type_entityId_key" ON "Submission"("type", "entityId");

-- CreateIndex
CREATE INDEX "CharityProfile_submissionStatus_idx" ON "CharityProfile"("submissionStatus");
CREATE INDEX "Project_submissionStatus_idx" ON "Project"("submissionStatus");
CREATE INDEX "Product_submissionStatus_idx" ON "Product"("submissionStatus");
