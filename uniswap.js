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
};

// ----------------------------------
// 2. INIT PROVIDER & WALLET
// ----------------------------------
const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.privateKey, provider);

console.log(colors.cyan + "========================================" + colors.reset);
console.log(colors.magenta + `Wallet Address: ${wallet.address}` + colors.reset);
