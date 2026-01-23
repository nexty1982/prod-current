const stageResults = [
  { name: 'Backend Clean', status: 'Completed', durationSec: 0.29 },
  { name: 'Backend TypeScript', status: 'Completed', durationSec: 2.93 },
  { name: 'Backend Copy', status: 'Completed', durationSec: 1.27 },
  { name: 'Backend Verify', status: 'Completed', durationSec: 0.17 },
  { name: 'Frontend Build', status: 'Completed', durationSec: 72.92 },
  { name: 'PM2 Restart', status: 'Completed', durationSec: 0.28 }
];

console.log('───────────────────────────────────────────────────────────');
console.log('Stage                          Status        Duration');
console.log('───────────────────────────────────────────────────────────');

for (const stage of stageResults) {
  const statusText = stage.status === 'Completed' ? '✓ Completed' : '✗ Failed';
  const durationText = `${stage.durationSec.toFixed(2)}s`.padStart(8);
  const stageName = stage.name.padEnd(30);
  const status = statusText.padEnd(12);
  
  console.log(`${stageName}${status}${durationText}`);
}

console.log('───────────────────────────────────────────────────────────');
