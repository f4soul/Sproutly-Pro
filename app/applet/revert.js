const { execSync } = require('child_process');
try {
  execSync('git checkout src/components/dashboard/BentoDashboard.tsx');
  console.log('Restored BentoDashboard.tsx');
  execSync('git checkout src/data/changelog.ts');
  console.log('Restored changelog.ts');
} catch (e) {
  console.error(e.message);
}
