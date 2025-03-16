# Details

Date : 2025-03-15 17:07:45

Directory c:\\Users\\User\\Documents\\dev\\solar_energy_iofy

Total : 99 files,  9881 codes, 568 comments, 1355 blanks, all 11804 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [backend/package.json](/backend/package.json) | JSON | 60 | 0 | 1 | 61 |
| [backend/prisma/migrations/20250312164241\_init/migration.sql](/backend/prisma/migrations/20250312164241_init/migration.sql) | MS SQL | 50 | 9 | 13 | 72 |
| [backend/src/config/database.ts](/backend/src/config/database.ts) | TypeScript | 19 | 0 | 1 | 20 |
| [backend/src/config/index.ts](/backend/src/config/index.ts) | TypeScript | 38 | 3 | 5 | 46 |
| [backend/src/config/prisma.ts](/backend/src/config/prisma.ts) | TypeScript | 2 | 0 | 1 | 3 |
| [backend/src/controllers/auth.controller.ts](/backend/src/controllers/auth.controller.ts) | TypeScript | 255 | 22 | 47 | 324 |
| [backend/src/controllers/dashboard.controller.ts](/backend/src/controllers/dashboard.controller.ts) | TypeScript | 111 | 8 | 13 | 132 |
| [backend/src/controllers/iot.controller.ts](/backend/src/controllers/iot.controller.ts) | TypeScript | 306 | 15 | 40 | 361 |
| [backend/src/controllers/panel.controller.ts](/backend/src/controllers/panel.controller.ts) | TypeScript | 557 | 37 | 95 | 689 |
| [backend/src/controllers/token.controller.ts](/backend/src/controllers/token.controller.ts) | TypeScript | 235 | 14 | 44 | 293 |
| [backend/src/entities/IoTData.ts](/backend/src/entities/IoTData.ts) | TypeScript | 25 | 0 | 10 | 35 |
| [backend/src/entities/ShareToken.ts](/backend/src/entities/ShareToken.ts) | TypeScript | 35 | 0 | 9 | 44 |
| [backend/src/entities/SolarPanel.ts](/backend/src/entities/SolarPanel.ts) | TypeScript | 31 | 0 | 12 | 43 |
| [backend/src/entities/User.ts](/backend/src/entities/User.ts) | TypeScript | 27 | 0 | 9 | 36 |
| [backend/src/index.ts](/backend/src/index.ts) | TypeScript | 49 | 6 | 11 | 66 |
| [backend/src/middleware/auth.middleware.ts](/backend/src/middleware/auth.middleware.ts) | TypeScript | 75 | 0 | 14 | 89 |
| [backend/src/middleware/validate-request.ts](/backend/src/middleware/validate-request.ts) | TypeScript | 14 | 0 | 3 | 17 |
| [backend/src/routes/auth.routes.ts](/backend/src/routes/auth.routes.ts) | TypeScript | 77 | 7 | 9 | 93 |
| [backend/src/routes/dashboard.routes.ts](/backend/src/routes/dashboard.routes.ts) | TypeScript | 20 | 2 | 4 | 26 |
| [backend/src/routes/index.ts](/backend/src/routes/index.ts) | TypeScript | 16 | 2 | 4 | 22 |
| [backend/src/routes/iot.routes.ts](/backend/src/routes/iot.routes.ts) | TypeScript | 159 | 10 | 12 | 181 |
| [backend/src/routes/panel.routes.ts](/backend/src/routes/panel.routes.ts) | TypeScript | 75 | 7 | 9 | 91 |
| [backend/src/routes/token.routes.ts](/backend/src/routes/token.routes.ts) | TypeScript | 90 | 7 | 9 | 106 |
| [backend/src/scripts/generate-types.ts](/backend/src/scripts/generate-types.ts) | TypeScript | 54 | 12 | 11 | 77 |
| [backend/src/services/blockchain.service.ts](/backend/src/services/blockchain.service.ts) | TypeScript | 390 | 19 | 43 | 452 |
| [backend/src/tests/controllers/auth.controller.test.ts](/backend/src/tests/controllers/auth.controller.test.ts) | TypeScript | 135 | 0 | 21 | 156 |
| [backend/src/tests/controllers/iot.controller.test.ts](/backend/src/tests/controllers/iot.controller.test.ts) | TypeScript | 186 | 0 | 28 | 214 |
| [backend/src/tests/controllers/panel.controller.test.ts](/backend/src/tests/controllers/panel.controller.test.ts) | TypeScript | 158 | 0 | 22 | 180 |
| [backend/src/tests/controllers/token.controller.test.ts](/backend/src/tests/controllers/token.controller.test.ts) | TypeScript | 225 | 0 | 29 | 254 |
| [backend/src/tests/jest.config.ts](/backend/src/tests/jest.config.ts) | TypeScript | 18 | 0 | 2 | 20 |
| [backend/src/tests/setup.ts](/backend/src/tests/setup.ts) | TypeScript | 59 | 4 | 6 | 69 |
| [backend/src/types/auth.ts](/backend/src/types/auth.ts) | TypeScript | 12 | 0 | 2 | 14 |
| [backend/src/utils/logger.ts](/backend/src/utils/logger.ts) | TypeScript | 23 | 0 | 1 | 24 |
| [backend/tsconfig.json](/backend/tsconfig.json) | JSON with Comments | 28 | 0 | 0 | 28 |
| [contracts/README.md](/contracts/README.md) | Markdown | 84 | 0 | 29 | 113 |
| [contracts/contracts/DividendDistributor.sol](/contracts/contracts/DividendDistributor.sol) | Solidity | 105 | 12 | 28 | 145 |
| [contracts/contracts/MockERC20.sol](/contracts/contracts/MockERC20.sol) | Solidity | 14 | 5 | 3 | 22 |
| [contracts/contracts/ShareToken.sol](/contracts/contracts/ShareToken.sol) | Solidity | 89 | 10 | 21 | 120 |
| [contracts/contracts/SolarPanelFactory.sol](/contracts/contracts/SolarPanelFactory.sol) | Solidity | 73 | 32 | 15 | 120 |
| [contracts/contracts/SolarPanelRegistry.sol](/contracts/contracts/SolarPanelRegistry.sol) | Solidity | 134 | 41 | 23 | 198 |
| [contracts/coverage.json](/contracts/coverage.json) | JSON | 1 | 0 | 0 | 1 |
| [contracts/hardhat.config.ts](/contracts/hardhat.config.ts) | TypeScript | 61 | 0 | 4 | 65 |
| [contracts/package.json](/contracts/package.json) | JSON | 48 | 0 | 1 | 49 |
| [contracts/scripts/deploy.js](/contracts/scripts/deploy.js) | JavaScript | 149 | 23 | 27 | 199 |
| [contracts/scripts/update-addresses.js](/contracts/scripts/update-addresses.js) | JavaScript | 87 | 19 | 18 | 124 |
| [contracts/scripts/verify-contract.js](/contracts/scripts/verify-contract.js) | JavaScript | 54 | 15 | 10 | 79 |
| [contracts/test/DividendDistributor.test.ts](/contracts/test/DividendDistributor.test.ts) | TypeScript | 169 | 33 | 50 | 252 |
| [contracts/test/Integration.test.js](/contracts/test/Integration.test.js) | JavaScript | 211 | 47 | 53 | 311 |
| [contracts/test/MockERC20.test.ts](/contracts/test/MockERC20.test.ts) | TypeScript | 88 | 0 | 25 | 113 |
| [contracts/test/README.md](/contracts/test/README.md) | Markdown | 50 | 0 | 21 | 71 |
| [contracts/test/ShareToken.test.ts](/contracts/test/ShareToken.test.ts) | TypeScript | 157 | 17 | 44 | 218 |
| [contracts/test/SolarPanelFactory.test.js](/contracts/test/SolarPanelFactory.test.js) | JavaScript | 199 | 14 | 30 | 243 |
| [contracts/test/SolarPanelRegistry.test.ts](/contracts/test/SolarPanelRegistry.test.ts) | TypeScript | 321 | 4 | 41 | 366 |
| [contracts/tsconfig.json](/contracts/tsconfig.json) | JSON with Comments | 12 | 0 | 0 | 12 |
| [frontend/next-env.d.ts](/frontend/next-env.d.ts) | TypeScript | 0 | 5 | 2 | 7 |
| [frontend/package.json](/frontend/package.json) | JSON | 42 | 0 | 1 | 43 |
| [frontend/postcss.config.js](/frontend/postcss.config.js) | JavaScript | 6 | 0 | 0 | 6 |
| [frontend/src/app/api/v1/auth/login/route.ts](/frontend/src/app/api/v1/auth/login/route.ts) | TypeScript | 30 | 1 | 6 | 37 |
| [frontend/src/app/api/v1/auth/me/route.ts](/frontend/src/app/api/v1/auth/me/route.ts) | TypeScript | 33 | 0 | 5 | 38 |
| [frontend/src/app/api/v1/auth/register/route.ts](/frontend/src/app/api/v1/auth/register/route.ts) | TypeScript | 30 | 1 | 6 | 37 |
| [frontend/src/app/auth/login/page.tsx](/frontend/src/app/auth/login/page.tsx) | TypeScript JSX | 51 | 1 | 4 | 56 |
| [frontend/src/app/auth/register/page.tsx](/frontend/src/app/auth/register/page.tsx) | TypeScript JSX | 159 | 0 | 7 | 166 |
| [frontend/src/app/auth/signup/page.tsx](/frontend/src/app/auth/signup/page.tsx) | TypeScript JSX | 82 | 2 | 5 | 89 |
| [frontend/src/app/dashboard/investor/page.tsx](/frontend/src/app/dashboard/investor/page.tsx) | TypeScript JSX | 132 | 4 | 6 | 142 |
| [frontend/src/app/dashboard/investor/portfolio/page.tsx](/frontend/src/app/dashboard/investor/portfolio/page.tsx) | TypeScript JSX | 17 | 1 | 5 | 23 |
| [frontend/src/app/dashboard/investor/projects/\[id\]/page.tsx](/frontend/src/app/dashboard/investor/projects/%5Bid%5D/page.tsx) | TypeScript JSX | 17 | 1 | 5 | 23 |
| [frontend/src/app/dashboard/investor/projects/page.tsx](/frontend/src/app/dashboard/investor/projects/page.tsx) | TypeScript JSX | 17 | 1 | 5 | 23 |
| [frontend/src/app/dashboard/investor/transactions/page.tsx](/frontend/src/app/dashboard/investor/transactions/page.tsx) | TypeScript JSX | 17 | 1 | 5 | 23 |
| [frontend/src/app/dashboard/iot/page.tsx](/frontend/src/app/dashboard/iot/page.tsx) | TypeScript JSX | 270 | 1 | 19 | 290 |
| [frontend/src/app/dashboard/layout.tsx](/frontend/src/app/dashboard/layout.tsx) | TypeScript JSX | 27 | 3 | 5 | 35 |
| [frontend/src/app/dashboard/owner/dividends/page.tsx](/frontend/src/app/dashboard/owner/dividends/page.tsx) | TypeScript JSX | 17 | 1 | 5 | 23 |
| [frontend/src/app/dashboard/owner/iot/page.tsx](/frontend/src/app/dashboard/owner/iot/page.tsx) | TypeScript JSX | 17 | 1 | 5 | 23 |
| [frontend/src/app/dashboard/owner/page.tsx](/frontend/src/app/dashboard/owner/page.tsx) | TypeScript JSX | 82 | 4 | 6 | 92 |
| [frontend/src/app/dashboard/owner/panels/page.tsx](/frontend/src/app/dashboard/owner/panels/page.tsx) | TypeScript JSX | 17 | 1 | 5 | 23 |
| [frontend/src/app/dashboard/owner/panels/register/page.tsx](/frontend/src/app/dashboard/owner/panels/register/page.tsx) | TypeScript JSX | 241 | 4 | 10 | 255 |
| [frontend/src/app/dashboard/page.tsx](/frontend/src/app/dashboard/page.tsx) | TypeScript JSX | 270 | 0 | 16 | 286 |
| [frontend/src/app/dashboard/panels/page.tsx](/frontend/src/app/dashboard/panels/page.tsx) | TypeScript JSX | 511 | 4 | 39 | 554 |
| [frontend/src/app/dashboard/portfolio/page.tsx](/frontend/src/app/dashboard/portfolio/page.tsx) | TypeScript JSX | 192 | 4 | 8 | 204 |
| [frontend/src/app/dashboard/projects/page.tsx](/frontend/src/app/dashboard/projects/page.tsx) | TypeScript JSX | 131 | 2 | 7 | 140 |
| [frontend/src/app/dashboard/tokens/page.tsx](/frontend/src/app/dashboard/tokens/page.tsx) | TypeScript JSX | 220 | 10 | 14 | 244 |
| [frontend/src/app/globals.css](/frontend/src/app/globals.css) | CSS | 29 | 0 | 7 | 36 |
| [frontend/src/app/layout.tsx](/frontend/src/app/layout.tsx) | TypeScript JSX | 26 | 0 | 3 | 29 |
| [frontend/src/app/page.tsx](/frontend/src/app/page.tsx) | TypeScript JSX | 44 | 0 | 3 | 47 |
| [frontend/src/app/providers.tsx](/frontend/src/app/providers.tsx) | TypeScript JSX | 14 | 0 | 3 | 17 |
| [frontend/src/components/auth/AuthForm.tsx](/frontend/src/components/auth/AuthForm.tsx) | TypeScript JSX | 210 | 4 | 24 | 238 |
| [frontend/src/components/iot/DeviceDetails.tsx](/frontend/src/components/iot/DeviceDetails.tsx) | TypeScript JSX | 229 | 3 | 12 | 244 |
| [frontend/src/components/iot/DeviceList.tsx](/frontend/src/components/iot/DeviceList.tsx) | TypeScript JSX | 122 | 0 | 4 | 126 |
| [frontend/src/components/iot/DeviceRegistration.tsx](/frontend/src/components/iot/DeviceRegistration.tsx) | TypeScript JSX | 144 | 0 | 10 | 154 |
| [frontend/src/components/layout/DashboardLayout.tsx](/frontend/src/components/layout/DashboardLayout.tsx) | TypeScript JSX | 179 | 8 | 26 | 213 |
| [frontend/src/components/layout/MainLayout.tsx](/frontend/src/components/layout/MainLayout.tsx) | TypeScript JSX | 21 | 0 | 2 | 23 |
| [frontend/src/context/AuthContext.tsx](/frontend/src/context/AuthContext.tsx) | TypeScript JSX | 34 | 0 | 7 | 41 |
| [frontend/src/hooks/useAuth.ts](/frontend/src/hooks/useAuth.ts) | TypeScript | 193 | 13 | 30 | 236 |
| [frontend/src/middleware.ts](/frontend/src/middleware.ts) | TypeScript | 102 | 30 | 23 | 155 |
| [frontend/src/pages/iot/devices/\[id\].tsx](/frontend/src/pages/iot/devices/%5Bid%5D.tsx) | TypeScript JSX | 65 | 0 | 9 | 74 |
| [frontend/src/pages/iot/devices/index.tsx](/frontend/src/pages/iot/devices/index.tsx) | TypeScript JSX | 19 | 0 | 3 | 22 |
| [frontend/src/pages/iot/devices/register.tsx](/frontend/src/pages/iot/devices/register.tsx) | TypeScript JSX | 40 | 0 | 5 | 45 |
| [frontend/src/types/global.d.ts](/frontend/src/types/global.d.ts) | TypeScript | 8 | 0 | 0 | 8 |
| [frontend/tailwind.config.js](/frontend/tailwind.config.js) | JavaScript | 27 | 1 | 0 | 28 |
| [frontend/tsconfig.json](/frontend/tsconfig.json) | JSON with Comments | 27 | 0 | 0 | 27 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)