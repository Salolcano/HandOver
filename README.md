# Handover

**Verifiable contractor handovers with a public track record, on GenLayer Studio Next.**

A client and a contractor agree a checklist for the end of an engagement: repository transferred, docs
published, access removed. The client locks the final payment against it and freezes the terms. Either
side, and helpers they authorize, register public web pages as evidence. GenLayer validators each fetch
every source and judge every item on their own; a round only counts if they agree. The contract derives
the result in plain code, pays the contractor by basis points of that result, and writes the finalized
handover to the contractor's public record.

| | |
|---|---|
| Network | Studio Next, chain `61997`, RPC `https://studio-next.genlayer.com/api` |
| Contract | `contracts/handover.py` (`# v0.3.0`, `py-genlayer:babwp9...`) |
| Console | `frontend/` (Next.js, `genlayer-js 2.0.0-rc.2`), host on Vercel |
| Deploy | see `DEPLOYMENT.md` (browser only, no local tooling) |

## Roles

* **Client** writes the checklist, funds the final payment, freezes it.
* **Contractor** accepts the checklist (when it is a different account) and receives the payment.
  One account may play both roles so a demo can run alone.
* **Helpers** are accounts either party authorizes to add evidence.

## Lifecycle

`DRAFT -> (AWAITING_ACCEPTANCE) -> ACTIVE -> EVIDENCE_SUBMITTED -> VERDICT_PROPOSED -> ACCEPTED -> FINALIZED`
with `CANCELLED` and a one-day-after-deadline `recover_handover` so no GEN is ever stuck.

Results: `VERIFIED` (full payment to the contractor), `PARTIALLY_VERIFIED` (the frozen share of the payment,
the rest back to the client), `NOT_VERIFIED`, `INCONCLUSIVE`, `HANDOVER_DEVIATION` (all back to the client).

## Who may write evidence (steward request)

The evidence set is permissioned, so unrelated accounts can never fill its twelve slots:

* Only the **client**, the **contractor** and **helpers either of them authorizes**
  (`authorize_submitter` / `revoke_submitter`, up to 5) can call `submit_evidence`.
* A helper holds at most **4** sources, and **4 of the 12 slots are reserved** for the two parties, so
  helpers can take at most 8 between them.
* Either party can `withdraw_evidence` or `replace_evidence` any row (a helper only their own); a withdrawn
  or replaced row stops counting and frees its slot. Lifetime registrations are capped at 36.
* `request_verification` is limited to the same people, and an `INCONCLUSIVE` or `HANDOVER_DEVIATION`
  verdict can be accepted early only by a party (by anyone after the deadline).
* Proof: `tests/direct/test_evidence_protection.py` walks the workflow through the twelve-source limit.

## Fee system (Consensus v0.6)

Every write carries a `FeesDistribution` + `feeValue` taken unchanged from the SDK's own estimate
(`frontend/lib/genlayer/fees.ts`). Fixed and tested in `frontend/tests/fees.test.ts`:

* **`No account set`** - the signing client now receives the connected wallet address (`lib/genlayer/client.ts`).
* **`BudgetTooLow`** - the app pins `genlayer-js 2.0.0-rc.2`, refuses a 0-GEN quote before the wallet opens,
  shows fees with enough digits never to read "0", and re-quotes with doubled time units (up to three times).
* **"the transaction carries no time"** - the clock is read from `gl.message.datetime`, falling back to the
  older `gl.message_raw["datetime"]`.

## Tests

```
python -m pytest -q            # 41 contract-logic tests (in-process stub of the SDK)
cd frontend && npm test        # fee and formatting tests
genvm-lint check contracts/handover.py
```

The stub proves permissions, custody, derived results, payouts and the record. It does not replace GenVM:
the authoritative run is Studio Next itself (`END-TO-END.md`).
