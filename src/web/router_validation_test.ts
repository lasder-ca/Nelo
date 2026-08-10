import { assertThrows } from "@std/assert";
import { Nelo } from "../../mod.ts";
import { InvalidRouteError } from "./errors.ts";

Deno.test("duplicate parameter names within one route are rejected", () => {
  const app = new Nelo();
  assertThrows(
    () => app.get("/:id/:id", (context) => context.text(context.params.id!)),
    InvalidRouteError,
    "duplicate route parameter name",
  );
});
