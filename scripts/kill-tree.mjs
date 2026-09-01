/**
 * `next start` forks a next-server child, so signalling only the wrapper leaves
 * the port held and the suite hanging on an event loop that never drains.
 * Spawning detached puts the pair in their own process group, and a negative
 * pid signals the whole group.
 */
export function killTree(child) {
  if (!child || child.killed) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
}
