-- CreateTable
CREATE TABLE "Prediction" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "prediction" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "realClips" INTEGER NOT NULL,
    "fakeClips" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);
