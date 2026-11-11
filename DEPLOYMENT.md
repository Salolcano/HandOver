# Deployment (browser only)

## 1. Deploy the contract on Studio Next
1. Open Studio Next and connect your wallet (RPC `https://studio-next.genlayer.com/api`, chain id `61997`).
2. New file, paste all of `contracts/handover.py`. Keep the first two lines exactly as they are.
3. Deploy with no constructor arguments. Accept the fee quote Studio shows.
4. Wait for `FINALIZED` with a success result, then copy the contract address.
5. Check `get_info` returns `{"version": "handover-1", ...}`.

## 2. Host the console on Vercel
1. Push this repo to GitHub.
2. Vercel -> Add New Project -> import it. **Root Directory: `frontend`**. Framework: Next.js.
3. Environment variables (see `frontend/.env.example`): `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_CHAIN_ID=61997`,
   `NEXT_PUBLIC_EXPLORER_URL`, `NEXT_PUBLIC_HANDOVER_ADDRESS=<address from step 1>`.
4. Deploy. After changing a variable, redeploy (NEXT_PUBLIC values are baked in at build time).

## 3. Wallet
Rabby / MetaMask: the console offers to add and switch to Studio Next. You need GEN for the final payment you
lock plus the fee deposit (unused fee is refunded at finalization).

## If a write fails
* `No account set` - connect a wallet first.
* `BudgetTooLow` - the console re-quotes automatically; if it still fails after 3 attempts open the transaction
  in the explorer and check the fee panel.
* Payout writes (`finalize_handover`, `cancel_handover`, `recover_handover`) emit GEN transfers. If their quote is
  rejected, estimate them with the CLI using `messageAllocations`.
