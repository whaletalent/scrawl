/**
 * Runtime knobs, read at use-time so tests can change them on the fly.
 * Both can also be set through the environment for manual testing.
 */
export const config = {
  /** Multiplies every phase duration. 1 = real time; 0.1 = a game ten times faster. */
  timeScale: Number(process.env.PHASE_TIME_SCALE) || 1,
  /** How long a disconnected player keeps their slot before being removed. */
  reconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS) || 20_000,
};
