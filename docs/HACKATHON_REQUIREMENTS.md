# Hackathon requirements

Verified against the official Devpost rules on **2026-08-10**.

## Timeline

- Submission period: June 30, 2026 → August 18, 2026 at 5:00 PM EDT.
- IST deadline: August 19, 2026 at 2:30 AM IST.
- Judging: August 19 → September 15, 2026.
- Winners expected around September 21, 2026.

## Prize pool

- 1st: **$5,000**
- 2nd: **$2,500**
- 3rd: **$1,250**

## Required application

The project must be an **agentic application** that:

1. uses **CockroachDB as its persistent memory layer**;
2. is **deployed on AWS**;
3. meaningfully integrates the required sponsor components rather than merely initializing them;
4. runs consistently and behaves as shown in the submission.

## Required CockroachDB integration

The project must use **at least two** of:

1. **CockroachDB Cloud Managed MCP Server**
2. **CockroachDB Distributed Vector Indexing**
3. **ccloud CLI**
4. **CockroachDB Agent Skills Repo**

The submission must identify which tools were used and explain what the agent actually did with them.

## Required AWS integration

Use **at least one AWS service** powering the agent environment. Examples explicitly listed in the rules include:

- Amazon Bedrock
- AWS Lambda
- Amazon ECS / EKS
- Amazon S3
- Amazon SageMaker
- Amazon Bedrock Agents
- other AWS services that meaningfully power the agent

## Repository requirements

The final code repository must:

- be public,
- contain all required source,
- include clear setup/run instructions,
- include required dependencies and example configuration/data where applicable,
- include a complete open-source license (MIT or Apache 2.0 recommended).

## Demo requirements

Submission requires:

- URL to functional demo app;
- text description of features/functionality;
- public YouTube or Vimeo video;
- video shorter than 3 minutes;
- footage of the actual project functioning;
- footage explicitly showing the **CockroachDB memory layer at work**.

Judges are not required to test the application and may judge from the written submission, images, and video alone. Therefore the demo is part of the product.

## New-project rule

The work described and submitted must have been created during the submission period.

Standard:
- frameworks,
- libraries,
- starter templates,
- AI coding assistants

are allowed.

Other pre-existing code/work incorporated into the project must be disclosed.

## Judging

After a baseline viability pass/fail, eligible submissions are scored on five **equally weighted** criteria:

### 1. Agentic Memory Design
CockroachDB should play a meaningful production-grade memory role: state, embeddings, context, transactional information, etc.

### 2. Technological Implementation
Quality and safe/correct use of CockroachDB tooling.

### 3. Real-World Impact
A meaningful workflow/problem with credible user value.

### 4. Product Readiness
Security, observability, scalability, resilience, access control, and failure behavior.

### 5. Creativity & Originality
A genuinely useful or novel application of agentic systems rather than a conventional app with an LLM attached.

## Direct source

Official rules:
https://cockroachdb-ai.devpost.com/rules

Official updates/resources:
https://cockroachdb-ai.devpost.com/updates
