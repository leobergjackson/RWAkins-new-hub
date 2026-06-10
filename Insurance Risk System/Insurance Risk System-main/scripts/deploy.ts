import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying CoverFi Protocol with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const foundation = process.env.COVERFI_FOUNDATION || deployer.address;
  console.log("Foundation address:", foundation);

  const addresses: Record<string, string> = {};

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: Deploy Mock Contracts (testnet only)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Deploying Mock Contracts ---");

  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  addresses.MockUSDT = await mockUSDT.getAddress();
  console.log("MockUSDT:", addresses.MockUSDT);

  const MockIdentityRegistry = await ethers.getContractFactory("MockIdentityRegistry");
  const mockIdRegistry = await MockIdentityRegistry.deploy();
  await mockIdRegistry.waitForDeployment();
  addresses.MockIdentityRegistry = await mockIdRegistry.getAddress();
  console.log("MockIdentityRegistry:", addresses.MockIdentityRegistry);

  const MockERC3643Token = await ethers.getContractFactory("MockERC3643Token");
  const mockToken = await MockERC3643Token.deploy("Mock RWA Token", "mRWA", addresses.MockIdentityRegistry);
  await mockToken.waitForDeployment();
  addresses.MockERC3643Token = await mockToken.getAddress();
  console.log("MockERC3643Token:", addresses.MockERC3643Token);

  const MockBAS = await ethers.getContractFactory("MockBASAttestation");
  const mockBAS = await MockBAS.deploy();
  await mockBAS.waitForDeployment();
  addresses.MockBAS = await mockBAS.getAddress();
  console.log("MockBAS:", addresses.MockBAS);

  const MockChainlink = await ethers.getContractFactory("MockChainlinkPoR");
  const mockChainlink = await MockChainlink.deploy();
  await mockChainlink.waitForDeployment();
  addresses.MockChainlink = await mockChainlink.getAddress();
  console.log("MockChainlink:", addresses.MockChainlink);

  const usdtAddress = addresses.MockUSDT;

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2: Deploy Core Contracts (in dependency order)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Deploying Core Contracts ---");

  // 2. TIR (no dependencies)
  const TIR = await ethers.getContractFactory("TIR");
  const tir = await TIR.deploy();
  await tir.waitForDeployment();
  addresses.TIR = await tir.getAddress();
  console.log("TIR:", addresses.TIR);

  // 3. IssuerBond (depends: USDT)
  const IssuerBond = await ethers.getContractFactory("IssuerBond");
  const issuerBond = await IssuerBond.deploy(usdtAddress, deployer.address);
  await issuerBond.waitForDeployment();
  addresses.IssuerBond = await issuerBond.getAddress();
  console.log("IssuerBond:", addresses.IssuerBond);

  // 4. IRSOracle
  const IRSOracle = await ethers.getContractFactory("IRSOracle");
  const irsOracle = await IRSOracle.deploy();
  await irsOracle.waitForDeployment();
  addresses.IRSOracle = await irsOracle.getAddress();
  console.log("IRSOracle:", addresses.IRSOracle);

  // 5. DefaultOracle (depends: TIR)
  const DefaultOracle = await ethers.getContractFactory("DefaultOracle");
  const defaultOracle = await DefaultOracle.deploy(addresses.TIR);
  await defaultOracle.waitForDeployment();
  addresses.DefaultOracle = await defaultOracle.getAddress();
  console.log("DefaultOracle:", addresses.DefaultOracle);

  // 6. IssuerRegistry (depends: TIR, IssuerBond, IRSOracle, DefaultOracle)
  const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistry.deploy(
    addresses.TIR,
    addresses.IssuerBond,
    addresses.IRSOracle,
    addresses.DefaultOracle
  );
  await issuerRegistry.waitForDeployment();
  addresses.IssuerRegistry = await issuerRegistry.getAddress();
  console.log("IssuerRegistry:", addresses.IssuerRegistry);

  // 7. InsurancePool (depends: USDT)
  const InsurancePool = await ethers.getContractFactory("InsurancePool");
  const insurancePool = await InsurancePool.deploy(usdtAddress, deployer.address);
  await insurancePool.waitForDeployment();
  addresses.InsurancePool = await insurancePool.getAddress();
  console.log("InsurancePool:", addresses.InsurancePool);

  // 8. srCVR (depends: InsurancePool, USDT)
  const SrCVR = await ethers.getContractFactory("srCVR");
  const srCVR = await SrCVR.deploy(addresses.InsurancePool, usdtAddress);
  await srCVR.waitForDeployment();
  addresses.srCVR = await srCVR.getAddress();
  console.log("srCVR:", addresses.srCVR);

  // 9. jrCVR (depends: InsurancePool, USDT)
  const JrCVR = await ethers.getContractFactory("jrCVR");
  const jrCVR = await JrCVR.deploy(addresses.InsurancePool, usdtAddress);
  await jrCVR.waitForDeployment();
  addresses.jrCVR = await jrCVR.getAddress();
  console.log("jrCVR:", addresses.jrCVR);

  // 10. ProtectionCert
  const ProtectionCert = await ethers.getContractFactory("ProtectionCert");
  const protectionCert = await ProtectionCert.deploy();
  await protectionCert.waitForDeployment();
  addresses.ProtectionCert = await protectionCert.getAddress();
  console.log("ProtectionCert:", addresses.ProtectionCert);

  // 11. PayoutEngine (depends: USDT, Foundation)
  const PayoutEngine = await ethers.getContractFactory("PayoutEngine");
  const payoutEngine = await PayoutEngine.deploy(usdtAddress, foundation);
  await payoutEngine.waitForDeployment();
  addresses.PayoutEngine = await payoutEngine.getAddress();
  console.log("PayoutEngine:", addresses.PayoutEngine);

  // 12. SubrogationNFT (depends: PayoutEngine, Foundation)
  const SubrogationNFT = await ethers.getContractFactory("SubrogationNFT");
  const subrogationNFT = await SubrogationNFT.deploy(addresses.PayoutEngine, foundation);
  await subrogationNFT.waitForDeployment();
  addresses.SubrogationNFT = await subrogationNFT.getAddress();
  console.log("SubrogationNFT:", addresses.SubrogationNFT);

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3: Wire Permissions
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Wiring Permissions ---");

  // InsurancePool setters
  await insurancePool.setSrCVR(addresses.srCVR);
  await insurancePool.setJrCVR(addresses.jrCVR);
  await insurancePool.setIssuerRegistry(addresses.IssuerRegistry);
  await insurancePool.setIRSOracle(addresses.IRSOracle);
  await insurancePool.setDefaultOracle(addresses.DefaultOracle);
  await insurancePool.setPayoutEngine(addresses.PayoutEngine);
  console.log("InsurancePool wired");

  // IssuerBond setters
  await issuerBond.setPayoutEngine(addresses.PayoutEngine);
  await issuerBond.setIssuerRegistry(addresses.IssuerRegistry);
  console.log("IssuerBond wired");

  // IRSOracle setters
  await irsOracle.setInsurancePool(addresses.InsurancePool);
  await irsOracle.setPayoutEngine(addresses.PayoutEngine);
  await irsOracle.setKeeper(deployer.address);
  console.log("IRSOracle wired");

  // DefaultOracle setters
  await defaultOracle.setIRSOracle(addresses.IRSOracle);
  await defaultOracle.setInsurancePool(addresses.InsurancePool);
  await defaultOracle.setPayoutEngine(addresses.PayoutEngine);
  await defaultOracle.setIssuerRegistry(addresses.IssuerRegistry);
  console.log("DefaultOracle wired");

  // IssuerRegistry setters
  await issuerRegistry.setInsurancePool(addresses.InsurancePool);
  await issuerRegistry.setPayoutEngine(addresses.PayoutEngine);
  console.log("IssuerRegistry wired");

  // ProtectionCert setters
  await protectionCert.setPayoutEngine(addresses.PayoutEngine);
  console.log("ProtectionCert wired");

  // PayoutEngine setters
  await payoutEngine.setInsurancePool(addresses.InsurancePool);
  await payoutEngine.setDefaultOracle(addresses.DefaultOracle);
  await payoutEngine.setProtectionCert(addresses.ProtectionCert);
  await payoutEngine.setIssuerBond(addresses.IssuerBond);
  await payoutEngine.setSubrogationNFT(addresses.SubrogationNFT);
  await payoutEngine.setIRSOracle(addresses.IRSOracle);
  await payoutEngine.setIssuerRegistry(addresses.IssuerRegistry);
  console.log("PayoutEngine wired");

  console.log("\n✅ All permissions wired successfully!");

  // ═══════════════════════════════════════════════════════════════════
  // STEP 4: Save Deployment Addresses
  // ═══════════════════════════════════════════════════════════════════
  const network = await ethers.provider.getNetwork();
  const deployment = {
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    foundation: foundation,
    contracts: addresses,
  };

  const deployDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  const filename = network.chainId === 97n ? "bscTestnet.json" :
                   network.chainId === 56n ? "bscMainnet.json" :
                   network.chainId === 133n ? "hashkeyTestnet.json" :
                   "localhost.json";

  fs.writeFileSync(
    path.join(deployDir, filename),
    JSON.stringify(deployment, null, 2)
  );

  console.log(`\n📁 Deployment saved to deployments/${filename}`);
  console.log("\n═══════════════════════════════════════════════");
  console.log("  COVERFI PROTOCOL DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Contracts deployed: ${Object.keys(addresses).length}`);
  console.log(`  Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log("═══════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
