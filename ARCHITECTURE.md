# Architecture

* **One contract** (`contracts/handover.py`). State is JSON in `TreeMap[str,str]` (handovers, evidence,
  verification rounds, contractor records) plus `DynArray` indexes. Amounts are strings in views.
* **One non-deterministic step**: `_evaluate` fetches each source and asks the model one question per
  checklist item, inside `gl.eq_principle.prompt_comparative`. Validators agree if every item status and
  every source availability match; quotes may differ.
* **Grounding**: a MET/NOT_MET answer survives only if its quote is on the cited page after normalising markup.
* **Contract-owned rules**: independence floor, result derivation (`_derive_result`), payout split
  (`_split_payout`), 5-minute acceptance delay, recovery after deadline + 1 day, custody ledger zeroed
  before any transfer is emitted. The payee is always the contractor named at creation; there is no
  free-form recipient.
* **Evidence access control**: `submit_evidence`, `replace_evidence`, `withdraw_evidence` and
  `request_verification` check the caller against the client, the contractor and the handover's
  `submitters` list. Quotas (`MAX_PER_DELEGATE`, `RESERVED_FOR_OWNERS`, `MAX_REGISTRATIONS`) are constants.
  Rows are never deleted: withdrawn or replaced rows are marked (`removed_by`, `replaced_by`) and drop out
  of `evidence_ids`, so earlier verification rounds stay readable.
* **Contractor record**: on finalization the handover id is appended to `registry_ids` and to the contractor's
  record (counts per result, last 50 entries, verified rate in basis points).
* **Console**: client-side Next.js. Reads via a throwaway-account client; writes via the wallet's provider
  with the connected address as the account. All fees come from SDK estimates.
