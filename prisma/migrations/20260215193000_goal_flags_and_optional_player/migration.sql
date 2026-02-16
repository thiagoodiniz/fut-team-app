-- Allow own goals without assigning a player and store goal type details.
ALTER TABLE "Goal"
ALTER COLUMN "playerId" DROP NOT NULL;

ALTER TABLE "Goal"
ADD COLUMN "freeKick" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "penalty" BOOLEAN NOT NULL DEFAULT false;
