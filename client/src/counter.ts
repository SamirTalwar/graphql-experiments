import * as server from "./server";

export const query = () =>
  server.graphql<{ counter: { count: number } }>("query { counter { count } }");

export const increment = () =>
  server.graphql<{ increment: { count: number } }>(
    "mutation { increment { count } }"
  );
