export const root =
  import.meta.env.VITE_SERVER_URL ??
  (() => {
    throw new Error("No server URL provided.");
  })();

export const graphql = <Response>(body: string): Promise<Response> =>
  fetch(`${root}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/graphql",
      Accept: "application/json",
    },
    body,
  })
    .then((response) => response.json())
    .then((response) =>
      response.errors
        ? Promise.reject(response.errors)
        : Promise.resolve(response.data)
    );
