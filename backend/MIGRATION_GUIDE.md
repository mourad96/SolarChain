# Migrating from TypeORM to Prisma - Token Controller Guide

This guide provides specific steps to convert the `token.controller.ts` file from TypeORM to Prisma.

## Step 1: Update Imports and Remove TypeORM Dependencies

```typescript
// Old imports (remove these)
import { ShareToken } from '../entities/ShareToken';
import { SolarPanel } from '../entities/SolarPanel';
import { User } from '../entities/User';
import { AppDataSource } from '../config/database';
import { Not, IsNull } from 'typeorm';

// New imports (add these)
import { prisma } from '../services/prisma.service';
import type { Prisma } from '@prisma/client';
```

## Step 2: Remove Repository Initialization

```typescript
// Remove these TypeORM repository definitions
const tokenRepository = AppDataSource.getRepository(ShareToken);
const panelRepository = AppDataSource.getRepository(SolarPanel);
const userRepository = AppDataSource.getRepository(User);
```

## Step 3: Fix the Model Names

In Prisma, models use camelCase in the client, even if they are PascalCase in the schema:

```typescript
// Transform these patterns throughout the code
// TypeORM: panelRepository.findOne()  → Prisma: prisma.panel.findUnique()
// TypeORM: tokenRepository.find()     → Prisma: prisma.shareToken.findMany()
// TypeORM: userRepository.findOne()   → Prisma: prisma.user.findUnique()
```

## Step 4: Convert Query Methods

### TypeORM to Prisma Query Equivalents

| TypeORM                                    | Prisma                                     |
|--------------------------------------------|-------------------------------------------|
| `findOne({ where: { id } })`               | `findUnique({ where: { id } })`             |
| `findOne({ where: { panel: { id: panelId } } })` | `findFirst({ where: { panelId } })`        |
| `find()`                                    | `findMany()`                                 |
| `find({ relations: ['panel'] })`            | `findMany({ include: { panel: true } })`     |
| `relations: ['panel', 'panel.owner']`       | `include: { panel: { include: { owner: true } } }` |
| `Not(IsNull())`                            | Replace with native filters `{ not: null }`  |

## Step 5: Update Create/Save Operations

### Creating Records

```typescript
// TypeORM
const token = tokenRepository.create({
  panel,
  totalShares: amount,
  onChainTokenId: onChainTokenId.toString(),
  holderBalances: {
    [panel.owner.walletAddress!]: amount,
  },
  isActive: true,
});
await tokenRepository.save(token);

// Prisma
const token = await prisma.shareToken.create({
  data: {
    panel: { connect: { id: panel.id } },
    totalShares: amount,
    onChainTokenId: onChainTokenId.toString(),
    holderBalances: {
      [panel.owner.walletAddress || '']: amount,
    },
    isActive: true,
  },
});
```

### Updating Records

```typescript
// TypeORM
token.holderBalances[user.walletAddress] -= amount;
token.holderBalances[to] = (token.holderBalances[to] || 0) + amount;
await tokenRepository.save(token);

// Prisma
const holderBalances = token.holderBalances as Record<string, number>;
const updatedBalances = { ...holderBalances };
updatedBalances[user.walletAddress] -= amount;
updatedBalances[to] = (updatedBalances[to] || 0) + amount;

await prisma.shareToken.update({
  where: { id: token.id },
  data: {
    holderBalances: updatedBalances,
  },
});
```

## Step 6: Handle JSON Fields Properly

Prisma needs type assertions for JSON fields:

```typescript
// TypeORM
const userBalance = token.holderBalances[user.walletAddress] || 0;

// Prisma
const holderBalances = token.holderBalances as Record<string, number>;
const userBalance = holderBalances[user.walletAddress] || 0;
```

## Step 7: Fix Type Issues

Add null checks and handle optional fields:

```typescript
// TypeORM
tx = await shareToken.mintShares(panel.onChainPanelId, amount);

// Prisma with type safety
if (!panel.blockchainPanelId) {
  res.status(400).json({ message: 'Panel does not have a blockchain ID' });
  return;
}
tx = await shareToken.mintShares(panel.blockchainPanelId as BigNumberish, amount);
```

## Step 8: Complete Method Migration Example

Here's a complete example of the mintTokens method converted from TypeORM to Prisma:

```typescript
export const mintTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { panelId, amount } = req.body;
    const userId = (req as any).user.userId;

    // Get panel and check ownership
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: { owner: true },
    });

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    // Check if user is the owner of the panel
    if (panel.ownerId !== userId) {
      res.status(403).json({ error: 'You do not have permission to mint tokens for this panel' });
      return;
    }

    if (!shareToken) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }
    
    if (!panel.blockchainPanelId) {
      res.status(400).json({ message: 'Panel does not have a blockchain ID' });
      return;
    }

    // Mint tokens on blockchain
    const tx = await shareToken.mintShares(panel.blockchainPanelId as BigNumberish, amount);
    const receipt = await tx.wait();

    if (!receipt || !receipt.logs[0]) {
      res.status(500).json({ message: 'Failed to get transaction receipt' });
      return;
    }

    // Get token ID from event
    const event = receipt.logs[0];
    const parsedEvent = shareToken.interface.parseLog({
      topics: [...event.topics],
      data: event.data,
    });
    const onChainTokenId = parsedEvent?.args[0];

    // Create token record in database
    const token = await prisma.shareToken.create({
      data: {
        panel: { connect: { id: panel.id } },
        totalShares: amount,
        onChainTokenId: onChainTokenId.toString(),
        holderBalances: {
          [panel.owner.walletAddress || '']: amount,
        },
        isActive: true,
      },
    });

    res.status(201).json({
      message: 'Tokens minted successfully',
      token: {
        id: token.id,
        panelId: panel.id,
        totalShares: token.totalShares,
        onChainTokenId: token.onChainTokenId,
      },
    });
  } catch (error) {
    logger.error('Error in mintTokens:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
```

## Summary of Changes for All Methods

For each controller method, apply these transformations:

1. Update model access (repository.X → prisma.modelName.X)
2. Convert the query patterns (findOne → findUnique/findFirst)
3. Convert relations to includes
4. Convert creation/update patterns
5. Handle JSON fields with type assertions
6. Add null checks for optional fields

Convert one method at a time, then test thoroughly before proceeding to the next one. 