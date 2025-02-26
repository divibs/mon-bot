const { ethers } = require("ethers");
const fs = require("fs");

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

// Monad explorer base URL for transaction links
const EXPLORER_BASE = "https://testnet.monadexplorer.com/tx/";

// ----------------------------------
// 1. CONFIGURATION
// ----------------------------------
const config = {
  privateKey: fs.readFileSync("privatekey.txt", "utf8").trim(),
  rpcUrl: "https://monad-testnet.g.alchemy.com/v2/dkEUofCC_DkGE0hb1qfcLosQeneQWmLc",

  // Token addresses on Monad testnet:
  chogAddress: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B", // CHOG
  dakAddress: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714",  // DAK
  yakiAddress: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50",  // YAKI

  // For native coin swaps, the router requires the wrapped native token.
  // We display it as MON.
  nativeWrappedAddress: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701", // WMON

  // UniswapV2-like Router on Monad testnet – assumed to support native coin swaps.
  uniswapRouterAddress: "0xfb8e1c3b833f9e67a71c859a132cf783b645e436",

  tokenDecimals: 18,
  slippage: 9.0, // 9% slippage

  // (Fixed amounts removed; we now use percentage-based amounts)
};

// ----------------------------------
// 2. ABIs
// ----------------------------------
// Router ABI – we assume the router supports these functions:
const ROUTER_ABI = [
  // For MON -> Token swap: caller sends MON as value.
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  // For Token -> MON swap:
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
];

// Minimal ERC20 ABI for token balance/approval.
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
];

// ----------------------------------
// 3. ROUTE SELECTION
// ----------------------------------
// Define 6 possible routes:
// For MON -> token, direction is "MON_TO_TOKEN"
// For token -> MON, direction is "TOKEN_TO_MON"
const routes = [
  { direction: "MON_TO_TOKEN", token: "yaki", label: "MON -> YAKI" },
  { direction: "MON_TO_TOKEN", token: "dak", label: "MON -> DAK" },
  { direction: "MON_TO_TOKEN", token: "chog", label: "MON -> CHOG" },
  { direction: "TOKEN_TO_MON", token: "yaki", label: "YAKI -> MON" },
  { direction: "TOKEN_TO_MON", token: "dak", label: "DAK -> MON" },
  { direction: "TOKEN_TO_MON", token: "chog", label: "CHOG -> MON" },
];

// Helper to get token info (address and contract) given a token key.
function getTokenInfo(tokenKey, wallet) {
  let address;
  if (tokenKey === "yaki") address = config.yakiAddress;
  else if (tokenKey === "dak") address = config.dakAddress;
  else if (tokenKey === "chog") address = config.chogAddress;
  const contract = new ethers.Contract(address, ERC20_ABI, wallet);
  return { address, contract };
}

// ----------------------------------
// 4. SWAP FUNCTION
// ----------------------------------
async function swapTokens() {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  console.log(colors.cyan + "========================================" + colors.reset);
  console.log(colors.magenta + `Wallet Address: ${wallet.address}` + colors.reset);

  // Log MON balance (2 decimals)
  const monBalance = await provider.getBalance(wallet.address);
  console.log(
    colors.yellow +
      `MON balance: ${parseFloat(ethers.formatEther(monBalance)).toFixed(2)} MON` +
      colors.reset
  );

  // Randomly select one route from the six possibilities.
  const chosenRoute = routes[Math.floor(Math.random() * routes.length)];
  console.log(colors.cyan + "Route chosen:" + colors.reset, chosenRoute.label);

  // Set deadline 20 minutes from now.
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  // Instantiate the router contract.
  const router = new ethers.Contract(config.uniswapRouterAddress, ROUTER_ABI, wallet);

  if (chosenRoute.direction === "MON_TO_TOKEN") {
    // Swap from MON (native) to token.
    // Calculate swap amount as a random percentage between 0.1% and 0.3% of MON balance.
    const monBalanceMON = parseFloat(ethers.formatEther(monBalance));
    const randomPercentage = (Math.random() * (0.3 - 0.1)) + 0.1; // e.g., 0.1% to 0.3% expressed in percentage
    const swapAmountMON = monBalanceMON * (randomPercentage / 100);
    const amountInWei = ethers.parseEther(swapAmountMON.toString());
    console.log(
      `Swapping ${swapAmountMON.toFixed(4)} MON (${(randomPercentage).toFixed(2)}% of your MON balance)`
    );
    // Define path: [nativeWrappedAddress, tokenAddress]
    const { address: tokenAddress } = getTokenInfo(chosenRoute.token, wallet);
    const path = [config.nativeWrappedAddress, tokenAddress];
    if (monBalance < amountInWei) {
      throw new Error(`Insufficient MON balance for swap.`);
    }
    const amountsOut = await router.getAmountsOut(amountInWei, path);
    const expectedOut = amountsOut[amountsOut.length - 1];
    const bigExpected = BigInt(expectedOut);
    const numerator = 10000n - BigInt(Math.floor(config.slippage * 100));
    const amountOutMin = (bigExpected * numerator) / 10000n;
    console.log("Initiating swap (MON -> Token)...");
    const swapTx = await router.swapExactETHForTokens(
      amountOutMin,
      path,
      wallet.address,
      deadline,
      { value: amountInWei }
    );
    console.log("Swap TX:", EXPLORER_BASE + swapTx.hash);
    const receipt = await swapTx.wait();
    console.log(
      colors.green +
        `✔️ Swap confirmed in block ${receipt.blockNumber} | Gas used: ${receipt.gasUsed.toString()}` +
        colors.reset
    );
  } else if (chosenRoute.direction === "TOKEN_TO_MON") {
    // Swap from token to MON.
    // Get token info.
    const { address: tokenAddress, contract } = getTokenInfo(chosenRoute.token, wallet);
    // Get token balance.
    const tokenBalance = await contract.balanceOf(wallet.address);
    const tokenBalanceValue = parseFloat(ethers.formatUnits(tokenBalance, config.tokenDecimals));
    // Calculate swap amount as a random percentage between 20% and 88% of token balance.
    const randomPercentage = (Math.random() * (88 - 20)) + 20; // percentage between 20 and 88
    const swapAmountToken = tokenBalanceValue * (randomPercentage / 100);
    const amountInWei = ethers.parseUnits(swapAmountToken.toString(), config.tokenDecimals);
    console.log(
      `Swapping ${swapAmountToken.toFixed(4)} ${chosenRoute.token.toUpperCase()} (${randomPercentage.toFixed(2)}% of your token balance)`
    );
    if (tokenBalance < amountInWei) {
      throw new Error(`Insufficient ${chosenRoute.token.toUpperCase()} balance for swap.`);
    }
    const path = [tokenAddress, config.nativeWrappedAddress];
    const amountsOut = await router.getAmountsOut(amountInWei, path);
    const expectedOut = amountsOut[amountsOut.length - 1];
    const bigExpected = BigInt(expectedOut);
    const numerator = 10000n - BigInt(Math.floor(config.slippage * 100));
    const amountOutMin = (bigExpected * numerator) / 10000n;
    // Approve the router to spend the token.
    console.log("Approving router for token...");
    const approveTx = await contract.approve(config.uniswapRouterAddress, amountInWei);
    console.log("Approval TX:", EXPLORER_BASE + approveTx.hash);
    await approveTx.wait();
    console.log(colors.green + "Approval confirmed." + colors.reset);
    console.log("Initiating swap (Token -> MON)...");
    const swapTx = await router.swapExactTokensForETH(
      amountInWei,
      amountOutMin,
      path,
      wallet.address,
      deadline
    );
    console.log("Swap TX:", EXPLORER_BASE + swapTx.hash);
    const receipt = await swapTx.wait();
    console.log(
      colors.green +
        `✔️ Swap confirmed in block ${receipt.blockNumber} | Gas used: ${receipt.gasUsed.toString()}` +
        colors.reset
    );
  }
  console.log(colors.cyan + "========================================" + colors.reset + "\n");
}

// ----------------------------------
// Helper: Sleep function for delay (ms)
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ----------------------------------
// Helper: Retry wrapper for swapTokens (up to maxAttempts)
async function trySwap(txIndex, maxAttempts = 3) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      console.log(colors.magenta + `Transaction ${txIndex} | Attempt ${attempts + 1}` + colors.reset);
      await swapTokens();
      return; // Success!
    } catch (error) {
      attempts++;
      console.error(
        colors.red +
          `Error in transaction ${txIndex}, attempt ${attempts}: Price change – you might try increasing your slippage tolerance` +
          colors.reset
      );
      if (attempts < maxAttempts) {
        console.log("Retrying in 3 seconds...");
        await sleep(3000);
      } else {
        console.log("Max attempts reached for this transaction. Moving on...");
      }
    }
  }
}

// ----------------------------------
// MAIN LOOP: Execute random number of transactions (between 10 and 15)
// ----------------------------------
async function mainLoop() {
  const numTx = Math.floor(Math.random() * (15 - 10 + 1)) + 10;
  console.log(colors.magenta + `Starting loop: executing ${numTx} transactions\n` + colors.reset);

  for (let i = 1; i <= numTx; i++) {
    await trySwap(i);
    // Wait a random delay between 2 to 5 seconds before next transaction.
    const delayMs = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
    console.log(`Waiting ${delayMs} ms before next transaction...\n`);
    await sleep(delayMs);
  }
}

// ----------------------------------
// RUN THE MAIN LOOP
// ----------------------------------
mainLoop().catch((err) => {
  console.error("Error in main loop:", err);
});
