const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['--test', 'tests/integration.test.js'], {
  stdio: 'inherit', env: { ...process.env, TEST_EMBEDDED: '1' }
});
process.exitCode = result.status ?? 1;
