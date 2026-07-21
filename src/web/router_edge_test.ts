import { assertEquals } from "@std/assert";
import { Nelo } from "../../mod.ts";

Deno.test("router compares specificity by segment before registration order", async () => {
  const app = new Nelo();
  app.get(
    "/:section/details",
    (context) =>
      context.json({
        route: "parameter-first",
        section: context.params.section,
      }),
  );
  app.get(
    "/users/:id",
    (context) => context.json({ route: "static-first", id: context.params.id }),
  );

  const response = await app.fetch(
    new Request("https://example.test/users/details"),
  );

  assertEquals(await response.json(), { route: "static-first", id: "details" });
});

Deno.test("router preserves __proto__ as an own route parameter", async () => {
  const app = new Nelo();
  app.get("/:__proto__", (context) =>
    context.json({
      value: context.params["__proto__"],
      own: Object.hasOwn(context.params, "__proto__"),
    }));

  const response = await app.fetch(new Request("https://example.test/safe"));

  assertEquals(await response.json(), { value: "safe", own: true });
});
