import hre from "hardhat";

async function main() {
  console.log("Deploying Mock USDC...");
  const usdc = await hre.viem.deployContract("ReentrantToken"); // Just reusing ReentrantToken as a mock ERC20
  console.log(`Mock USDC deployed to: ${usdc.address}`);

  console.log("Deploying Recibo contract...");
  const recibo = await hre.viem.deployContract("Recibo", [usdc.address]);

  console.log(`Recibo deployed to: ${recibo.address}`);
  console.log(`Update the frontend config with these addresses.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
