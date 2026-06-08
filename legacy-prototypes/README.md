# Legacy Prototypes — NOT part of the Turing Test Hackathon submission

These three folders are **earlier standalone prototypes** that predate the Kubryx
OS consolidation. They are kept here for history only and are **excluded from the
hackathon submission, the build, and the live deployment**.

| Folder | Origin |
|---|---|
| `yield-operations-hub` | PalmFlow AI — standalone treasury prototype |
| `ai-agent-coordinator` | TrustMesh — standalone agent-coordination prototype |
| `stealth-execution-suite` | ShadowLedger — standalone private-execution prototype |

The Turing Test Hackathon submission is the **`hub/`** Next.js application plus the
on-chain contracts in **`invoices/contracts/`**, all targeting **Mantle Sepolia**.
The treasury, agents, and shadow features referenced in the hub are implemented
natively inside `hub/app/` and do **not** depend on these folders.

> These prototypes contain stale/broken dependencies and will not build. Do not
> `npm install` here. See the root `README.md` for what to run.
