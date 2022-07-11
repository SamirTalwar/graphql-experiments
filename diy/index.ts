import * as stream from "node:stream";
import Koa from "koa";
import Router from "@koa/router";
import websockify from "koa-websocket";
import * as gql from "graphql";

const port = 8080;

interface Counter {
  count: number;
}

const initialState = (): Counter => ({
  count: 0,
});

let state = initialState();
const subscriptions: { [id: string]: (done: boolean) => void } = {};

const notifySubscriptions = () => {
  for (const subscription of Object.values(subscriptions)) {
    subscription(false);
  }
};

const consumeStream = (input: stream.Readable): Promise<string> =>
  new Promise((resolve, reject) => {
    const buffer: string[] = [];
    input.on("data", (chunk) => {
      if (chunk == null) {
        return;
      }
      buffer.push(chunk.toString());
    });
    input.on("end", () => {
      resolve(buffer.join(""));
    });
    input.on("error", reject);
  });

const schema = gql.buildSchema(`
  type Counter {
    count: Int!
  }

  type Query {
    counter: Counter
  }

  type Subscription {
    counter: Counter
  }

  type Mutation {
    increment(by: Int): Counter

    reset: Counter
  }
`);

const rootValue = {
  counter(): Counter {
    return state;
  },

  increment(args: { by: number | undefined }): Counter {
    const by = args.by || 1;
    if (by <= 0) {
      throw new Error("Cannot increment by zero or a negative number.");
    }
    state.count += by;
    notifySubscriptions();
    return state;
  },

  reset(): Counter {
    state = initialState();
    notifySubscriptions();
    return state;
  },
};

const subscribeRootValue = (id: string) => ({
  counter(): Counter | AsyncIterable<any> {
    let waiting = Promise.resolve(false);
    subscriptions[id] = () => {};
    return {
      [Symbol.asyncIterator]: async function* () {
        while (!(await waiting)) {
          waiting = new Promise((resolve) => {
            subscriptions[id] = resolve;
          });
          yield { counter: state };
        }
      },
    };
  },
});

const validate = (
  source: string
): { document: gql.DocumentNode } | { errors: readonly any[] } => {
  const schemaValidationErrors = gql.validateSchema(schema);
  if (schemaValidationErrors.length > 0) {
    return { errors: schemaValidationErrors };
  }

  let document;
  try {
    document = gql.parse(source);
  } catch (syntaxError) {
    return { errors: [syntaxError] };
  }

  const validationErrors = gql.validate(schema, document);
  if (validationErrors.length > 0) {
    return { errors: validationErrors };
  }
  return { document };
};

const router = new Router().post("/graphql", async (ctx) => {
  if (!ctx.request.is("application/graphql")) {
    ctx.throw(400, "Invalid MIME type.");
  }
  if (!(ctx.request.accepts("graphql+json") || ctx.request.accepts("json"))) {
    ctx.throw(400, "Must accept JSON.");
  }
  const source = await consumeStream(ctx.req);
  const validationResult = validate(source);
  if ("errors" in validationResult) {
    ctx.throw(400, validationResult);
  } else {
    ctx.body = await gql.execute({
      schema,
      document: validationResult.document,
      rootValue: rootValue,
    });
    ctx.set("Content-Type", "application/graphql+json; charset=utf-8");
  }
});

let nextWsId = 0;
const wsRouter = new Router().all("/graphql", async (ctx) => {
  const id = nextWsId.toString();
  nextWsId += 1;
  ctx.websocket.on("message", async (source: Buffer) => {
    const validationResult = validate(source.toString());
    if ("errors" in validationResult) {
      ctx.websocket.send(JSON.stringify(validationResult));
    } else {
      const result = await gql.subscribe({
        schema,
        document: validationResult.document,
        rootValue: subscribeRootValue(id),
      });
      if ("next" in result) {
        for await (const value of result) {
          ctx.websocket.send(JSON.stringify(value));
        }
      } else {
        ctx.websocket.send(JSON.stringify(result));
      }
    }
  });
  ctx.websocket.on("close", () => {
    if (subscriptions[id]) {
      subscriptions[id](true);
      delete subscriptions[id];
    }
  });
});

const app = websockify(new Koa());
app.use(router.routes()).use(router.allowedMethods());
app.ws
  .use(wsRouter.routes() as Koa.Middleware)
  .use(wsRouter.allowedMethods() as Koa.Middleware);
app.listen(port);

console.log(`Listening on http://localhost:${port}/`);
