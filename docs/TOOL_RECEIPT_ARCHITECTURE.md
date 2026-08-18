# ContextSeal tool-receipt architecture

Status: **active submission contract**  
Last updated: **2026-08-17**

## Product claim

ContextSeal prevents an agent from acting on a confident but obsolete conclusion by binding every reviewed memory to the exact fragments of the tool responses that established it.

## End-to-end architecture

```text
Developer / production agent / browser demo
                    |
                    v
        Explicit ContextSeal tools
   +----------------+----------------+
   |                |                |
file adapter   GitHub HTTP       named SQL
allowlisted    registered GET    read-only query
   |                |                |
   +----------------+----------------+
                    |
                    v
       Receipt normalization service
  response hash + source version + selected
  fragment hashes + run/step + freshness
                    |
                    v
       CockroachDB Cloud (source of truth)
  observations -> fragments -> dependencies
       |                 |             |
  serializable      vector index    audit views
  invalidation       VECTOR(256)    Managed MCP
       |                 |             |
       +--------+--------+             +--> auditor
                |
                v
       Amazon Bedrock agent service
  Nova Lite proposes claim; Titan embeds it
                |
                v
          Human review queue
       approve / reject with reason
                |
                v
       Validity-gated memory recall
  ANN discovers -> receipt hashes admit/withhold
                |
                v
       Bounded business action + receipt
          issue refund / deny refund
```

AWS Amplify hosts the Next.js SSR boundary. Its compute role invokes Bedrock; CockroachDB credentials and ingestion tokens remain server-side.

## Invariant

A memory is admissible only when:

1. its status is `valid`, meaning a human approved it;
2. every required dependency fragment exists;
3. each dependency value hash equals the same selector in its source's current observation.

A response may change without invalidating a memory when the cited fragment is unchanged. Refresh and invalidation commit in one CockroachDB serializable transaction and retry on SQLSTATE `40001`.

## Failure behavior

- Bedrock unavailable: observation still succeeds; no new model proposal is trusted. Deterministic mode exists only for labeled demo/test use.
- Source unavailable: the last observation remains historical; consequential refresh-dependent work must fail closed.
- Duplicate/concurrent refresh: source row locking plus serializable retries preserves one current pointer and monotonic receipt history.
- Stale memory: retained for audit and discoverable in the withheld lane, never silently deleted.
- MCP compromised: the demo auditor receives read-only views, not mutation tables or database credentials.

## Submission proof

The video must show `cockroachdb` and `bedrock` runtime labels, real rows in both MCP views, a vector recall, a selected policy fragment changing, the former approved memory becoming stale, and a different action after replacement review. Local fallback screenshots do not count as sponsor proof.
