import { Nelo } from "nelo";

interface User {
  readonly id: number;
}

interface FeedItem {
  readonly title: string;
}

export const app = new Nelo();

app.get("/dashboard", async (context) => {
  const user = context.fork("user", (signal) => fetchUser({ signal }));
  const feed = context.fork("feed", (signal) => fetchFeed({ signal }));

  return context.json({
    user: await user,
    feed: await feed,
  });
});

async function fetchUser(options: { readonly signal: AbortSignal }): Promise<User> {
  options.signal.throwIfAborted();
  return await Promise.resolve({ id: 1 });
}

async function fetchFeed(options: { readonly signal: AbortSignal }): Promise<readonly FeedItem[]> {
  options.signal.throwIfAborted();
  return await Promise.resolve([{ title: "Owned work" }]);
}
