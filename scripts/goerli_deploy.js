// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
    [signer1, signer2] = await ethers.getSigners();

    const Staking = await hre.ethers.getContractFactory("Staking");
    const staking = await Staking.deploy();

    await staking.deployed();

    console.log("contract staking deployed to:", staking.address);
}

// npx hardhat run --network localhost scripts/1_deploy.js

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
