import { expect } from 'chai'
import { ethers } from 'hardhat'
import { expectRevert } from '@openzeppelin/test-helpers';
import '@nomiclabs/hardhat-ethers'

import { PoolEth__factory, PoolEth } from '../build/types'

const { getContractFactory, getSigners } = ethers

describe('PoolEth', () => {
  let poolEth: PoolEth
  let deployer, user, otherUser;

  beforeEach(async () => {
    // 1
    const signers = await getSigners()
    
    deployer = signers[0];
    user = signers[1];
    otherUser = signers[2];
    
    // 2
    const counterFactory = (await getContractFactory('PoolEth', signers[0])) as PoolEth__factory
    poolEth = await counterFactory.deploy()
    await poolEth.deployed()
    const owner = await poolEth.owner();

    // 3
    expect(owner).to.eq(await deployer.address);
  })

  // 4
  describe('no es usuario', async () => {
    it('get', async () => {
      // const tx = await poolEth.getBalance();
      // console.log('tx:', tx);
      // await expect(tx).revertedWith("PoolEth: does not have permissions");

      await expectRevert(await poolEth.getBalance(), "PoolEth: does not have permissions");
      // await expect(await poolEth.getReward()).revertedWith("PoolEth: does not have permissions");
      // expect(await poolEth.connect(user).getBalance()).to.eq(0);
      // expect(await poolEth.connect(user).getReward()).to.eq(0);
    })
  })

  // describe('count down', async () => {
  //   // 5
  //   it('should fail due to underflow exception', async () => {
  //     const tx = counter.countDown()
  //     await expect(tx).revertedWith('Uint256 underflow')
  //   })

  //   it('should count down', async () => {
  //     await counter.countUp()

  //     await counter.countDown()
  //     const count = await counter.getCount()
  //     expect(count).to.eq(0)
  //   })
  // })
})
