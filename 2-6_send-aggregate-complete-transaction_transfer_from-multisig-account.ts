import { firstValueFrom } from "rxjs";
import {
  Account,
  Address,
  AggregateTransaction,
  Deadline,
  Mosaic,
  PlainMessage,
  RepositoryFactoryHttp,
  TransferTransaction,
  UInt64,
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
    networkCurrencyMosaicIdHex: networkCurrencyMosaicId.toHex(),
    networkCurrencyDivisibility,
  });

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
  const recipientRawAddress = "TARDV42KTAIZEF64EQT4NXT7K55DHWBEFIXVJQY";
  const recipientAddress = Address.createFromRawAddress(recipientRawAddress);
  const relativeAmount = 1; // 1[XYM]送信 = 1*10^divisibility[μXYM]送信
  const absoluteAmount = Math.round(
    relativeAmount * parseInt("1" + "0".repeat(networkCurrencyDivisibility))
  ); // networkCurrencyDivisibility = 6 => 1[XYM] = 10^6[μXYM]
  const absoluteAmountUInt64 = UInt64.fromUint(absoluteAmount);
  const mosaic = new Mosaic(networkCurrencyMosaicId, absoluteAmountUInt64);
  const mosaics = [mosaic];
  const rawMessage = "Hello, Symbol from Multisig Account!";
  const plainMessage = PlainMessage.create(rawMessage); // 平文メッセージ
  const feeMultiplier = 100; // トランザクション手数料に影響する。現時点ではデフォルトのノードは手数料倍率が100で、多くのノードがこれ以下の数値を指定しており、100を指定しておけば素早く承認される傾向。

  // Create 1st inner transaction
  const innerTransaction1 = TransferTransaction.create(
    deadline,
    recipientAddress,
    mosaics,
    plainMessage,
    networkType,
    undefined,
    undefined,
    multisigAccount.publicAccount
  ).toAggregate(multisigAccount.publicAccount);

  // Create aggregate complete transaction ... max inner transactions = 100 transactions
  const aggregateCompleteTransaction = AggregateTransaction.createComplete(
    deadline,
    [innerTransaction1],
    networkType,
    [],
    undefined,
    undefined,
    cosigner1Account.publicAccount
  ).setMaxFeeForAggregate(feeMultiplier, 1); // 2 of 3 multisig account => 1 signature by signer + 1 cosignature by cosigner

  // Sign transaction by cosigner1(= the account to announce this transaction) and set cosignatures(signed by cosigner2)
  const signedAggregateCompleteTransactionWithCosignatures =
    cosigner1Account.signTransactionWithCosignatories(
      aggregateCompleteTransaction,
      [cosigner2Account],
      generationHash
    );
  const transactionHash =
    signedAggregateCompleteTransactionWithCosignatures.hash;
  const transactionPayload =
    signedAggregateCompleteTransactionWithCosignatures.payload;
  console.log({ transactionHash, transactionPayload });

  // Start monitoring of transaction status with websocket
  const listener = repositoryFactoryHttp.createListener();
  await listener.open();
  listener.newBlock().subscribe((block) => {
    console.log("New blok");
    console.dir({ block }, { depth: null });
  });
  listener.status(multisigAccount.address).subscribe((status) => {
    console.dir({ status }, { depth: null });
    listener.close();
    console.log("Transaction status error");
  });
  listener
    .unconfirmedAdded(multisigAccount.address)
    .subscribe((unconfirmedTransaction) => {
      console.dir({ unconfirmedTransaction }, { depth: null });
      console.log("Transaction unconfirmed");
    });
  listener
    .confirmed(multisigAccount.address)
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
