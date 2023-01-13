// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
    [signer1, signer2] = await ethers.getSigners();

    const Staking = await hre.ethers.getContractFactory("Staking", signer1);
    const staking = await Staking.deploy({
        value: ethers.utils.parseEther('0.05')
    });

    await staking.deployed();

    console.log("contract staking deployed to:", staking.address, "by", signer1.address);

    const provider = waffle.provider;
    let data, transaction, receipt, block, newUnlockDate;

    data = { value: ethers.utils.parseEther('0.5') }
    transaction = await staking.connect(signer2).stakeEther(30, data)

    data = { value: ethers.utils.parseEther('1') }
    transaction = await staking.connect(signer2).stakeEther(180, data)

    data = { value: ethers.utils.parseEther('1.75') }
    transaction = await staking.connect(signer2).stakeEther(180, data)

    data = { value: ethers.utils.parseEther('5') }
    transaction = await staking.connect(signer2).stakeEther(90, data)
    receipt = await transaction.wait()
    block = await provider.getBlock(receipt.blockNumber)
    newUnlockDate = block.timestamp - (60 * 60 * 24 * 100)
    await staking.connect(signer1).changeUnlockDate(3, newUnlockDate)

    data = { value: ethers.utils.parseEther('1.75') }
    transaction = await staking.connect(signer2).stakeEther(180, data)
    receipt = await transaction.wait()
    block = await provider.getBlock(receipt.blockNumber)
    newUnlockDate = block.timestamp - (60 * 60 * 24 * 100)
    await staking.connect(signer1).changeUnlockDate(4, newUnlockDate)
}

// npx hardhat run --network localhost scripts/1_deploy.js

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
