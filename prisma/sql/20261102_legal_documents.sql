-- CreateTable: every published version of a legal page is its own immutable row
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "changeNote" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_slug_version_key" ON "LegalDocument"("slug", "version");

-- AlterTable: the terms a buyer was shown when they placed an order
ALTER TABLE "Order" ADD COLUMN     "legalAcceptance" JSONB;

-- AlterTable: the agreement a creator / charity accepted when they submitted
ALTER TABLE "Submission" ADD COLUMN     "agreement" JSONB;
