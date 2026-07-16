/**
 * YieldFi Badge Smart Contract Test Suite
 * Compatible with Hardhat (Waffle/Chai) or generic Mocha environments.
 */

import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("YieldFiBadgeCashback core engine tests", function () {
  let MockUSDT;
  let usdt;
  let YieldFiBadgeCashback;
  let contract;
  let owner;
  let treasury;
  let bot1;
  let bot2;
  let decimals = 6; // USDC/USDT standard

  beforeEach(async function () {
    // Get Signers
    [owner, treasury, bot1, bot2] = await ethers.getSigners();

    // Deploy Mock USDT
    const ERC20MockFactory = await ethers.getContractFactory("MockERC20"); // e.g. standard openzeppelin ERC20 mock
    usdt = await ERC20MockFactory.deploy("Mock USDT", "mUSDT", decimals);
    await usdt.waitForDeployment();

    // Deploy YieldFi core contract (Initial Fee: 30 Basis Points = 0.3%)
    const ContractFactory = await ethers.getContractFactory("YieldFiBadgeCashback");
    contract = await ContractFactory.deploy(
      await usdt.getAddress(),
      treasury.address,
      30
    );
    await contract.waitForDeployment();

    // Mint tokens to bots for testing
    const initialMint = ethers.parseUnits("10000000000", decimals); // $10B tokens
    await usdt.mint(bot1.address, initialMint);
    await usdt.mint(bot2.address, initialMint);

    // Approve contract to spend tokens
    await usdt.connect(bot1).approve(await contract.getAddress(), ethers.MaxUint256);
    await usdt.connect(bot2).approve(await contract.getAddress(), ethers.MaxUint256);
  });

  describe("1. Deployment & Configuration", function () {
    it("Should set the correct stablecoin address and decimals", async function () {
      expect(await contract.stablecoin()).to.equal(await usdt.getAddress());
      expect(await contract.decimals()).to.equal(decimals);
    });

    it("Should set the initial owner, treasury, and routing fee %", async function () {
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.treasury()).to.equal(treasury.address);
      expect(await contract.feePercentBps()).to.equal(30);
    });
  });

  describe("2. Badge Logic Tiers", function () {
    it("Should assign Level 1 for cumulative volume < $1,001", async function () {
      const tradeAmount = ethers.parseUnits("500", decimals); // $500
      await contract.connect(bot1).executeTrade(tradeAmount);
      
      const botProfile = await contract.bots(bot1.address);
      expect(botProfile.badgeLevel).to.equal(1); // Level 1 (PENNY SPARK)
    });

    it("Should assign Level 2 (IRON INITIATE) for cumulative volume $1,001 - $10k", async function () {
      const tradeAmount = ethers.parseUnits("5000", decimals); // $5,000
      await contract.connect(bot1).executeTrade(tradeAmount);
      
      const botProfile = await contract.bots(bot1.address);
      expect(botProfile.badgeLevel).to.equal(2);
    });

    it("Should assign Level 5 (PLATINUM OVERLORD) for cumulative volume $1M - $10M", async function () {
      const tradeAmount = ethers.parseUnits("5000000", decimals); // $5M
      await contract.connect(bot1).executeTrade(tradeAmount);
      
      const botProfile = await contract.bots(bot1.address);
      expect(botProfile.badgeLevel).to.equal(5);
    });

    it("Should assign Level 9 (OMEGA ARCHITECT) for cumulative volume $100B+", async function () {
      const tradeAmount = ethers.parseUnits("100000000000", decimals); // $100B
      await contract.connect(bot1).executeTrade(tradeAmount);
      
      const botProfile = await contract.bots(bot1.address);
      expect(botProfile.badgeLevel).to.equal(9);
    });
  });

  describe("3. Trading & Volume Tracking Mechanics", function () {
    it("Should register bot config and accumulate cumulativeVolume and txCount", async function () {
      const tradeAmount = ethers.parseUnits("10000", decimals); // $10,000
      await contract.connect(bot1).executeTrade(tradeAmount);

      const profile = await contract.bots(bot1.address);
      expect(profile.registered).to.be.true;
      expect(profile.cumulativeVolume).to.equal(tradeAmount);
      expect(profile.txCount).to.equal(1);
    });

    it("Should deduct the correct routing fee and send to treasury", async function () {
      const tradeAmount = ethers.parseUnits("1000", decimals); // $1,000
      const initialTreasuryBalance = await usdt.balanceOf(treasury.address);

      // Execute trade (0.3% fee = $3 USDT)
      await contract.connect(bot1).executeTrade(tradeAmount);

      const finalTreasuryBalance = await usdt.balanceOf(treasury.address);
      const feeEarned = finalTreasuryBalance - initialTreasuryBalance;
      
      expect(feeEarned).to.equal(ethers.parseUnits("3", decimals)); // $3
    });
  });

  describe("4. Administrative Safeguards", function () {
    it("Should allow the owner to pause and block execution, and resume", async function () {
      const tradeAmount = ethers.parseUnits("1000", decimals);

      // Pause contract
      await contract.connect(owner).setPaused(true);

      // Attempt trade while paused (Should fail)
      await expect(contract.connect(bot1).executeTrade(tradeAmount))
        .to.be.revertedWith("YieldFi: Protocol is paused");

      // Unpause contract
      await contract.connect(owner).setPaused(false);

      // Attempt trade (Should succeed)
      await expect(contract.connect(bot1).executeTrade(tradeAmount))
        .to.not.be.reverted;
    });

    it("Should allow only owner to update routing fee % up to 10%", async function () {
      // Non-owner updates fee (Should fail)
      await expect(contract.connect(bot1).updateFeePercent(100))
        .to.be.revertedWith("YieldFi: Caller is not the owner");

      // Owner updates fee to 50 BPS (0.5%) (Should succeed)
      await expect(contract.connect(owner).updateFeePercent(50))
        .to.emit(contract, "FeePercentUpdated")
        .withArgs(30, 50);

      expect(await contract.feePercentBps()).to.equal(50);
    });

    it("Should reject fee updates above 10% (1000 bps) safety limit", async function () {
      await expect(contract.connect(owner).updateFeePercent(1001))
        .to.be.revertedWith("YieldFi: Fee capped at 10%");
    });
  });
});
