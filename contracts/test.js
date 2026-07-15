/**
 * YieldFi Badge + Cashback Smart Contract Test Suite
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
    it("Should accurately assign badge Level 1 for trade < $1,001", async function () {
      const tradeAmount = ethers.parseUnits("500", decimals); // $500
      await contract.connect(bot1).executeTrade(tradeAmount);
      
      const botProfile = await contract.bots(bot1.address);
      expect(botProfile.badgeLevel).to.equal(1); // Level 1 (PENNY SPARK)
    });

    it("Should assign Level 2 (IRON INITIATE) for $1,001 - $10k", async function () {
      const tradeAmount = ethers.parseUnits("5000", decimals); // $5,000
      await contract.connect(bot1).executeTrade(tradeAmount);
      
      const botProfile = await contract.bots(bot1.address);
      expect(botProfile.badgeLevel).to.equal(2);
    });

    it("Should assign Level 5 (PLATINUM OVERLORD) for $1M - $10M", async function () {
      const tradeAmount = ethers.parseUnits("5000000", decimals); // $5M
      await contract.connect(bot1).executeTrade(tradeAmount);
      
      const botProfile = await contract.bots(bot1.address);
      expect(botProfile.badgeLevel).to.equal(5);
    });

    it("Should assign Level 9 (OMEGA ARCHITECT) for $100B+", async function () {
      const tradeAmount = ethers.parseUnits("100000000000", decimals); // $100B
      await contract.connect(bot1).executeTrade(tradeAmount);
      
      const botProfile = await contract.bots(bot1.address);
      expect(botProfile.badgeLevel).to.equal(9);
    });
  });

  describe("3. Trading & Cashback Milestone Mechanics", function () {
    it("Should register bot config and set firstTxAmount on first trade", async function () {
      const tradeAmount = ethers.parseUnits("10000", decimals); // $10,000
      await contract.connect(bot1).executeTrade(tradeAmount);

      const profile = await contract.bots(bot1.address);
      expect(profile.registered).to.be.true;
      expect(profile.firstTxAmount).to.equal(tradeAmount);
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

    it("Should pay exactly 1% cashback on the 10th transaction if amount matches 1st transaction", async function () {
      const tradeAmount = ethers.parseUnits("1000", decimals); // $1,000
      
      // Inject cashback pool liquidity to the contract first
      const fundingAmount = ethers.parseUnits("100000", decimals);
      await usdt.connect(owner).approve(await contract.getAddress(), fundingAmount);
      await contract.connect(owner).fundCashbackPool(fundingAmount);

      // Execute 9 trades of $1,000
      for (let i = 0; i < 9; i++) {
        await contract.connect(bot1).executeTrade(tradeAmount);
      }

      // Record USDT balance before 10th trade
      const preBalance = await usdt.balanceOf(bot1.address);

      // Execute 10th trade (Triggers 1% cashback of $1,000 = $10 USDT)
      // Transaction will pull $1,000. It deducts 0.3% fee ($3). It awards $10 cashback.
      // Net refund returned from execution = tradeValue - fee - cashback + cashback = $997 + $10 = $1007.
      // So the bot's final balance difference should be exactly -$990.
      await expect(contract.connect(bot1).executeTrade(tradeAmount))
        .to.emit(contract, "CashbackPaid")
        .withArgs(bot1.address, ethers.parseUnits("10", decimals), 10, any);

      const postBalance = await usdt.balanceOf(bot1.address);
      const balanceDiff = preBalance - postBalance;

      expect(balanceDiff).to.equal(ethers.parseUnits("990", decimals)); // Net spent $990 instead of $997
    });

    it("Should NOT pay cashback on 10th trade if the amount does NOT match 1st transaction", async function () {
      const tradeAmount1 = ethers.parseUnits("1000", decimals); // 1st Trade = $1,000
      const tradeAmount2 = ethers.parseUnits("2000", decimals); // Different Trade size
      
      await contract.connect(bot1).executeTrade(tradeAmount1);

      // Execute 8 more trades of $1,000
      for (let i = 0; i < 8; i++) {
        await contract.connect(bot1).executeTrade(tradeAmount1);
      }

      // 10th trade is executed with different amount ($2,000)
      // Cash back condition is: `txCount % 10 == 0 && amount == bot.firstTxAmount`
      // Since amount ($2,000) != firstTxAmount ($1,000), cashback is NOT paid.
      await expect(contract.connect(bot1).executeTrade(tradeAmount2))
        .to.not.emit(contract, "CashbackPaid");
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
