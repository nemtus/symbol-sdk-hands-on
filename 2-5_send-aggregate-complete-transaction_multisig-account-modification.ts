import { firstValueFrom } from "rxjs";
import {
  Account,
  AggregateTransaction,
  Deadline,
  MultisigAccountModificationTransaction,
  RepositoryFactoryHttp,
  UnresolvedAddress,
} from "symbol-sdk";
import * as dotenv from "dotenv";

dotenv.config();

(async () => {
  const nodeUrl = "https://sym-test-04.opening-line.jp:3001";
  const repositoryFactoryHttp = new RepositoryFactoryHttp(nodeUrl);

  // Get network info
  const networkType = await firstValueFrom(
    repositoryFactoryHttp.getNetworkType()
  );
  const epochAdjustment = await firstValueFrom(
    repositoryFactoryHttp.getEpochAdjustment()
  );
  const generationHash = await firstValueFrom(
    repositoryFactoryHttp.getGenerationHash()
  );
  const networkCurrencies = await firstValueFrom(
    repositoryFactoryHttp.getCurrencies()
  );
  const networkCurrency = networkCurrencies.currency;
  const networkCurrencyMosaicId = networkCurrency.mosaicId!;
  const networkCurrencyDivisibility = networkCurrency.divisibility;
  console.log({
    networkType,
    epochAdjustment,
    generationHash,
    networkCurrencyMosaicId,
    networkCurrencyDivisibility,
  });
  console.log(networkCurrencyMosaicId.toHex());

  // Sender account info
  const senderRawPrivateKey = process.env.SYMBOL_TESTNET_PRIVATE_KEY!;
  const senderRawAddress = process.env.SYMBOL_TESTNET_ADDRESS!;
  const senderAccount = Account.createFromPrivateKey(
    senderRawPrivateKey,
    networkType
  );
  if (senderAccount.address.plain() !== senderRawAddress) {
    throw Error("senderAccount does not match senderRawAddress");
  }

  // Multisig account info
  const multisigRawPrivateKey =
    process.env.SYMBOL_TESTNET_MULTISIG_PRIVATE_KEY!;
  const multisigRawAddress = process.env.SYMBOL_TESTNET_MULTISIG_ADDRESS!;
  const multisigAccount = Account.createFromPrivateKey(
    multisigRawPrivateKey,
    networkType
  );
  if (multisigAccount.address.plain() !== multisigRawAddress) {
    throw Error("multisigAccount does not match multisigRawAddress");
  }

  // Cosigner1 account info
  const cosigner1RawPrivateKey =
    process.env.SYMBOL_TESTNET_COSIGNER1_PRIVATE_KEY!;
  const cosigner1RawAddress = process.env.SYMBOL_TESTNET_COSIGNER1_ADDRESS!;
  const cosigner1Account = Account.createFromPrivateKey(
    cosigner1RawPrivateKey,
    networkType
  );
  if (cosigner1Account.address.plain() !== cosigner1RawAddress) {
    throw Error("cosigner1Account does not match cosigner1RawAddress");
  }

  // Cosigner2 account info
  const cosigner2RawPrivateKey =
    process.env.SYMBOL_TESTNET_COSIGNER2_PRIVATE_KEY!;
  const cosigner2RawAddress = process.env.SYMBOL_TESTNET_COSIGNER2_ADDRESS!;
  const cosigner2Account = Account.createFromPrivateKey(
    cosigner2RawPrivateKey,
    networkType
  );
  if (cosigner2Account.address.plain() !== cosigner2RawAddress) {
    throw Error("cosigner2Account does not match cosigner2RawAddress");
  }

  // Cosigner3 account info
  const cosigner3RawPrivateKey =
    process.env.SYMBOL_TESTNET_COSIGNER3_PRIVATE_KEY!;
  const cosigner3RawAddress = process.env.SYMBOL_TESTNET_COSIGNER3_ADDRESS!;
  const cosigner3Account = Account.createFromPrivateKey(
    cosigner3RawPrivateKey,
    networkType
  );
  if (cosigner3Account.address.plain() !== cosigner3RawAddress) {
    throw Error("cosigner3Account does not match cosigner3RawAddress");
  }

  // Transaction info
  const deadline = Deadline.create(epochAdjustment); // デフォルトは2時間後
  const minApprovalDelta: number = 2;
  const minRemovalDelta: number = 2;
  const addressAdditions: UnresolvedAddress[] = [
    cosigner1Account.address,
    cosigner2Account.address,
    cosigner3Account.address,
  ];
  const addressDeletions: UnresolvedAddress[] = [];
  const feeMultiplier = 100; // トランザクション手数料に影響する。現時点ではデフォルトのノードは手数料倍率が100で、多くのノードがこれ以下の数値を指定しており、100を指定しておけば素早く承認される傾向。

  // Create 1st inner transaction
  const multisigModificationTransaction =
    MultisigAccountModificationTransaction.create(
      deadline,
      minApprovalDelta,
      minRemovalDelta,
      addressAdditions,
      addressDeletions,
      networkType
    ).toAggregate(multisigAccount.publicAccount);

  // Create aggregate complete transaction
  const aggregateCompleteTransaction = AggregateTransaction.createComplete(
    deadline,
    [multisigModificationTransaction],
    networkType,
    [],
    undefined,
    undefined,
    multisigAccount.publicAccount
  ).setMaxFeeForAggregate(feeMultiplier, 3); // 3 = cosignature's count = cosigner1 + cosigner2 + cosigner3

  // Sign transaction by multisig(= the account to announce this transaction) and set cosignatures(signed by cosigner1, cosigner2, cosigner3)
  const signedAggregateCompleteTransactionWithCosignatures =
    multisigAccount.signTransactionWithCosignatories(
      aggregateCompleteTransaction,
      [cosigner1Account, cosigner2Account, cosigner3Account],
      generationHash
    );

  // Start monitoring of transaction status with websocket
  const listener = repositoryFactoryHttp.createListener();
  await listener.open();
  listener.newBlock().subscribe((block) => {
    console.log("New blok");
    console.dir({ block }, { depth: null });
  });
  listener.status(senderAccount.address).subscribe((status) => {
    console.dir({ status }, { depth: null });
    listener.close();
    console.log("Transaction status error");
  });
  listener
    .unconfirmedAdded(senderAccount.address)
    .subscribe((unconfirmedTransaction) => {
      console.dir({ unconfirmedTransaction }, { depth: null });
      console.log("Transaction unconfirmed");
    });
  listener
    .confirmed(senderAccount.address)
    .subscribe((confirmedTransaction) => {
      console.dir({ confirmedTransaction }, { depth: null });
      listener.close();
      console.log("Transaction confirmed");
      console.log(
        `https://testnet.symbol.fyi/transactions/${confirmedTransaction.transactionInfo?.hash}`
      );
    });

  // Announce transaction
  const transactionRepository =
    repositoryFactoryHttp.createTransactionRepository();
  const transactionAnnounceResponse = await firstValueFrom(
    transactionRepository.announce(
      signedAggregateCompleteTransactionWithCosignatures
    )
  );
  console.dir({ transactionAnnounceResponse }, { depth: null });
})();
