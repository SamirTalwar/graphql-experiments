import * as stream from "node:stream";
import Koa from "koa";
import Router from "@koa/router";
import * as gql from "graphql";

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

const schema = new gql.GraphQLSchema({
  query: new gql.GraphQLObjectType({
    name: "RootQueryType",
    fields: {
      hello: {
        type: gql.GraphQLString,
        resolve() {
          return "world";
        },
      },
    },
  }),
});

const router = new Router()
  .get("/", async (ctx) => {
    ctx.body = {
      hello: "world",
    };
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
