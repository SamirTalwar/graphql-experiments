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

const counterType = new gql.GraphQLObjectType({
  name: "Counter",
  fields: {
    count: {
      type: new gql.GraphQLNonNull(gql.GraphQLInt),
    },
  },
});

const schema = new gql.GraphQLSchema({
  query: new gql.GraphQLObjectType({
    name: "RootQueryType",
    fields: {
      counter: {
        type: counterType,
        resolve() {
          return state;
        },
      },
    },
  }),
  mutation: new gql.GraphQLObjectType({
    name: "RootMutationType",
    fields: {
      increment: {
        type: counterType,
        args: { by: { type: gql.GraphQLInt } },
        resolve(_, increment) {
          if (increment.by != null && increment.by <= 0) {
            throw new Error("Cannot increment by zero or a negative number.");
          }
          state.count += increment.by || 1;
          return state;
        },
      },
      reset: {
        type: counterType,
        resolve() {
          state = initialState();
          return state;
        },
      },
    },
  }),
});

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
    ctx.body = await gql.graphql({ schema, source });
    ctx.set("Content-Type", "application/graphql+json; charset=utf-8");
  });

new Koa().use(router.routes()).use(router.allowedMethods()).listen(8080);
