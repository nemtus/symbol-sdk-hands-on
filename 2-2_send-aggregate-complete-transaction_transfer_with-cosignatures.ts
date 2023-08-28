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
  const nodeUrl = "https://sym-test-03.opening-line.jp:3001";
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
  const recipientRawAddress = "TARDV42KTAIZEF64EQT4NXT7K55DHWBEFIXVJQY";
  const recipientAddress = Address.createFromRawAddress(recipientRawAddress);
  const relativeAmount = 1; // 1[XYM]送信 = 1*10^divisibility[μXYM]送信
  const absoluteAmount =
    relativeAmount * parseInt("1" + "0".repeat(networkCurrencyDivisibility)); // networkCurrencyDivisibility = 6 => 1[XYM] = 10^6[μXYM]
  const absoluteAmountUInt64 = UInt64.fromUint(absoluteAmount);
  const mosaic = new Mosaic(networkCurrencyMosaicId, absoluteAmountUInt64);
  const mosaics = [mosaic];
  const rawMessage = "Hello, Symbol!";
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
    senderAccount.publicAccount
  ).toAggregate(senderAccount.publicAccount);

  // // Create 2nd inner transaction
  // const innerTransaction2 = TransferTransaction.create(
  //   deadline,
  //   recipientAddress,
  //   mosaics,
  //   PlainMessage.create("I will be a multisig account."),
  //   networkType,
  //   undefined,
  //   undefined,
  //   multisigAccount.publicAccount
  // ).toAggregate(multisigAccount.publicAccount);

  // Create 3rd inner transaction
  const innerTransaction3 = TransferTransaction.create(
    deadline,
    recipientAddress,
    mosaics,
    PlainMessage.create("I will be a cosigner1 account."),
    networkType,
    undefined,
    undefined,
    cosigner1Account.publicAccount
  ).toAggregate(cosigner1Account.publicAccount);

  // Create 4th inner transaction
  const innerTransaction4 = TransferTransaction.create(
    deadline,
    recipientAddress,
    mosaics,
    PlainMessage.create("I will be a cosigner2 account."),
    networkType,
    undefined,
    undefined,
    cosigner2Account.publicAccount
  ).toAggregate(cosigner2Account.publicAccount);

  // Create 5th inner transaction
  const innerTransaction5 = TransferTransaction.create(
    deadline,
    recipientAddress,
    mosaics,
    PlainMessage.create("I will be a cosigner3 account."),
    networkType,
    undefined,
    undefined,
    cosigner3Account.publicAccount
  ).toAggregate(cosigner3Account.publicAccount);

  // Create aggregate complete transaction ... max inner transactions = 100 transactions
  const aggregateCompleteTransaction = AggregateTransaction.createComplete(
    deadline,
    [
      innerTransaction1,
      // innerTransaction2,
      innerTransaction3,
      innerTransaction4,
      innerTransaction5,
    ],
    networkType,
    [],
    undefined,
    undefined,
    senderAccount.publicAccount
  ).setMaxFeeForAggregate(feeMultiplier, 3);
  // (4 = cosignature's count = multisig + cosigner1 + cosigner2 + cosigner3)
  // 3 = cosignature's count = cosigner1 + cosigner2 + cosigner3

  // Sign transaction by sender(= the account to announce this transaction) and set cosignatures(signed by multisig, cosigner1, cosigner2, cosigner3)
  const signedAggregateCompleteTransactionWithCosignatures =
    senderAccount.signTransactionWithCosignatories(
      aggregateCompleteTransaction,
      [
        // multisigAccount,
        cosigner1Account,
        cosigner2Account,
        cosigner3Account,
      ],
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
