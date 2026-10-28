-- AlterEnum: an order is PENDING until the payment module confirms it, then PAID, then the usual fulfilment states
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAID' BEFORE 'PROCESSING';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "fundsAttributedAt" TIMESTAMP(3);

-- A payment reference identifies exactly one order
CREATE UNIQUE INDEX "Order_paymentRef_key" ON "Order"("paymentRef");
