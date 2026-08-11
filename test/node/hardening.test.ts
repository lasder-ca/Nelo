import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Nelo } from "../../src/web/app.ts";
import { serve } from "../../src/node/mod.ts";

describe("Node adapter hardening", () => {
  it("rejects shutdown delays that exceed Node timer bounds", async () => {
    const server = serve(new Nelo(), { port: 0 });
    await server.listen();
    assert.throws(
      () => server.close({ gracePeriod: 2_147_483_648, forceAfter: 2_147_483_648 }),
      /2147483647/,
    );
    await server.close({ gracePeriod: 0, forceAfter: 0 });
  });
});
