-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "guid" TEXT NOT NULL,
    "update" BYTEA NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("guid")
);
