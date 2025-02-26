#!/usr/bin/env node
import { ethers } from "ethers";
import fs from "fs";

// ====================================
// ANSI Color Codes
// ====================================
const RESET = "\x1b[0m";
const BLUE = "\x1b[34m";               // USDC
const GREEN = "\x1b[32m";              // USDT
const MON_COLOR = "\x1b[38;2;147;112;219m"; // #9370db for MON
const GRAY = "\x1b[90m";               // Waiting messages

// Block explorer URL for transaction links
const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";

// ====================================
// 1) CONFIGURATION
// ====================================

// RPC & wallet configuration
const RPC_URL = "https://monad-testnet.g.alchemy.com/v2/dkEUofCC_DkGE0hb1qfcLosQeneQWmLc";
const PRIVATE_KEY = fs.readFileSync("privatekey.txt", "utf8").trim();


// Swap contract address
const SWAP_CONTRACT_ADDRESS = "0x88B96aF200c8a9c35442C8AC6cd3D22695AaE4F0";

// Token configurations – we support USDT and USDC.
const tokens = {
  USDT: {
    address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D",
    decimals: 6,
    min: ethers.parseUnits("1", 6), // trigger token→MON even with 1 USDT
    monPayload: {
      param5:
        "0000000000000000000000000000000000000000000000000000000000008ca0",
      part10:
        "000000000000000000ffff5433e2b3d8211706e6102aa9471",
      param11:
        "0000000000000000000000000000000000000000000000000000000000018b37",
    },
    tokenToMonPayload: {
      param5:
        "0000000000000000000000000000000000000000000000000000000000008ca0",
      param10:
        "0000000000000000000000000000000000000000000000000000000000010001",
      param11:
        "0000000000000000000000000000000000000000000000000000000000000000",
    },
  },
  USDC: {
    address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
    decimals: 6,
    min: ethers.parseUnits("1", 6),
    monPayload: {
      param5:
        "0000000000000000000000000000000000000000000000000000000000008ca0",
      part10:
        "000000000000000000ffff5433e2b3d8211706e6102aa9471",
      param11:
        "0000000000000000000000000000000000000000000000000000000000018b37",
    },
    tokenToMonPayload: {
      param5:
        "0000000000000000000000000000000000000000000000000000000000008ca0",
      param10:
        "0000000000000000000000000000000000000000000000000000000000010001",
      param11:
        "0000000000000000000000000000000000000000000000000000000000000000",
    },
  },
};

// For a MON → token swap, require at least 0.01 MON.
const MIN_MON_SWAP = ethers.parseEther("0.01");

// ====================================
// 2) SETUP: PROVIDER, WALLET, CONTRACTS
// ====================================
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Minimal ABI for userCmd.
const swapAbi = ["function userCmd(uint16 callpath, bytes cmd) external payable"];
const swapContract = new ethers.Contract(SWAP_CONTRACT_ADDRESS, swapAbi, wallet);

// Minimal ERC20 ABI.
const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

// Instantiate token contracts.
for (const symbol of Object.keys(tokens)) {
  tokens[symbol].contract = new ethers.Contract(tokens[symbol].address, erc20Abi, wallet);
}

// ====================================
// 3) HELPER FUNCTIONS
// ====================================

/**
 * Pads a hex string to 32 bytes (64 hex characters).
 */
function padTo32Bytes(hexString) {
  return hexString.replace(/^0x/, "").padStart(64, "0");
}

/**
 * Build payload for a MON → token swap.
 * Layout:
 * [3] = 0  
 * [4] = token address (padded)  
 * [5] = payloadParams.param5  
 * [6] = "1"  
 * [7] = "1"  
 * [8] = MON swap amount (dynamic)  
 * [9] = 0  
 * [10] = payloadParams.part10  
 * [11] = payloadParams.param11  
 * [12] = 0  
 */
function buildMonToTokenPayload(tokenAddress, monAmount, payloadParams) {
  const zeroWord = "0".repeat(64);
  const paddedToken = padTo32Bytes(tokenAddress);
  const part5 = payloadParams.param5.padStart(64, "0");
  const part6 = "0".repeat(63) + "1";
  const part7 = "0".repeat(63) + "1";
  const part8 = ethers.toBeHex(monAmount).replace(/^0x/, "").padStart(64, "0");
  const part9 = zeroWord;
  const part10 = payloadParams.part10.padStart(64, "0");
  const part11 = payloadParams.param11.padStart(64, "0");
  const part12 = zeroWord;
  return "0x" + zeroWord + paddedToken + part5 + part6 + part7 + part8 + part9 + part10 + part11 + part12;
}

/**
 * Build payload for a token → MON swap.
 * Layout:
 * [3] = 0  
 * [4] = token address (padded)  
 * [5] = payloadParams.param5  
 * [6] = 0  
 * [7] = 0  
 * [8] = token swap amount (dynamic)  
 * [9] = 0  
 * [10] = payloadParams.param10  
 * [11] = payloadParams.param11  
 * [12] = 0  
 */
function buildTokenToMonPayload(tokenAddress, tokenAmount, payloadParams) {
  const zeroWord = "0".repeat(64);
  const paddedToken = padTo32Bytes(tokenAddress);
  const part5 = payloadParams.param5.padStart(64, "0");
  const part6 = zeroWord;
  const part7 = zeroWord;
  const part8 = ethers.toBeHex(tokenAmount).replace(/^0x/, "").padStart(64, "0");
  const part9 = zeroWord;
  const part10 = payloadParams.param10.padStart(64, "0");
  const part11 = payloadParams.param11.padStart(64, "0");
  const part12 = zeroWord;
  return "0x" + zeroWord + paddedToken + part5 + part6 + part7 + part8 + part9 + part10 + part11 + part12;
}

/** Returns a BigInt representing a random fraction of `balance`. */
function randomFractionOf(balance, minPerc, maxPerc) {
  const fraction = Math.random() * (maxPerc - minPerc) + minPerc;
  const fractionScaled = Math.floor(fraction * 1e6);
  return balance * BigInt(fractionScaled) / BigInt(1e6);
}

/** Returns a percentage string (e.g., "12.34%") of swappedAmount relative to totalBalance. */
function getSwapPercentage(swappedAmount, totalBalance, decimals) {
  const swapped = parseFloat(ethers.formatUnits(swappedAmount, decimals));
  const total = parseFloat(ethers.formatUnits(totalBalance, decimals));
  return ((swapped / total) * 100).toFixed(2) + "%";
}

/** Formats a numeric value to 2 decimals. */
function formatValue(val) {
  return parseFloat(val).toFixed(2);
}

// ====================================
// 4) MAIN AUTO-SWAP FUNCTION (with route alternation)
// ====================================
/**
 * Performs a swap based on available balances.
 * If both routes are available, forces the route to be different from lastSwapType.
 * Returns the type of swap performed ("monToToken" or "tokenToMon").
 */
async function autoSwap(lastSwapType) {
  // a) Get current MON balance.
  const monBalance = await provider.getBalance(wallet.address);
  console.log(`Current MON balance: ${formatValue(ethers.formatEther(monBalance))} MON`);

  // b) Get token balances.
  const usdtBal = await tokens.USDT.contract.balanceOf(wallet.address);
  const usdcBal = await tokens.USDC.contract.balanceOf(wallet.address);
  console.log(`Current USDT balance: ${formatValue(ethers.formatUnits(usdtBal, tokens.USDT.decimals))} USDT`);
  console.log(`Current USDC balance: ${formatValue(ethers.formatUnits(usdcBal, tokens.USDC.decimals))} USDC`);

  // c) Build list of possible swap routes.
  let routes = [];
  if (monBalance >= MIN_MON_SWAP) routes.push({ type: "monToToken" });
  if (usdtBal > 0) routes.push({ type: "tokenToMon", token: "USDT", balance: usdtBal });
  if (usdcBal > 0) routes.push({ type: "tokenToMon", token: "USDC", balance: usdcBal });
  if (routes.length === 0) {
    console.log("No available swap route this iteration.");
    return null;
  }

  // d) If both routes are available, force a different route than lastSwapType.
  const availableTypes = new Set(routes.map(r => r.type));
  if (lastSwapType && availableTypes.size >= 2 && availableTypes.has(lastSwapType)) {
    routes = routes.filter(r => r.type !== lastSwapType);
  }

  // e) Randomly choose one route.
  const chosen = routes[Math.floor(Math.random() * routes.length)];

  // ------------------------------
  // MON → Token Swap
  // ------------------------------
  if (chosen.type === "monToToken") {
    // Randomly choose between USDT and USDC.
    const symbols = Object.keys(tokens);
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const tokenInfo = tokens[sym];

    // Swap 0.1–0.3% of MON balance.
    const monSwapAmt = randomFractionOf(monBalance, 0.001, 0.003);
    const monPerc = getSwapPercentage(monSwapAmt, monBalance, 18);
    // Use token color based on token; "MON" label in MON_COLOR.
    const tokenColor = sym === "USDT" ? GREEN : BLUE;
    console.log(`\n[${MON_COLOR}MON${RESET} → ${tokenColor}${sym}${RESET} Swap] (${monPerc} of MON)`);
    console.log(`Swap Amount: ${formatValue(ethers.formatEther(monSwapAmt))} MON`);

    const payload = buildMonToTokenPayload(tokenInfo.address, monSwapAmt, tokenInfo.monPayload);

    try {
      // Use wallet.getNonce("pending") to fetch the current nonce.
      const nonce = await wallet.getNonce("pending");
      const tx = await swapContract.userCmd(1, payload, { value: monSwapAmt, nonce });
      console.log(`Tx Sent: ${EXPLORER_URL}${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`${GREEN}✔ Swap confirmed in Block: ${receipt.blockNumber}${RESET}\n`);
      return "monToToken";
    } catch (err) {
      console.error(`Error in MON → ${sym} swap:`, err);
      return null;
    }
  }
  // ------------------------------
  // Token → MON Swap
  // ------------------------------
  else if (chosen.type === "tokenToMon") {
    const tokenSymbol = chosen.token;
    const tokenInfo = tokens[tokenSymbol];
    const tokenBal = chosen.balance;

    // Swap 10–79% of token balance.
    const tokenSwapAmt = randomFractionOf(tokenBal, 0.10, 0.79);
    const tokenPerc = getSwapPercentage(tokenSwapAmt, tokenBal, tokenInfo.decimals);
    const tokenColor = tokenSymbol === "USDT" ? GREEN : BLUE;
    console.log(`\n[${tokenColor}${tokenSymbol}${RESET} → ${MON_COLOR}MON${RESET} Swap] (${tokenPerc} of ${tokenSymbol})`);
    console.log(`Swap Amount: ${formatValue(ethers.formatUnits(tokenSwapAmt, tokenInfo.decimals))} ${tokenSymbol}`);

    const payload = buildTokenToMonPayload(tokenInfo.address, tokenSwapAmt, tokenInfo.tokenToMonPayload);

    try {
      const nonceApprove = await wallet.getNonce("pending");
      const approveTx = await tokenInfo.contract.approve(SWAP_CONTRACT_ADDRESS, tokenSwapAmt, { nonce: nonceApprove });
      console.log(`Approval Tx: ${EXPLORER_URL}${approveTx.hash}`);
      await approveTx.wait();
      console.log(`${GREEN}✔ Approval confirmed.${RESET}`);
    } catch (err) {
      console.error("Error during approval:", err);
      return null;
    }

    try {
      const nonceSwap = await wallet.getNonce("pending");
      const tx = await swapContract.userCmd(1, payload, { nonce: nonceSwap });
      console.log(`Tx Sent: ${EXPLORER_URL}${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`${GREEN}✔ Swap confirmed in Block: ${receipt.blockNumber}${RESET}\n`);
      return "tokenToMon";
    } catch (err) {
      console.error(`Error in ${tokenSymbol} → MON swap:`, err);
      return null;
    }
  }
  return null;
}

// ====================================
// 5) MAIN LOOP
// ====================================
async function main() {
  console.log("\n============================================");
  console.log("       AMBIENT Bot - Starting Up       ");
  console.log("============================================\n");

  const numTx = Math.floor(Math.random() * 11) + 20;
  console.log(`Scheduled Transactions: ${numTx}\n`);

  let lastSwapType = null;
  for (let i = 0; i < numTx; i++) {
    console.log(`>>> Transaction ${i + 1} of ${numTx} <<<`);
    const routeUsed = await autoSwap(lastSwapType);
    if (routeUsed) lastSwapType = routeUsed;
    const delay = Math.floor(Math.random() * 5000) + 5000;
    console.log(`Waiting ${(delay / 1000).toFixed(2)} seconds before next transaction...\n`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  console.log("============================================");
  console.log("         All transactions completed         ");
  console.log("============================================\n");
}

main().catch((err) => {
  console.error("Fatal error in main:", err);
  process.exit(1);
});
