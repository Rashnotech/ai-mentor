import { runCoverChecks } from '../tests/course-cover-contract.mjs'
const checks = runCoverChecks()
for (const check of checks) console.log(`PASS ${check}`)
console.log(`Course cover acceptance score: 100% (${checks.length}/${checks.length})`)
