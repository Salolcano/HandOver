// OPTIONAL. The documented path is to deploy from the Studio Next web UI (see DEPLOYMENT.md),
// which needs no local tooling. This script does the same thing from a terminal:
//   PRIVATE_KEY=0x... node deploy/deploy.mjs
// It quotes fees with the SDK and submits distribution + feeValue unchanged.
import { readFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const chain = { ...studioDevnet, id: 61997, rpcUrls: { default: { http: ["https://studio-next.genlayer.com/api"] } } };
const client = createClient({ chain, account: createAccount(process.env.PRIVATE_KEY) });
const code = readFileSync(new URL("../contracts/handover.py", import.meta.url), "utf8");

const estimate = await client.estimateTransactionFees({
  leaderTimeunitsAllocation: 200n, validatorTimeunitsAllocation: 400n, rotations: [0n],
});
if (BigInt(estimate.feeValue) <= 0n) throw new Error("empty fee quote; refusing to send");
const hash = await client.deployContract({ code, args: [], fees: { distribution: estimate.distribution, feeValue: estimate.feeValue } });
console.log("deploy tx:", hash);
const tx = await client.waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 120, interval: 4000 });
console.log("contract address:", tx?.data?.contract_address ?? tx?.txDataDecoded?.contractAddress ?? "(see explorer)");
