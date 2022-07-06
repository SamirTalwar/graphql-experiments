import * as stream from "node:stream";
import Koa from "koa";
import Router from "@koa/router";
import * as gql from "graphql";

interface Counter {
  count: number;
}

const initialState = (): Counter => ({
  count: 0,
});

let state = initialState();

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

  type Mutation {
    increment(by: Int): Counter

    reset: Counter
  }
`);

const rootValue = {
  counter() {
    return state;
  },

  increment(args: { by: number | undefined }) {
    const by = args.by || 1;
    if (by <= 0) {
      throw new Error("Cannot increment by zero or a negative number.");
    }
    state.count += by;
    return state;
  },

  reset() {
    state = initialState();
    return state;
  },
};

const router = new Router()
  .get("/", async (ctx) => {
    ctx.body = "Nothing to see here.";
  })
  .post("/graphql", async (ctx) => {
    if (!ctx.request.is("application/graphql")) {
      ctx.throw(400, "Invalid MIME type.");
    }
    if (!ctx.request.accepts("json")) {
      ctx.throw(400, "Must accept JSON.");
    }
    const source = await consumeStream(ctx.req);
    ctx.body = await gql.graphql({ schema, source, rootValue });
    ctx.set("Content-Type", "application/graphql+json; charset=utf-8");
  });

new Koa().use(router.routes()).use(router.allowedMethods()).listen(8080);
