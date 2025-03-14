# Solar Energy IoFy Test Suite

This directory contains the test files for the Solar Energy IoFy smart contracts. The tests are written using Hardhat, Chai, and Ethers.js.

## Test Files

### SolarPanelRegistry.test.ts
Tests for the SolarPanelRegistry contract, which manages the registration and tracking of solar panels.

- Tests panel registration functionality
- Tests access control for panel management
- Tests panel status updates
- Tests panel data retrieval

### SolarPanelFactory.test.js
Tests for the SolarPanelFactory contract, which handles the creation and registration of solar panels.

- Tests deployment and initialization
- Tests single panel registration
- Tests batch panel registration
- Tests access control for panel registration
- Tests pausing and unpausing functionality

### ShareToken.test.ts
Tests for the ShareToken contract, which represents ownership shares in solar panels.

- Tests share minting for panels
- Tests share transfers between users
- Tests panel-specific balance tracking
- Tests access control for minting
- Tests pausing and unpausing functionality

### DividendDistributor.test.ts
Tests for the DividendDistributor contract, which handles the distribution and claiming of dividends.

- Tests dividend distribution for panels
- Tests dividend claiming by shareholders
- Tests multiple distributions
- Tests access control for distribution
- Tests pausing and unpausing functionality

### Integration.test.js
End-to-end integration tests for the entire system.

- Tests the complete flow from panel registration to dividend distribution
- Tests system pausing and unpausing
- Tests access control across the system

## Running Tests

To run all tests:

```bash
npx hardhat test
```

To run a specific test file:

```bash
npx hardhat test ./test/SolarPanelRegistry.test.ts
```

## Test Coverage

To generate a test coverage report:

```bash
npx hardhat coverage
```

The coverage report will be available in the `coverage` directory. 