# Migration Plan: TypeORM to Prisma

This document outlines the step-by-step process for migrating our application from TypeORM to Prisma ORM.

## Already Completed

1. ✅ Disabled TypeORM synchronize option to prevent conflicts with Prisma schema
2. ✅ Created a Prisma service singleton for application-wide access to the Prisma client
3. ✅ Started creating Prisma versions of controllers (see `prisma-token.controller.ts`)

## Migration Steps

### 1. Update Routes to Use New Prisma Controllers

Create new Prisma-based controllers and update routes to use them. We recommend doing this one controller at a time.

Example for token routes:
```typescript
// Before
import { mintTokens, transferTokens } from '../controllers/token.controller';

// After
import { mintTokens, transferTokens } from '../controllers/prisma-token.controller';
```

### 2. Fix Type Issues in Controllers

Prisma has slightly different types compared to TypeORM. Some common patterns:

- **TypeORM**: `repository.findOne({ where: { id } })`
- **Prisma**: `prisma.model.findUnique({ where: { id } })`

- **TypeORM**: `repository.find({ relations: ['related'] })`
- **Prisma**: `prisma.model.findMany({ include: { related: true } })`

- **TypeORM**: `repository.save(entity)`
- **Prisma**: `prisma.model.create({ data: entity })` or `prisma.model.update({ where: { id }, data: entity })`

### 3. Handle JSON Fields Correctly

Prisma handles JSON fields differently from TypeORM. For fields like `holderBalances`, you'll need to use type assertions:

```typescript
// TypeORM
const balances = token.holderBalances;

// Prisma
const balances = token.holderBalances as Record<string, number>;
```

### 4. Test Controllers Incrementally

As you migrate each controller:
1. Test the endpoints thoroughly
2. Ensure data is correctly written to and read from the database
3. Verify that relationships work as expected

### 5. Remove TypeORM Dependencies

Once all controllers have been migrated:

1. Remove TypeORM entity files (`src/entities/`)
2. Remove TypeORM configuration (`src/config/database.ts`)
3. Remove TypeORM dependencies from `package.json`:
   ```
   npm uninstall typeorm reflect-metadata
   ```

## Common TypeORM to Prisma Patterns

### Creating Records

```typescript
// TypeORM
const entity = repository.create({ field1, field2 });
await repository.save(entity);

// Prisma
const entity = await prisma.model.create({
  data: { field1, field2 }
});
```

### Finding Records

```typescript
// TypeORM
const entity = await repository.findOne({ 
  where: { id },
  relations: ['relatedEntities']
});

// Prisma
const entity = await prisma.model.findUnique({
  where: { id },
  include: { relatedEntities: true }
});
```

### Updating Records

```typescript
// TypeORM
entity.field = newValue;
await repository.save(entity);

// Prisma
await prisma.model.update({
  where: { id: entity.id },
  data: { field: newValue }
});
```

### Transactions

```typescript
// TypeORM
await queryRunner.connect();
await queryRunner.startTransaction();
try {
  // operations
  await queryRunner.commitTransaction();
} catch (err) {
  await queryRunner.rollbackTransaction();
  throw err;
} finally {
  await queryRunner.release();
}

// Prisma
await prisma.$transaction(async (tx) => {
  // operations using tx instead of prisma
});
```

## Testing

As you migrate each part of the codebase, run the following tests:
1. Unit tests for each controller
2. Integration tests for API endpoints
3. Manual testing through the frontend application

This ensures a smooth transition without disrupting the application functionality. 