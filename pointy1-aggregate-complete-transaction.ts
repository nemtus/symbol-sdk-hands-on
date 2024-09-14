import { firstValueFrom } from "rxjs";
import {
  Account,
  AggregateTransaction,
  Convert,
  Deadline,
  MosaicDefinitionTransaction,
  MosaicFlags,
  MosaicId,
  MosaicMetadataTransaction,
  MosaicNonce,
  MosaicSupplyChangeAction,
  MosaicSupplyChangeTransaction,
  PublicAccount,
  RepositoryFactoryHttp,
  UInt64,
} from "symbol-sdk";
import * as dotenv from "dotenv";

dotenv.config();

(async () => {
  const nodeUrl = "https://sym-test-03.opening-line.jp:3001";
  const repositoryFactoryHttp = new RepositoryFactoryHttp(nodeUrl);

  // Get network info
  const networkType = await firstValueFrom(
    repositoryFactoryHttp.getNetworkType(),
  );
  const epochAdjustment = await firstValueFrom(
    repositoryFactoryHttp.getEpochAdjustment(),
  );
  const generationHash = await firstValueFrom(
    repositoryFactoryHttp.getGenerationHash(),
  );
  const networkCurrencies = await firstValueFrom(
    repositoryFactoryHttp.getCurrencies(),
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

  const pointyCustomerQrCodeJson = {
    spc: "40BE99D2E32D9925820AEDBED4C134F4CDC4ED42897FF808A1D2FFC4CA7D0A88,010C433A38E2DD681CD11BC44FB9254ECF79C3628EDE24EE95A5B62A2111A092624622B17B",
  };
  const pointyCustomerPublicKey = pointyCustomerQrCodeJson.spc.split(",")[0];
  const pointyCustomerRawAddress = PublicAccount.createFromPublicKey(
    pointyCustomerPublicKey,
    networkType,
  ).address.plain();
  const pointyRawMosaicId = "0D7AAE912CDA8691";
  console.log({ pointyCustomerRawAddress, pointyRawMosaicId });

  // Sender account info
  const senderRawPrivateKey = process.env.SYMBOL_SHOP_PRIVATE_KEY!;
  const senderAccount = Account.createFromPrivateKey(
    senderRawPrivateKey,
    networkType,
  );

  // Transaction info
  const deadline = Deadline.create(epochAdjustment); // デフォルトは2時間後
  const feeMultiplier = 100; // トランザクション手数料に影響する。現時点ではデフォルトのノードは手数料倍率が100で、多くのノードがこれ以下の数値を指定しており、100を指定しておけば素早く承認される傾向。

  // 内部トランザクション1のデータ: 新規トークンの定義
  const mosaicNonce = MosaicNonce.createRandom();
  const mosaicId = MosaicId.createFromNonce(mosaicNonce, senderAccount.address);
  const supplyMutable = false;
  const transferable = false;
  const restrictable = false;
  const revokable = true;
  const mosaicFlags = MosaicFlags.create(
    supplyMutable,
    transferable,
    restrictable,
    revokable,
  );
  const divisibility = 0;
  const duration = UInt64.fromUint(0);

  // 内部トランザクション1
  const innerTransaction1 = MosaicDefinitionTransaction.create(
    deadline,
    mosaicNonce,
    mosaicId,
    mosaicFlags,
    divisibility,
    duration,
    networkType,
  ).toAggregate(senderAccount.publicAccount);

  // 内部トランザクション2のデータ: 新規トークンの初期発行数量設定
  const mosaicSupplyChangeAction = MosaicSupplyChangeAction.Increase;
  const delta = UInt64.fromUint(1000000000000);

  // 内部トランザクション2
  const innerTransaction2 = MosaicSupplyChangeTransaction.create(
    deadline,
    mosaicId,
    mosaicSupplyChangeAction,
    delta,
    networkType,
  ).toAggregate(senderAccount.publicAccount);

  // 内部トランザクション3のデータ: 新規トークンにメタデータを紐づけ
  const metadataKey = UInt64.fromHex("8CE27C5EFA9DB1DF");
  const metadataJson = {
    cardName: "nwtp-test-1",
    shopName: "Next Web Technology test 1",
    s: { "100": "Tシャツプレゼント" },
    a: "https://next-web-yechnology.net/",
  };
  const metadataString = JSON.stringify(metadataJson);
  const metadataValueByte = Convert.utf8ToUint8(metadataString);
  const metadataValueSize = metadataValueByte.length;

  // 内部トランザクション3
  const innerTransaction3 = MosaicMetadataTransaction.create(
    deadline,
    senderAccount.address,
    metadataKey,
    mosaicId,
    metadataValueSize,
    metadataValueByte,
    networkType,
  ).toAggregate(senderAccount.publicAccount);

  // アグリゲートトランザクションで一括処理するトランザクションを配列でセット
  const innerTransactions = [
    innerTransaction1,
    innerTransaction2,
    innerTransaction3,
  ];
  // (最初に)署名するアカウント以外に、承認を得る必要があるアカウントの数(≒共署アカウント数)
  const requiredCosignatures = 0;

  // アグリゲートコンプリートトランザクション ... innerTransactionsを一括処理できる機能
  const aggregateCompleteTransaction = AggregateTransaction.createComplete(
    deadline,
    innerTransactions,
    networkType,
    [],
  ).setMaxFeeForAggregate(feeMultiplier, requiredCosignatures);

  // Sign transaction
  const signedTransaction = senderAccount.signTransactionWithCosignatories(
    aggregateCompleteTransaction,
    [],
    generationHash,
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
        `https://testnet.symbol.fyi/transactions/${confirmedTransaction.transactionInfo?.hash}`,
      );
    });

  // Announce transaction
  const transactionRepository =
    repositoryFactoryHttp.createTransactionRepository();
  const transactionAnnounceResponse = await firstValueFrom(
    transactionRepository.announce(signedTransaction),
  );
  console.dir({ transactionAnnounceResponse }, { depth: null });
})();
