const { ethers } = require("ethers"); // CommonJS import

async function main() {
  const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
  console.log("Provider created:", provider);
}

main();
