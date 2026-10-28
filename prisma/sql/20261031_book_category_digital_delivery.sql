-- Replace the GRAPHIC product category with BOOK (no product used GRAPHIC when this ran)
CREATE TYPE "ProductCategory_new" AS ENUM ('ARTWORK', 'MUSIC', 'BOOK');
ALTER TABLE "Product" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "category" TYPE "ProductCategory_new" USING ("category"::text::"ProductCategory_new");
ALTER TABLE "Product" ALTER COLUMN "category" SET DEFAULT 'ARTWORK';
ALTER TABLE "CategoryMeta" ALTER COLUMN "key" TYPE "ProductCategory_new" USING ("key"::text::"ProductCategory_new");
DROP TYPE "ProductCategory";
ALTER TYPE "ProductCategory_new" RENAME TO "ProductCategory";

-- CreateEnum
CREATE TYPE "BookFormat" AS ENUM ('DIGITAL', 'PHYSICAL', 'BOTH');

-- AlterTable: link-delivered digital products (music listen link / digital book read link) + book details
ALTER TABLE "Product" ADD COLUMN     "digitalAccessUrl" TEXT,
ADD COLUMN     "bookFormat" "BookFormat",
ADD COLUMN     "digitalPrice" DECIMAL(10,2),
ADD COLUMN     "physicalPrice" DECIMAL(10,2),
ADD COLUMN     "creatorName" TEXT,
ADD COLUMN     "isbn" TEXT,
ADD COLUMN     "publisher" TEXT,
ADD COLUMN     "language" TEXT;

-- AlterTable: which edition of a book (DIGITAL / PHYSICAL) a line was bought as
ALTER TABLE "OrderItem" ADD COLUMN     "format" TEXT;
