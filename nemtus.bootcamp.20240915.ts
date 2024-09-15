import { firstValueFrom } from "rxjs";
import {
  Account,
  Address,
  AggregateTransaction,
  AliasAction,
  AliasTransaction,
  Convert,
  Deadline,
  HashLockTransaction,
  KeyGenerator,
  Mosaic,
  MosaicDefinitionTransaction,
  MosaicFlags,
  MosaicId,
  MosaicMetadataTransaction,
  MosaicNonce,
  MosaicSupplyChangeAction,
  MosaicSupplyChangeTransaction,
  NamespaceId,
  NamespaceRegistrationTransaction,
  PlainMessage,
  PublicAccount,
  RepositoryFactoryHttp,
  TransferTransaction,
  UInt64,
} from "symbol-sdk";
import dotenv from "dotenv";

dotenv.config();

const sleep = (seconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

(async () => {
  const nodeUrl = "https://symbol-node.harvest-xym.com:3001";
  const repositoryFactoryHttp = new RepositoryFactoryHttp(nodeUrl);

  const currencies = await firstValueFrom(
    repositoryFactoryHttp.getCurrencies(),
  );
  const epochAdjustment = await firstValueFrom(
    repositoryFactoryHttp.getEpochAdjustment(),
  );
  const generationHash = await firstValueFrom(
    repositoryFactoryHttp.getGenerationHash(),
  );
  const networkType = await firstValueFrom(
    repositoryFactoryHttp.getNetworkType(),
  );

  // 既存のネームスペースを持っているマルチシグアカウントのパブリックアカウント
  const multisigPublicAccount = PublicAccount.createFromPublicKey(
    "32D43B92AE47C04231D15931C9EFFD2A6D5CC2F822268041C7DCDE8FB345F1DB",
    networkType,
  );

  // 送信者アカウントの定義
  const privateKey = process.env.PRIVATE_KEY!;
  const senderAccount = Account.createFromPrivateKey(privateKey, networkType);

  // トランザクション共通データ
  const deadline = Deadline.create(epochAdjustment);

  // ネームスペース: "nemtus.bootcamp.20240915"
  const rawRootNamespace = "nemtus";
  const rawSubNamespace = "bootcamp";
  const rawSub2Namespace = "20240915";
  // const namespaceDuration = UInt64.fromUint((1 * 365 * 24 * 60 * 60) / 30);

  // const innerTransaction1 = NamespaceRegistrationTransaction.createRootNamespace(
  //   deadline,
  //   rawRootNamespace,
  //   namespaceDuration,
  //   networkType,
  // ).toAggregate(multisigPublicAccount);

  const innerTransaction2 = NamespaceRegistrationTransaction.createSubNamespace(
    deadline,
    rawSubNamespace,
    rawRootNamespace,
    networkType,
  ).toAggregate(multisigPublicAccount);

  const innerTransaction3 = NamespaceRegistrationTransaction.createSubNamespace(
    deadline,
    rawSub2Namespace,
    `${rawRootNamespace}.${rawSubNamespace}`,
    networkType,
  ).toAggregate(multisigPublicAccount);

  // トークン新規定義
  const mosaicNonce = MosaicNonce.createRandom();
  const mosaicId = MosaicId.createFromNonce(
    mosaicNonce,
    multisigPublicAccount.address,
  );
  const supplyMutable = true;
  const transferable = true;
  const restrictable = true;
  const revokable = true;
  const mosaicFlags = MosaicFlags.create(
    supplyMutable,
    transferable,
    restrictable,
    revokable,
  );
  const divisibility = 0;
  const duration = UInt64.fromUint(0);
  const innerTransaction4 = MosaicDefinitionTransaction.create(
    deadline,
    mosaicNonce,
    mosaicId,
    mosaicFlags,
    divisibility,
    duration,
    networkType,
  ).toAggregate(multisigPublicAccount);

  // トークン供給量変更
  const mosaicSupplyChangeAction = MosaicSupplyChangeAction.Increase;
  const initialTokenSupply = UInt64.fromUint(20);
  const innerTransaction5 = MosaicSupplyChangeTransaction.create(
    deadline,
    mosaicId,
    mosaicSupplyChangeAction,
    initialTokenSupply,
    networkType,
  ).toAggregate(multisigPublicAccount);

  // トークンにネームスペースを紐づけ
  const aliasAction = AliasAction.Link;
  const namespaceId = new NamespaceId(
    `${rawRootNamespace}.${rawSubNamespace}.${rawSub2Namespace}`,
  );
  const innerTransaction6 = AliasTransaction.createForMosaic(
    deadline,
    aliasAction,
    namespaceId,
    mosaicId,
    networkType,
  ).toAggregate(multisigPublicAccount);

  // トークンにメタデータを紐づけ
  const scopedMetadataKey = KeyGenerator.generateUInt64Key("metadata");
  const metadataJson = {
    name: "NEMTUS夏合宿 in 山形",
    url: "https://nemtus.connpass.com/event/325521/",
    start: new Date(2024, 9, 14, 12),
    end: new Date(2024, 9, 15, 12),
    location: {
      name: "民謡の宿　あづまや",
      url: "https://adumaya.jp/",
      map: "https://maps.app.goo.gl/2BJY3Fmd5N8VPV4v8",
    },
    description: "参加記念トークン",
  };
  const metadataValueByte = Convert.utf8ToUint8(JSON.stringify(metadataJson));
  const metadataValueSize = metadataValueByte.length;
  const innerTransaction7 = MosaicMetadataTransaction.create(
    deadline,
    multisigPublicAccount.address,
    scopedMetadataKey,
    mosaicId,
    metadataValueSize,
    metadataValueByte,
    networkType,
  ).toAggregate(multisigPublicAccount);

  // 皆さんにトークンを送信
  const mosaic = new Mosaic(mosaicId, UInt64.fromUint(1));
  const message = PlainMessage.create(
    "この度はNEMTUS夏合宿 in 山形にご参加くださいましてまことにありがとうございました！記念トークンを送付しますので何かの折に思い出してください！",
  );
  const recipientRawAddresses: string[] = [
    "NBBJRFNBQXMZENSP534RNU5WTFIXT6N2U655ALQ",
    "NB33TLYMI24JX3SGBIQQN54BX4XYA6L53OH6D5Y",
    "NAIJ3RVBGVU66ZGPUMIXLLNDXZXUD2U2RZHRZFA",
    "NA2N6634AULTXVT6KTKQKR5WPUOBHCCBSVZTN2I",
    "NAUCFHNE3TPYH5YJ7SLUUMBR6FR4GYMJXMYP4LY",
    "NCG2MGSRUN3SVVBTPED63HIFYCI6XNXYXLSSVGY",
    "NCA47A2EDTSRBLNAF7FU3SHXGTYKHX3JB2WBF6Y",
    "NDQQ5USL7GWKQMEN4JPGCDQCQK62SXPFHUEXOSQ",
    "NDZDUGKLPJNWWON3NOU2KFDKW7USU3ZUVLZ2W6Q",
  ];
  const recipientAddresses: Address[] = recipientRawAddresses.map(
    (recipientRawAddress) => Address.createFromRawAddress(recipientRawAddress),
  );
  const innerTransactions8 = recipientAddresses.map((recipientAddress) =>
    TransferTransaction.create(
      deadline,
      recipientAddress,
      [mosaic],
      message,
      networkType,
    ).toAggregate(multisigPublicAccount),
  );

  const innerTransactions = [
    innerTransaction2,
    innerTransaction3,
    innerTransaction4,
    innerTransaction5,
    innerTransaction6,
    innerTransaction7,
    ...innerTransactions8,
  ];
  const feeMultiplier = 100;
  const requiredCosignatures = 1;
  const aggregateBondedTransaction = AggregateTransaction.createBonded(
    deadline,
    innerTransactions,
    networkType,
    [],
    undefined,
    undefined,
    multisigPublicAccount,
  ).setMaxFeeForAggregate(feeMultiplier, requiredCosignatures);

  const signedAggregateBondedTransaction = senderAccount.sign(
    aggregateBondedTransaction,
    generationHash,
  );

  const hashLockDuration = UInt64.fromUint((2 * 60 * 60) / 30);
  const hashLockTransaction = HashLockTransaction.create(
    deadline,
    currencies.currency.createRelative(10),
    hashLockDuration,
    signedAggregateBondedTransaction,
    networkType,
  ).setMaxFee(feeMultiplier);
  const signedHashLockTransaction = senderAccount.sign(
    hashLockTransaction,
    generationHash,
  );

  const hashLockTransactionHash = signedHashLockTransaction.hash;
  const aggregateBondedTransactionHash = signedAggregateBondedTransaction.hash;

  const transactionRepository =
    repositoryFactoryHttp.createTransactionRepository();
  const listener = repositoryFactoryHttp.createListener();
  await listener.open();
  listener.newBlock().subscribe((newBlock) => console.log({ newBlock }));
  listener.status(senderAccount.address).subscribe((statusError) => {
    console.error({ statusError });
    console.log("status error");
    listener.close();
    console.log("listener closed");
  });
  listener
    .aggregateBondedAdded(senderAccount.address)
    .subscribe((partialTx) => {
      console.log({ partialTx });
      console.log("partial");
    });
  listener
    .unconfirmedAdded(senderAccount.address)
    .subscribe((unconfirmedTx) => {
      console.log({ unconfirmedTx });
      console.log("unconfirmedTx");
    });
  listener.confirmed(senderAccount.address).subscribe((confirmedTx) => {
    console.log({ confirmedTx });
    console.log("confirmedTx");
    if (confirmedTx.transactionInfo?.hash === hashLockTransactionHash) {
      transactionRepository
        .announceAggregateBonded(signedAggregateBondedTransaction)
        .subscribe((aggregateBondedTransactionAnnounceResponse) =>
          console.log({ aggregateBondedTransactionAnnounceResponse }),
        );
    }
    if (confirmedTx.transactionInfo?.hash === aggregateBondedTransactionHash) {
      listener.close();
      console.log("listener closed");
    }
  });

  const hashLockTransactionAnnounceResponse = await firstValueFrom(
    transactionRepository.announce(signedHashLockTransaction),
  );
  console.log({ hashLockTransactionAnnounceResponse });
})();
