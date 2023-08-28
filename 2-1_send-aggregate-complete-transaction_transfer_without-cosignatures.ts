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

  // Transaction info
  const deadline = Deadline.create(epochAdjustment); // デフォルトは2時間後
  const recipientRawAddress = process.env.SYMBOL_TESTNET_FAUCET_ADDRESS!;
  const recipientAddress = Address.createFromRawAddress(recipientRawAddress);
  const relativeAmount = 500; // 500[XYM]送信 = 500*10^divisibility[μXYM]送信
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

  // Create 2nd inner transaction
  const recipientRawAddressMultisig =
    process.env.SYMBOL_TESTNET_MULTISIG_ADDRESS!;
  const innerTransaction2 = TransferTransaction.create(
    deadline,
    Address.createFromRawAddress(recipientRawAddressMultisig),
    mosaics,
    PlainMessage.create("You will be a multisig account."),
    networkType,
    undefined,
    undefined,
    senderAccount.publicAccount
  ).toAggregate(senderAccount.publicAccount);

  // Create 3rd inner transaction
  const recipientRawAddressCosigner1 =
    process.env.SYMBOL_TESTNET_COSIGNER1_ADDRESS!;
  const innerTransaction3 = TransferTransaction.create(
    deadline,
    Address.createFromRawAddress(recipientRawAddressCosigner1),
    mosaics,
    PlainMessage.create("You will be a cosigner1 account."),
    networkType,
    undefined,
    undefined,
    senderAccount.publicAccount
  ).toAggregate(senderAccount.publicAccount);

  // Create 4th inner transaction
  const recipientRawAddressCosigner2 =
    process.env.SYMBOL_TESTNET_COSIGNER2_ADDRESS!;
  const innerTransaction4 = TransferTransaction.create(
    deadline,
    Address.createFromRawAddress(recipientRawAddressCosigner2),
    mosaics,
    PlainMessage.create("You will be a cosigner2 account."),
    networkType,
    undefined,
    undefined,
    senderAccount.publicAccount
  ).toAggregate(senderAccount.publicAccount);

  // Create 5th inner transaction
  const recipientRawAddressCosigner3 =
    process.env.SYMBOL_TESTNET_COSIGNER3_ADDRESS!;
  const innerTransaction5 = TransferTransaction.create(
    deadline,
    Address.createFromRawAddress(recipientRawAddressCosigner3),
    mosaics,
    PlainMessage.create("You will be a cosigner3 account."),
    networkType,
    undefined,
    undefined,
    senderAccount.publicAccount
  ).toAggregate(senderAccount.publicAccount);

  // Create aggregate complete transaction ... max inner transactions = 100 transactions
  const aggregateCompleteTransaction = AggregateTransaction.createComplete(
    deadline,
    [
      innerTransaction1,
      innerTransaction2,
      innerTransaction3,
      innerTransaction4,
      innerTransaction5,
    ],
    networkType,
    [],
    undefined,
    undefined,
    senderAccount.publicAccount
  ).setMaxFeeForAggregate(feeMultiplier, 0);

  // Sign transaction
  const signedTransaction = senderAccount.sign(
    aggregateCompleteTransaction,
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
    transactionRepository.announce(signedTransaction)
  );
  console.dir({ transactionAnnounceResponse }, { depth: null });
})();
