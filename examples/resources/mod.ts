import { Nelo } from "nelo";

class Connection implements AsyncDisposable {
  readonly #reports = [{ id: 1, title: "Request ownership" }];

  reports(): readonly { readonly id: number; readonly title: string }[] {
    return this.#reports;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await Promise.resolve();
  }
}

export const app = new Nelo();

app.get("/reports", async (context) => {
  const connection = await context.use("database", async (signal) => {
    signal.throwIfAborted();
    return await Promise.resolve(new Connection());
  });
  return context.json(connection.reports());
});
