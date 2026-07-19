import { InvalidResponseError } from "../lifetime/errors.ts";
import { DuplicateNextError } from "./errors.ts";
import type { NeloContext, NeloHandler, NeloMiddleware } from "./types.ts";

export async function runMiddleware(
  context: NeloContext,
  middleware: readonly NeloMiddleware[],
  handler: NeloHandler,
): Promise<Response> {
  let activeIndex = -1;

  const dispatch = async (index: number): Promise<Response> => {
    if (index <= activeIndex) throw new DuplicateNextError();
    activeIndex = index;
    const current = middleware[index];
    const result = current === undefined
      ? await handler(context)
      : await current(context, () => dispatch(index + 1));
    if (!(result instanceof Response)) throw new InvalidResponseError();
    return result;
  };

  return await dispatch(0);
}
