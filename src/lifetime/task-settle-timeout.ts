import { InvalidTaskSettleTimeoutError } from "./errors.ts";

export const MAX_TASK_SETTLE_TIMEOUT_MS = 2_147_483_647;

export function validateTaskSettleTimeout(value: number): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_TASK_SETTLE_TIMEOUT_MS
  ) {
    throw new InvalidTaskSettleTimeoutError(value);
  }
  return value;
}
