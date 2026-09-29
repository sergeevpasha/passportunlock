import { runSync } from './passport-sync.ts';

const args = new Set(process.argv.slice(2));
const result = await runSync(
  {
    publish: args.has('--publish'),
    baseline: args.has('--baseline'),
    acceptLargeChange: args.has('--accept-large-change'),
    contact: process.env.WIKIMEDIA_CONTACT,
  },
  { log: message => process.stdout.write(message) }
);
process.exitCode = result.exitCode;
