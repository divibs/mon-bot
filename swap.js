const { ethers } = require("ethers");

// Configuration (using your inputs)
const config = {
  privateKey: "0x7aa362af1578488129c110d9a0073e85d4c87de511460a2be202d4be3dcfe04f",
  rpcUrl: "https://monad-testnet.g.alchemy.com/v2/dkEUofCC_DkGE0hb1qfcLosQeneQWmLc",
  tokenInAddress: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B", // CHOG
  tokenOutAddress: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714", // DAK
  uniswapRouterAddress: "0x4c4eABd5Fb1D1A7234A48692551eAECFF8194CA7",
  amountIn: "1.0", // Adjust the amount of CHOG to swap
  slippage: 1.0, // 1% slippage tolerance
  tokenInDecimals: 18, // CHOG decimals (confirm!)
  tokenOutDecimals: 18, // DAK decimals (confirm!)
};

// ABIs (simplified)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
];
const UNISWAP_ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory)",
];

async function swapTokens() {
  // 1. Connect to Monad Testnet
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  // 2. Load Token Contracts
  const tokenIn = new ethers.Contract(config.tokenInAddress, ERC20_ABI, wallet);
  const tokenOut = new ethers.Contract(config.tokenOutAddress, ERC20_ABI, wallet);

  // 3. Approve Uniswap Router to Spend CHOG
  const amountInWei = ethers.parseUnits(config.amountIn, config.tokenInDecimals);
  const approveTx = await tokenIn.approve(config.uniswapRouterAddress, amountInWei);
  console.log("Approval TX Hash:", approveTx.hash);
  await approveTx.wait();
  console.log("Approval confirmed");

  // 4. Build Swap Transaction
  const router = new ethers.Contract(config.uniswapRouterAddress, UNISWAP_ROUTER_ABI, wallet);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20-minute deadline

  // Calculate minimum amount out (with slippage)
  // NOTE: For simplicity, hardcode amountOutMin. In production, fetch price from the chain.
  const amountOutMin = ethers.parseUnits("1.0", config.tokenOutDecimals); // Replace with actual calculation
  const path = [config.tokenInAddress, config.tokenOutAddress];

  // 5. Execute Swap
  const swapTx = await router.swapExactTokensForTokens(
    amountInWei,
    amountOutMin,
    path,
    wallet.address,
    deadline
  );
  console.log("Swap TX Hash:", swapTx.hash);
  await swapTx.wait();
  console.log("Swap confirmed!");
}

swapTokens().catch(console.error);