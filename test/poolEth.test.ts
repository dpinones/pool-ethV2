import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Signer, utils } from "ethers";
import { expectRevert } from '@openzeppelin/test-helpers';
import '@nomiclabs/hardhat-ethers'

import { PoolEth__factory, PoolEth } from '../build/types'

const { getContractFactory, getSigners } = ethers

describe('PoolEth', () => {
  let poolEth: PoolEth
  let deployer, userA, userB;
  let ether1, ether2, ether3;

  beforeEach(async () => {
    const signers = await getSigners()
    
    deployer = signers[0];
    userA = signers[1];
    userB = signers[2];

    ether1 = { value: ethers.utils.parseEther("10.0") };
    ether2 = { value: ethers.utils.parseEther("20.0") };
    ether3 = { value: ethers.utils.parseEther("30.0") };
    
    const counterFactory = (await getContractFactory('PoolEth', signers[0])) as PoolEth__factory
    poolEth = await counterFactory.deploy()
    await poolEth.deployed()
    const owner = await poolEth.owner();

    expect(owner).to.eq(await deployer.address);
  })

  describe('contrato recien deployado', async () => {
    it('UserA con balance == 0 ', async () => {
      // const tx = await poolEth.getBalance();
      // console.log('tx:', tx);
      // await expect(tx).revertedWith("PoolEth: does not have permissions");

      // await expectRevert(await poolEth.getBalance(), "PoolEth: does not have permissions");
      // await expect(await poolEth.getReward()).revertedWith("PoolEth: does not have permissions");
      expect(await poolEth.connect(userA).getBalance()).to.eq(0);
    });
    it('UserA con Reward == 0 ', async () => {
      expect(await poolEth.connect(userA).getReward()).to.eq(0);
    });
  })

  describe('A deposits 100, and B deposits 300 for a total of 400 in the pool.', async () => {
    it('detail', async () => {

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
      expect(await poolEth.connect(userA).totalPool()).to.eq(0);
      expect(await poolEth.connect(userA).getBalance()).to.eq(0);
      expect(await poolEth.connect(userB).getBalance()).to.eq(0);
      
      //stake
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther("100.0") });
      await poolEth.connect(userB).stake({ value: ethers.utils.parseEther("300.0") });
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther("400.0"));
      
      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther("200.0") });
      
      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther("50.0"));
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther("150.0"));

      //harvest
      await poolEth.connect(userA).harvest();
      await poolEth.connect(userB).harvest();

      //check
      expect(await poolEth.connect(userA).getBalance()).to.eq(0);
      expect(await poolEth.connect(userB).getBalance()).to.eq(0);
      expect(await poolEth.connect(userA).totalPool()).to.eq(0);
    });
  });
  
  describe(' A deposits then T deposits then B deposits then A withdraws and finally B withdraws.', async () => {
    it('Detail', async () => {

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
      expect(await poolEth.connect(userA).totalPool()).to.eq(0);
      expect(await poolEth.connect(userA).getBalance()).to.eq(0);
      expect(await poolEth.connect(userB).getBalance()).to.eq(0);
      
      //stake UserA
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther("100.0") });
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther("100.0"));
      
      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther("200.0") });
      
      // stake UserB
      await poolEth.connect(userB).stake({ value: ethers.utils.parseEther("300.0") });
      expect(await poolEth.connect(userB).totalPool()).to.eq(ethers.utils.parseEther("400.0"));

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther("200.0"));
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther("0.0"));

      //harvest
      await poolEth.connect(userA).harvest();
      await poolEth.connect(userB).harvest();

      //check
      expect(await poolEth.connect(userA).getBalance()).to.eq(0);
      expect(await poolEth.connect(userB).getBalance()).to.eq(0);
      expect(await poolEth.connect(userA).totalPool()).to.eq(0);
    });
  });

  describe(' A deposits then T deposits then B deposits then T deposits then A withdraws and finally B withdraws.', async () => {
    it('Detail', async () => {

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
      expect(await poolEth.connect(userA).totalPool()).to.eq(0);
      expect(await poolEth.connect(userA).getBalance()).to.eq(0);
      expect(await poolEth.connect(userB).getBalance()).to.eq(0);
      
      //stake UserA
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther("100.0") });
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther("100.0"));
      
      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther("300.0") });

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther("300.0"));
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther("0.0"));
      
      // stake UserB
      await poolEth.connect(userB).stake({ value: ethers.utils.parseEther("300.0") });
      expect(await poolEth.connect(userB).totalPool()).to.eq(ethers.utils.parseEther("400.0"));

      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther("200.0") });

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther("350.0"));
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther("150.0"));

      //harvest
      await poolEth.connect(userA).harvest();
      await poolEth.connect(userB).harvest();

      //check
      expect(await poolEth.connect(userA).getBalance()).to.eq(0);
      expect(await poolEth.connect(userB).getBalance()).to.eq(0);
      expect(await poolEth.connect(userA).totalPool()).to.eq(0);
    });
  });


  describe(' A deposits then T deposits then A compound then B deposits then T deposits then A withdraws and finally B withdraws.', async () => {
    it('Detail', async () => {

      /* 
      userA -> stake -> 100
      team -> deposit -> 300
      
      rewards currently:
      userA -> reward -> 300
      userB -> reward -> 0
      pool -> 100
      
      userA -> compound -> 300
      userB -> stake -> 300

      rewards currently:
      userA -> reward -> 0
      userB -> reward -> 0
      pool -> 700

      team -> deposit -> 200

      rewards currently:
      // userA -> reward -> 
      userB -> reward -> ?
      pool -> 0
      
      */

      //check
      expect(await poolEth.connect(userA).getBalance()).to.eq(0);
      expect(await poolEth.connect(userB).getBalance()).to.eq(0);
      expect(await poolEth.connect(userA).totalPool()).to.eq(0);
      
      //stake UserA
      await poolEth.connect(userA).stake({ value: ethers.utils.parseEther("100.0") });
      expect(await poolEth.connect(userA).totalPool()).to.eq(ethers.utils.parseEther("100.0"));
      
      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther("300.0") });

      //compound
      await poolEth.connect(userA).compound();

      //reward
      expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther("0.0"));
      expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther("0.0"));

      // stake UserB
      await poolEth.connect(userB).stake({ value: ethers.utils.parseEther("300.0") });
      expect(await poolEth.connect(userB).totalPool()).to.eq(ethers.utils.parseEther("700.0"));

      //deposit
      await poolEth.addDeposit({ value: ethers.utils.parseEther("200.0") });

      //reward
      console.log('await poolEth.connect(userA).getReward():', await poolEth.connect(userA).getReward());
      console.log('await poolEth.connect(userB).getReward():', await poolEth.connect(userB).getReward());
      // expect(await poolEth.connect(userA).getReward()).to.eq(ethers.utils.parseEther("114.0"));
      // expect(await poolEth.connect(userB).getReward()).to.eq(ethers.utils.parseEther("86.0"));

      //harvest
      // await poolEth.connect(userA).harvest();
      // await poolEth.connect(userB).harvest();

      //check
      // expect(await poolEth.connect(userA).getBalance()).to.eq(0);
      // expect(await poolEth.connect(userB).getBalance()).to.eq(0);
      // expect(await poolEth.connect(userA).totalPool()).to.eq(0);
    });
  });




})
