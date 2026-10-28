-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "images" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "CharityProfile" ADD COLUMN     "images" JSONB NOT NULL DEFAULT '[]';
