console.log('Starting debug of tests...');

const { execSync } = require('child_process');

try {
  const output = execSync('npx hardhat test test/ShareToken.test.ts --verbose', { encoding: 'utf8' });
  console.log('Test output:', output);
} catch (error) {
  console.error('Error running tests:', error.message);
  if (error.stdout) {
    console.log('Standard output:', error.stdout);
  }
  if (error.stderr) {
    console.error('Error output:', error.stderr);
  }
}  
