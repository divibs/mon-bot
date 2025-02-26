import { ethers } from "ethers";
import fs from "fs";

async function stakeMONRaw() {
  console.clear();
  console.log("\x1b[31mMagma Staking\x1b[0m");
  console.log("\x1b[33mWelcome to Magma Staking on Monad Testnet!\n\x1b[0m");

  // Set up the provider for Monad Testnet
  const RPC_URL = "https://monad-testnet.g.alchemy.com/v2/dkEUofCC_DkGE0hb1qfcLosQeneQWmLc";
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Load private key from external file
  const PRIVATE_KEY = fs.readFileSync("privatekey.txt", "utf8").trim();
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log("\x1b[34mConnected to wallet:\x1b[0m", wallet.address, "\n");

  // Staking contract address (MagmaStaking)
  const stakingContractAddress = "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7";

  // Raw function selector for stake() is 0xd5575982
  const rawData = "0xd5575982";

  // Use a stake value; here we try 0.01 MON
  const stakeValue = ethers.parseEther("0.01");
  console.log("\x1b[36mStaking\x1b[0m", "0.01 MON...");

  try {
    const tx = await wallet.sendTransaction({
      to: stakingContractAddress,
      data: rawData,
      value: stakeValue,
    });

    console.log("\x1b[32mTransaction sent!\x1b[0m");
    console.log("\x1b[35mTransaction Hash:\x1b[0m", `https://testnet.monadexplorer.com/tx/${tx.hash}`, "\n");

    const receipt = await tx.wait();
    console.log("\x1b[32mTransaction confirmed in block:\x1b[0m", receipt.blockNumber, "\n");
  } catch (error) {
    console.error("\x1b[31mError during transaction:\x1b[0m", error);
    return;
  }

  // Retrieve the wallet's MON balance
  const monBalanceWei = await provider.getBalance(wallet.address);
  const monBalance = ethers.formatEther(monBalanceWei);
  console.log("\x1b[33mRemaining MON balance:\x1b[0m", monBalance, "MON\n");

  // Replace with the actual gMON token address
  const gMONTokenAddress = "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3"; 
  if (!/^0x[0-9a-fA-F]{40}$/.test(gMONTokenAddress)) {
    console.log("\x1b[31mInvalid gMON token address provided, skipping gMON balance check.\x1b[0m");
  } else {
    try {
      const erc20ABI = ["function balanceOf(address) view returns (uint256)"];
      const gmonContract = new ethers.Contract(gMONTokenAddress, erc20ABI, provider);
      const gmonBalanceWei = await gmonContract.balanceOf(wallet.address);
      const gmonBalance = ethers.formatEther(gmonBalanceWei);
      console.log("\x1b[32mYou received:\x1b[0m", gmonBalance, "gMON!");
    } catch (error) {
      console.error("\x1b[31mError retrieving gMON balance:\x1b[0m", error);
    }
  }
}

stakeMONRaw().catch(console.error);
