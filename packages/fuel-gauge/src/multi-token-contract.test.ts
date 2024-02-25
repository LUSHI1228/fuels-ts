import type { BN } from 'fuels';
import { Wallet, bn } from 'fuels';
import { TestNodeLauncher } from 'fuels/test-utils';

import { FuelGaugeProjectsEnum } from '../test/fixtures';

import { getProgramDir } from './utils';

// hardcoded subIds on MultiTokenContract
const subIds = [
  '0x4a778acfad1abc155a009dc976d2cf0db6197d3d360194d74b1fb92b96986b00',
  '0x0d000e76a67758bbc6861d48ca571876cd480d9df8cf4dfa635c168e1e97f324',
  '0xdf78cb1e1a1b31fff104eb0baf734a4767a1b1373687c29a26bf1a2b22d1a3c5',
];

const multiTokenContractDir = getProgramDir(FuelGaugeProjectsEnum.MULTI_TOKEN_CONTRACT);

/**
 * @group node
 */
describe('MultiTokenContract', () => {
  it('can mint and transfer coins', async () => {
    using launcher = await TestNodeLauncher.launch({
      deployContracts: [multiTokenContractDir],
    });
    const {
      provider,
      contracts: [multiTokenContract],
    } = launcher;
    // New wallet to transfer coins and check balance
    const userWallet = Wallet.generate({ provider });

    const contractId = { value: multiTokenContract.id.toB256() };

    const helperDict: { [key: string]: { assetId: string; amount: number } } = {
      [subIds[0]]: {
        assetId: '',
        amount: 100,
      },
      [subIds[1]]: {
        assetId: '',
        amount: 300,
      },
      [subIds[2]]: {
        assetId: '',
        amount: 400,
      },
    };

    // mint some coins of the 3 subIds on MultiTokenContract
    const { transactionResult } = await multiTokenContract
      .multiCall(
        subIds.map((subId) =>
          multiTokenContract.functions.mint_coins(subId, helperDict[subId].amount)
        )
      )
      .call();

    // update assetId on helperDict object
    (transactionResult?.mintedAssets || []).forEach(({ subId, assetId }) => {
      helperDict[subId].assetId = assetId || '';
    });

    // define helper to get contract balance
    const getBalance = async (address: { value: string }, assetId: string) => {
      const { value } = await multiTokenContract.functions
        .get_balance(address, { value: assetId })

        .simulate<BN>();
      return value;
    };

    // validates contract has expected balance after mint
    const validateMintPromises = subIds.map(async (subId) => {
      expect(bn(await getBalance(contractId, helperDict[subId].assetId)).toNumber()).toBe(
        helperDict[subId].amount
      );
    });

    await Promise.all(validateMintPromises);

    // transfer coins to user wallet
    await multiTokenContract
      .multiCall(
        subIds.map((subId) =>
          multiTokenContract.functions.transfer_coins_to_output(
            { value: userWallet.address.toB256() },
            { value: helperDict[subId].assetId },
            helperDict[subId].amount
          )
        )
      )
      .call();

    const validateTransferPromises = subIds.map(async (subId) => {
      // validates that user wallet has expected balance after transfer
      expect(bn(await userWallet.getBalance(helperDict[subId].assetId)).toNumber()).toBe(
        helperDict[subId].amount
      );
      // validates contract has not balance after transfer
      expect(bn(await getBalance(contractId, helperDict[subId].assetId)).toNumber()).toBe(0);
    });

    await Promise.all(validateTransferPromises);
  });

  it('can burn coins', async () => {
    using launcher = await TestNodeLauncher.launch({
      deployContracts: [multiTokenContractDir],
    });
    const {
      contracts: [multiTokenContract],
    } = launcher;
    const contractId = { value: multiTokenContract.id.toB256() };

    const helperDict: {
      [key: string]: {
        assetId: string;
        amount: number;
        amountToBurn: number;
      };
    } = {
      [subIds[0]]: {
        assetId: '',
        amount: 100,
        amountToBurn: 20,
      },
      [subIds[1]]: {
        assetId: '',
        amount: 300,
        amountToBurn: 180,
      },
      [subIds[2]]: {
        assetId: '',
        amount: 400,
        amountToBurn: 344,
      },
    };

    // mint some coins of the 3 subIds on MultiTokenContract
    const { transactionResult } = await multiTokenContract
      .multiCall(
        subIds.map((subId) =>
          multiTokenContract.functions.mint_coins(subId, helperDict[subId].amount)
        )
      )
      .call();

    // update assetId on helperDict object
    (transactionResult?.mintedAssets || []).forEach(({ subId, assetId }) => {
      helperDict[subId].assetId = assetId || '';
    });

    // define helper to get contract balance
    const getBalance = async (address: { value: string }, assetId: string) => {
      const { value } = await multiTokenContract.functions
        .get_balance(address, { value: assetId })

        .simulate<BN>();
      return value;
    };

    // validates contract has expected balance after mint
    const validateMintPromises = subIds.map(async (subId) => {
      expect(bn(await getBalance(contractId, helperDict[subId].assetId)).toNumber()).toBe(
        helperDict[subId].amount
      );
    });

    await Promise.all(validateMintPromises);

    // burning coins
    await multiTokenContract
      .multiCall(
        subIds.map((subId) =>
          multiTokenContract.functions.burn_coins(subId, helperDict[subId].amountToBurn)
        )
      )
      .call();

    const validateBurnPromises = subIds.map(async (subId) => {
      // validates contract has expected balance for each coin after burn
      expect(bn(await getBalance(contractId, helperDict[subId].assetId)).toNumber()).toBe(
        helperDict[subId].amount - helperDict[subId].amountToBurn
      );
    });

    await Promise.all(validateBurnPromises);
  });
});
