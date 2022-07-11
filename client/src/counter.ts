import * as server from "./server";

export const query = () =>
  server.graphql<{ counter: { count: number } }>("query { counter { count } }");

export const subscribe = () =>
  new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(
      server.graphqlEndpoint.replace(/^http(s?):/, "ws$1:")
    );
    socket.onopen = () => resolve(socket);
    socket.onerror = reject;
  });

export const increment = () =>
  server.graphql<{ increment: { count: number } }>(
    "mutation { increment { count } }"
  );
