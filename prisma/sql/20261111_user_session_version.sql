-- Lets an account end its other sessions: tokens carry the version they were issued at (claim "sv");
-- bumping it makes every earlier token invalid. Existing tokens have no claim and count as version 0.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
