-- CreateTable
CREATE TABLE "share_tokens" (
  "id" TEXT NOT NULL,
  "panelId" TEXT NOT NULL,
  "totalShares" INTEGER NOT NULL,
  "onChainTokenId" TEXT NOT NULL,
  "holderBalances" JSONB NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "share_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_token_holders" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "shareAmount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "share_token_holders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "share_token_holders_userId_tokenId_key" ON "share_token_holders"("userId", "tokenId");

-- AddForeignKey
ALTER TABLE "share_tokens" ADD CONSTRAINT "share_tokens_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "panels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_token_holders" ADD CONSTRAINT "share_token_holders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_token_holders" ADD CONSTRAINT "share_token_holders_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "share_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 