import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer, utils } from 'ethers'
import '@nomiclabs/hardhat-ethers'

import { PoolEth__factory, PoolEth } from '../build/types'

const { getContractFactory, getSigners } = ethers

describe('PoolEth', () => {
  let poolEth: PoolEth
  let deployer, userA, userB
  let ether1, ether2, ether3

  beforeEach(async () => {
    const signers = await getSigners()

    deployer = signers[0]
    userA = signers[1]
    userB = signers[2]

    ether1 = { value: ethers.utils.parseEther('10.0') }
    ether2 = { value: ethers.utils.parseEther('20.0') }
    ether3 = { value: ethers.utils.parseEther('30.0') }

    const counterFactory = (await getContractFactory('PoolEth', signers[0])) as PoolEth__factory
    poolEth = await counterFactory.deploy()
    await poolEth.deployed()
  })

  describe('deploy', async () => {
    it('check deployer', async () => {
      expect(await poolEth.owner()).to.eq(deployer.address)
    })

    it('totalPool is 0', async () => {
      expect(await poolEth.totalPool()).to.eq(0)
    })
  })

  describe('Deployer', async () => {
    it('not have permissions', async () => {
      await expect(poolEth.stake()).to.be.revertedWith('PoolEth: does not have permissions')
      await expect(poolEth.compound()).to.be.revertedWith('PoolEth: does not have permissions')
      await expect(poolEth.harvest()).to.be.revertedWith('PoolEth: does not have permissions')
      await expect(poolEth.getBalance()).to.be.revertedWith('PoolEth: does not have permissions')
      await expect(poolEth.getReward()).to.be.revertedWith('PoolEth: does not have permissions')
      await expect(poolEth.addDeposit()).to.be.revertedWith('PoolEth: amount can not be 0')
      await expect(poolEth.addDeposit({ value: ethers.utils.parseEther('100.0') })).to.be.revertedWith(
        'PoolEth: no users in pool',
      )
      // await expect(poolEth.connect(userA).stake()).to.be.revertedWith('PoolEth: amount can not be 0');
    })

    it('add Deposit', async () => {
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther('100.0') })
      await poolEth.addDeposit({ value: ethers.utils.parseEther('200.0') })
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther('200.0'))
    })
  })

  describe('User not have permissions', async () => {
    it('stake 0 ether', async () => {
      await expect(poolEth.connect(userA).stake()).to.be.revertedWith('PoolEth: amount can not be 0')
    })

    it('compound with reward 0', async () => {
      await expect(poolEth.connect(userA).compound()).to.be.revertedWith('PoolEth: has no rewards')
    })

    it('harvest with amount 0', async () => {
      await expect(poolEth.connect(userA).harvest()).to.be.revertedWith('PoolEth: it has no amount')
    })
  })

  describe('User get', async () => {
    it('getBalance', async () => {
      expect(await poolEth.connect(userA).getBalance()).to.eq(0)
    })

    it('getReward', async () => {
      expect(await poolEth.connect(userA).getReward()).to.eq(0)
    })

    it('stake and harvest without equipment deposit', async () => {
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther('100.0') })
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther('100.0'))
      expect(await poolEth.connect(userA).getReward()).to.eq(0)
      await poolEth.connect(userA).harvest()
      expect(await poolEth.connect(userA).getReward()).to.eq(0)
      expect(await poolEth.connect(userA).totalPool()).to.eq(0)
    })
  })

  describe('Interactive', async () => {
    it('A deposits 100, and B deposits 300 for a total of 400 in the pool.', async () => {
      /* 
      userA -> stake -> 100
      userB -> stake -> 300
      team -> deposit -> 200

      expected response:
      userA -> reward -> 50
      userB -> reward -> 150 
      pool -> 
      */

      //check
      expect(await poolEth.connect(userA).totalPool()).to.eq(0)
      expect(await poolEth.connect(userA).getBalance()).to.eq(0)
      expect(await poolEth.connect(userB).getBalance()).to.eq(0)

      //stake
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther('100.0') })
      await poolEth.connect(userB).stake({ value: ethers.utils.parseEther('300.0') })
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther('400.0'))

      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther('200.0') })

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther('50.0'))
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther('150.0'))

      //harvest
      await poolEth.connect(userA).harvest()
      await poolEth.connect(userB).harvest()

      //check
      expect(await poolEth.connect(userA).getBalance()).to.eq(0)
      expect(await poolEth.connect(userB).getBalance()).to.eq(0)
      expect(await poolEth.connect(userA).totalPool()).to.eq(0)
    })

    it('A deposits then T deposits then B deposits then A withdraws and finally B withdraws.', async () => {
      /* 
      userA -> stake -> 100
      team -> deposit -> 200
      userB -> stake -> 300

      rewards currently:
      userA -> reward -> 200
      userB -> reward -> 0 
      pool -> 
      */

      //check
      expect(await poolEth.connect(userA).totalPool()).to.eq(0)
      expect(await poolEth.connect(userA).getBalance()).to.eq(0)
      expect(await poolEth.connect(userB).getBalance()).to.eq(0)

      //stake UserA
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther('100.0') })
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther('100.0'))

      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther('200.0') })

      // stake UserB
      await poolEth.connect(userB).stake({ value: ethers.utils.parseEther('300.0') })
      expect(await poolEth.connect(userB).totalPool()).to.eq(ethers.utils.parseEther('400.0'))

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther('200.0'))
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther('0.0'))

      //harvest
      await poolEth.connect(userA).harvest()
      await poolEth.connect(userB).harvest()

      //check
      expect(await poolEth.connect(userA).getBalance()).to.eq(0)
      expect(await poolEth.connect(userB).getBalance()).to.eq(0)
      expect(await poolEth.connect(userA).totalPool()).to.eq(0)
    })

    it('A deposits then T deposits then B deposits then T deposits then A withdraws and finally B withdraws.', async () => {
      /* 
      userA -> stake -> 100
      team -> deposit -> 300
      
      rewards currently:
      userA -> reward -> 300
      userB -> reward -> 0
      pool -> 
      
      userB -> stake -> 300
      team -> deposit -> 200

      rewards currently:
      userA -> reward -> 350
      userB -> reward -> 150
      pool -> 

      */

      //check
      expect(await poolEth.connect(userA).totalPool()).to.eq(0)
      expect(await poolEth.connect(userA).getBalance()).to.eq(0)
      expect(await poolEth.connect(userB).getBalance()).to.eq(0)

      //stake UserA
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther('100.0') })
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther('100.0'))

      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther('300.0') })

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther('300.0'))
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther('0.0'))

      // stake UserB
      await poolEth.connect(userB).stake({ value: ethers.utils.parseEther('300.0') })
      expect(await poolEth.connect(userB).totalPool()).to.eq(ethers.utils.parseEther('400.0'))

      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther('200.0') })

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther('350.0'))
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther('150.0'))

      //harvest
      await poolEth.connect(userA).harvest()
      await poolEth.connect(userB).harvest()

      //check
      expect(await poolEth.connect(userA).getBalance()).to.eq(0)
      expect(await poolEth.connect(userB).getBalance()).to.eq(0)
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther('0.0'))
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther('0.0'))
      expect(await poolEth.connect(userA).totalPool()).to.eq(0)
    })

    it('A deposits then T deposits then A compound then B deposits then T deposits then A withdraws and finally B withdraws.', async () => {
      /* 
      userA -> stake -> 100
      team -> deposit -> 250
      
      rewards currently:
      userA -> reward -> 250
      userB -> reward -> 0
      pool -> 100
      
      userA -> compound -> 350
      userB -> stake -> 150

      rewards currently:
      userA -> reward -> 0
      userB -> reward -> 0
      pool -> 500

      team -> deposit -> 500

      rewards currently:
      userA -> reward -> 350
      userB -> reward -> 150
      pool -> 0
      
      */

      //check
      expect(await poolEth.connect(userA).getBalance()).to.eq(0)
      expect(await poolEth.connect(userB).getBalance()).to.eq(0)
      expect(await poolEth.connect(userA).totalPool()).to.eq(0)

      //stake UserA
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther('100.0') })
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther('100.0'))

      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther('250.0') })

      //compound
      await poolEth.connect(userA).compound()
      expect(await poolEth.connect(userA).getBalance()).to.eq(ethers.utils.parseEther('350.0'))

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther('0.0'))
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther('0.0'))

      // stake UserB
      await poolEth.connect(userB).stake({ value: ethers.utils.parseEther('150.0') })
      expect(await poolEth.connect(userB).totalPool()).to.eq(ethers.utils.parseEther('500.0'))

      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther('500.0') })

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther('350.0'))
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther('150.0'))

      //harvest
      await poolEth.connect(userA).harvest()
      await poolEth.connect(userB).harvest()

      //check
      expect(await poolEth.connect(userA).getBalance()).to.eq(0)
      expect(await poolEth.connect(userB).getBalance()).to.eq(0)
      expect(await poolEth.connect(userA).totalPool()).to.eq(0)
    })

    it('A deposits then T deposits then T deposits and finally A withdraws.', async () => {
      /* 
      userA -> stake -> 100
      team -> deposit -> 250
      
      rewards currently:
      userA -> reward -> 250
      pool -> 100
      
      team -> deposit -> 500

      rewards currently:
      userA -> reward -> 750
      pool -> 100
      */

      //check
      expect(await poolEth.connect(userA).getBalance()).to.eq(0)
      expect(await poolEth.connect(userA).totalPool()).to.eq(0)

      //stake UserA
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther('100.0') })
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther('100.0'))

      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther('250.0') })

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther('250.0'))
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther('100.0'))

      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther('500.0') })

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther('750.0'))
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther('100.0'))
    })
  })
})
