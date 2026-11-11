# Security notes

* Evidence is treated as material to read, never as instructions (`demo/status-page-with-instructions.md`).
* A model never names the result and never moves money; it answers one checklist item at a time.
* Sources must be public https hosts (no credentials, ports, IP literals, localhost).
* Payable calls that cannot be accepted are refunded, not reverted (a revert would drop the refund).
* The frozen fingerprint covers title, subject, contractor, deadline, checklist, policy and payee.
* Evidence slots: only the client, the contractor and helpers they authorize can write evidence; helpers are
  capped (4 each, 8 together) and 4 of the 12 slots are reserved for the two parties; either party can
  withdraw or replace any row. The helper list is access control, not a term of the handover, so it sits
  outside the frozen fingerprint.
* Verification requests and early acceptance of unsettled verdicts are restricted for the same reason.
* Known limits: pages are read as text only; a publisher is judged by host/account, not identity;
  `prompt_comparative` uses an LLM judge for equivalence, so keep checklist items concrete.
