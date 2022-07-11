# GraphQL experiments

Trying out different solutions for implementing a GraphQL API on a server.

## Analysis

Let's look at the costs and benefits of each solution.

### DIY server

**Pros:**

- Total flexibility
- _GraphQL.js_ is pretty good and feature-rich
- We can start with whatever kind of data we like, including in-memory
- No lock-in:
  - The pricing is simple: $0
  - We never lose out because our vendor of choice doesn't support a feature

**Cons:**

- There may not be a decent library for our language of choice
  - Or there might be a library that looks good, but falls apart as things get
    more complicated
  - Or there's 7 possible options, leading to decision fatigue
- Subscriptions are hard work to manage
  - Partially because of WebSockets
  - Partially because of retaining state
  - Tracking who needs an update for what requires a lot of introspection
- We have to implement all the GraphQL boilerplate ourselves
  - standard filters
  - pagination
  - etc.
- Operational concerns end up being the bulk of the work
  - permissions
  - quotas
  - caching
  - observability
    - logging
    - metrics
    - tracing
  - etc.
