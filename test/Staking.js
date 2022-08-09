const {expect} = require("chai");
const {ethers} = require("hardhat");

describe("Staking", function () {
    let Staking, staking;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addr4;
    let addr5;
    let addrs;

    before(async function () {
        [owner, addr1, addr2, addr3, addr4, addr5, ...addrs] = await ethers.getSigners();

        Staking = await hre.ethers.getContractFactory("Staking");
        staking = await Staking.deploy({
            value: ethers.utils.parseEther('10')
        });

        await staking.deployed();

        console.log("contract staking deployed to:", staking.address);

    });


    describe("deploy", function () {
        it('should set owner', async function () {

            expect(await staking.owner()).to.equal(owner.address);
        });

        it('sets up tiers and lockperiods', async function () {

            expect(await staking.lockPeriods(0)).to.equal(30);
            expect(await staking.lockPeriods(1)).to.equal(90);
            expect(await staking.lockPeriods(2)).to.equal(180);

            expect(await staking.tiers(30)).to.equal(700);
            expect(await staking.tiers(90)).to.equal(1000);
            expect(await staking.tiers(180)).to.equal(1200);
        });

    });

    describe("stakeEther", function () {
        it('transfer ether  ', async function () {

            const provider = waffle.provider;
            let contractBalance;
            let signerBalance;
            const transferAmount = ethers.utils.parseEther('2.0')

            contractBalance = await provider.getBalance(staking.address)
            signerBalance = await owner.getBalance()

            const data = { value: transferAmount }
            const transaction =  await staking.connect(owner).stakeEther(30, data);
            const receipt = await transaction.wait()
            const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)

            console.log(`gas used ${gasUsed}`)
            console.log(`signerBalance ${signerBalance}`)

            //test the change in owner ether balance
            expect(
                await owner.getBalance()
            ).to.equal(
                signerBalance.sub(transferAmount).sub(gasUsed)
            )


            //test the change in contract ether balance
            expect(
                await provider.getBalance(staking.address)
            ).to.equal(
                contractBalance.add(transferAmount)
            )
        });

        it('adds a position to positions', async function () {
            const provider = waffle.provider;
            let position;
            const transferAmount = ethers.utils.parseEther('1.0')

             position = await staking.positions(0)
            console.log(position)
            expect(position.positionId).to.equal(0)
            expect(position.walletAddress).to.equal("0x00000000000000000000000000000000")
            expect(position.createdDate).to.equal(0)
            expect(position.unlockDate).to.equal(0)
            expect(position.percentInterest).to.equal(0)
            expect(position.weiStaked).to.equal(0)
            expect(position.weiInterest).to.equal(0)
            expect(position.open).to.equal(false)

            expect(await staking.currentPositionId()).to.equal(1)

            const data = {value: transferAmount}
            const transaction = await staking.connect(owner).stakeEther(90, data)
            const receipt = await transaction.wait();
            const block = await provider.getBlock(receipt.blockNumber)

            position = await staking.positions(0)

             expect(position.walletAddress).to.equal(owner.address)
             expect(position.createdDate).to.equal(block.timestamp  )
             expect(position.unlockDate).to.equal(block.timestamp + (86400 * 90))
             expect(position.percentInterest).to.equal(700)
             expect(position.weiStaked).to.equal(transferAmount)
             expect(position.weiInterest).to.equal(ethers.BigNumber.from(transferAmount).mul(1000).div(10000))
             expect(position.open).to.equal(true)
             expect(await staking.currentPositionId()).to.equal(2)

        });

        it('adds address and positionId to positionIdsByAddress', async function () {

            const transferAmount = ethers.utils.parseEther('5.0')
            const data = {value: transferAmount}

            await staking.connect(owner).stakeEther(30, data)
            await staking.connect(owner).stakeEther(30, data)
            await staking.connect(addr1).stakeEther(90, data)

            expect(await staking.positionIdsByAddress(owner.address, 0)).to.equal(0)
            expect(await staking.positionIdsByAddress(owner.address, 1)).to.equal(1)
            expect(await staking.positionIdsByAddress(addr1.address, 0)).to.equal(4)
        });
    });

    describe("modifyLockPeriods", function () {
        describe("owner", function () {

            it('should create new lock period', async function () {
                await staking.connect(owner).modifyLockPeriods(100, 999)

                expect(await staking.tiers(100)).to.equal(999);
                expect(await staking.lockPeriods(3)).to.equal(100);

            });
            it('should modify existing lock period', async function () {
                await staking.connect(owner).modifyLockPeriods(30, 150)

                expect(await staking.tiers(30)).to.equal(150);
            });
        });

        describe("not owner", function () {
            it('reverts', async function () {

                expect(
                    staking.connect(addr1).modifyLockPeriods(100, 999)
                ).to.be.revertedWith("Only owner may modify staking periods");
            });
        });
    });

    describe("getLockPeriods", function () {

            it('returns all lock periods', async function () {

                const lockPeriods = await staking.getLockPeriods()

                expect(
                    lockPeriods.map(v => Number(v._hex))
                ).to.eql([30,90,180,100,30]);
            });
    });

    describe("getInterestRate", function () {

        it('returns interest rate', async function () {

            const interestRate = await staking.getInterestRate(30)

            expect(
                interestRate
            ).to.equal(150);
        });
    });

    describe("getPositionById", function () {

        it('returns data about spec position', async function () {

            const provider = waffle.provider;

            const transferAmount = ethers.utils.parseEther('5')
            const data = {value: transferAmount}
            const transaction = await staking.connect(owner).stakeEther(90, data)
            const receipt = await transaction.wait();
            const block = await provider.getBlock(receipt.blockNumber)
            const position = await staking.connect(owner.address).getPositionById(0)

            console.log(`block.timestamp ${block.timestamp}`)

            expect(position.positionId).to.equal(0)
            expect(position.walletAddress).to.equal(owner.address)
            expect(position.createdDate).to.equal(block.timestamp)
            expect(position.unlockDate).to.equal(block.timestamp + (86400 * 90))
            expect(position.percentInterest).to.equal(1000)
            expect(position.weiStaked).to.equal(transferAmount)
            expect(position.weiInterest).to.equal(ethers.BigNumber.from(transferAmount).mul(1000).div(10000))
            expect(position.open).to.equal(true)

        });
    });

    describe("getPositionIdsForAddress", function () {

        it('returns list of positionsIds', async function () {

            let data
            let transaction

            const transferAmount = ethers.utils.parseEther('5')
              data = { value: transferAmount }
              transaction = await staking.connect(owner).stakeEther(90, data)

            data = { value: ethers.utils.parseEther('10') }
            transaction = await staking.connect(owner).stakeEther(90, data)

            const positionids = await staking.getPositionIdsForAddress(owner.address)

            expect(
                positionids.map(v => Number(v._hex))
            ).to.eql([0,1]);
        });
    });

    describe("changeUnlockDate", function () {
        describe("owner", function () {

            it('change unlock date', async function () {
                const data = { value: ethers.utils.parseEther('8') }
                const transaction = await staking.connect(addr1).stakeEther(90, data)
                const positionOld = await staking.getPositionById(0)

                const newUnlockDate = positionOld.unlockDate - (86400 * 500)

                await staking.connect(owner).changeUnlockDate(0, newUnlockDate)

                const positionNew = await staking.getPositionById(0)

                expect(positionNew.unlockDate).to.equal(positionOld.unlockDate - (86400 * 500));
            });

        });

        describe("not owner", function () {
            it('reverts', async function () {
                const data = { value: ethers.utils.parseEther('8') }
                const transaction = await staking.connect(addr1).stakeEther(90, data)
                const positionOld = await staking.getPositionById(0)
                const newUnlockDate = positionOld.unlockDate - (86400 * 500)
                expect(
                     staking.connect(addr1).changeUnlockDate(0, newUnlockDate)
                ).to.be.revertedWith("Only owner may modify staking periods");
            });

        });

    });

    describe("closePosition", function () {
        describe("after unlock date", function () {
        it('transfers principal and interest', async function () {
            const provider = waffle.provider;
            let transaction, receipt, block;

            const transferAmount = ethers.utils.parseEther('8')
            const data = {value: transferAmount}
              transaction = await staking.connect(addr1).stakeEther(90, data)
              receipt = await transaction.wait();
              block = await provider.getBlock(receipt.blockNumber)

            const newUnlockDate = block.timestamp - (86400 * 100)
            await staking.connect(owner).changeUnlockDate(0, newUnlockDate)
            const position = await staking.getPositionById(0)

            const signerBalanceBefore =  await addr1.getBalance()
            transaction = await staking.connect(addr1).closePosition(0)
            receipt = await transaction.wait();
            const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)
            const signerBalanceAfter =  await addr1.getBalance()

            expect(
                signerBalanceAfter
            ).to.equal(signerBalanceBefore.sub(gasUsed).add(position.weiStaked).add(position.weiInterest));
        });
    });

        describe("before unlock date", function () {
            it('transfers only principal ', async function () {
                const provider = waffle.provider;
                let transaction, receipt, block;

                const transferAmount = ethers.utils.parseEther('5')
                const data = {value: transferAmount}
                transaction = await staking.connect(addr1).stakeEther(90, data)
                receipt = await transaction.wait();
                block = await provider.getBlock(receipt.blockNumber)

                const position = await staking.getPositionById(0)

                const signerBalanceBefore =  await addr1.getBalance()
                transaction = await staking.connect(addr1).closePosition(0)
                receipt = await transaction.wait();
                const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)
                const signerBalanceAfter =  await addr1.getBalance()

                expect(
                    signerBalanceAfter
                ).to.equal(signerBalanceBefore.sub(gasUsed).add(position.weiStaked));
            });
        });
    });
});
