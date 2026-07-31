import { type CancellationReason, cancellationReasonFromSignal } from "./cancellation.ts";
import { InvalidDeadlineError } from "./errors.ts";

const MAX_TIMER_DELAY_MS = 2_147_483_647;

export type DeadlineUnit = "ms" | "s" | "m" | "h";
export type DeadlineDuration = number | `${number}${DeadlineUnit}`;

const UNIT_MULTIPLIER: Readonly<Record<DeadlineUnit, number>> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
};

/**
 * A request-owned, disposable signal that aborts at a fixed point in time.
 *
 * Disposing a deadline clears its timer without aborting its signal. Parent
 * cancellation and deadline expiry both preserve a typed Nelo cancellation
 * reason, with the first reason winning.
 */
export class RequestDeadline implements Disposable {
  readonly #controller = new AbortController();
  readonly #parentSignal: AbortSignal;
  readonly #parentAbort: () => void;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #disposed = false;

  readonly duration: number;
  readonly deadline: number;

  constructor(parentSignal: AbortSignal, duration: DeadlineDuration) {
    this.duration = parseDeadlineDuration(duration);
    const now = Date.now();
    if (this.duration > Number.MAX_SAFE_INTEGER - now) {
      throw new InvalidDeadlineError(duration);
    }

    this.deadline = now + this.duration;
    this.#parentSignal = parentSignal;
    this.#parentAbort = () => {
      this.#abort(
        cancellationReasonFromSignal(parentSignal, {
          type: "manual",
          reason: parentSignal.reason,
        }),
      );
    };

    if (parentSignal.aborted) this.#parentAbort();
    else parentSignal.addEventListener("abort", this.#parentAbort, { once: true });

    if (!this.signal.aborted) this.#schedule();
  }

  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  get remaining(): number {
    return Math.max(0, this.deadline - Date.now());
  }

  [Symbol.dispose](): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#clearTimer();
    this.#detachParent();
  }

  #schedule(): void {
    if (this.#disposed || this.signal.aborted) return;

    const remaining = this.deadline - Date.now();
    if (remaining <= 0) {
      this.#abort({ type: "deadline", deadline: this.deadline });
      return;
    }

    this.#timer = setTimeout(
      () => {
        this.#timer = undefined;
        this.#schedule();
      },
      Math.min(remaining, MAX_TIMER_DELAY_MS),
    );
  }

  #abort(reason: CancellationReason): void {
    if (this.signal.aborted || this.#disposed) return;
    this.#controller.abort(reason);
    this.#clearTimer();
    this.#detachParent();
  }

  #clearTimer(): void {
    if (this.#timer === undefined) return;
    clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  #detachParent(): void {
    this.#parentSignal.removeEventListener("abort", this.#parentAbort);
  }
}

export function parseDeadlineDuration(value: DeadlineDuration): number {
  const milliseconds = typeof value === "number" ? value : parseDurationString(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new InvalidDeadlineError(value);
  }

  const rounded = Math.ceil(milliseconds);
  if (!Number.isSafeInteger(rounded)) throw new InvalidDeadlineError(value);
  return rounded;
}

function parseDurationString(value: string): number {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/.exec(value);
  if (match === null) throw new InvalidDeadlineError(value);

  const amount = Number(match[1]);
  const unit = match[2] as DeadlineUnit;
  return amount * UNIT_MULTIPLIER[unit];
}
