import { firstValueFrom } from "rxjs";
import {
  Account,
  Deadline,
  LockHashAlgorithm,
  RepositoryFactoryHttp,
  SecretLockTransaction,
  UInt64,
} from "symbol-sdk";
import * as dotenv from "dotenv";

dotenv.config();

(async () => {
  // Get symbol network info
  const symbolNodeUrl = "https://sym-test-03.opening-line.jp:3001";
  const symbolRepositoryFactoryHttp = new RepositoryFactoryHttp(symbolNodeUrl);

  const symbolNetworkType = await firstValueFrom(
    symbolRepositoryFactoryHttp.getNetworkType()
  );
  const symbolEpochAdjustment = await firstValueFrom(
    symbolRepositoryFactoryHttp.getEpochAdjustment()
  );
  const symbolGenerationHash = await firstValueFrom(
    symbolRepositoryFactoryHttp.getGenerationHash()
  );
  const symbolNetworkCurrencies = await firstValueFrom(
    symbolRepositoryFactoryHttp.getCurrencies()
  );
  const symbolNetworkCurrency = symbolNetworkCurrencies.currency;
  const symbolNetworkCurrencyMosaicId = symbolNetworkCurrency.mosaicId!;
  const symbolNetworkCurrencyDivisibility = symbolNetworkCurrency.divisibility;
  console.log({
    symbolNetworkType,
    symbolEpochAdjustment,
    symbolGenerationHash,
    symbolNetworkCurrencyMosaicId,
    symbolNetworkCurrencyDivisibility,
  });
  console.log(symbolNetworkCurrencyMosaicId.toHex());

  // Get canade network info
  const canadeNodeUrl = "https://cbdp-dual-002.test.siamreiwa.com:3001";
  const canadeRepositoryFactoryHttp = new RepositoryFactoryHttp(canadeNodeUrl);

  const canadeNetworkType = await firstValueFrom(
    canadeRepositoryFactoryHttp.getNetworkType()
  );
  const canadeEpochAdjustment = await firstValueFrom(
    canadeRepositoryFactoryHttp.getEpochAdjustment()
  );
  const canadeGenerationHash = await firstValueFrom(
    canadeRepositoryFactoryHttp.getGenerationHash()
  );
  const canadeNetworkCurrencies = await firstValueFrom(
    canadeRepositoryFactoryHttp.getCurrencies()
  );
  const canadeNetworkCurrency = canadeNetworkCurrencies.currency;
  const canadeNetworkCurrencyMosaicId = canadeNetworkCurrency.mosaicId!;
  const canadeNetworkCurrencyDivisibility = canadeNetworkCurrency.divisibility;
  console.log({
    canadeNetworkType,
    canadeEpochAdjustment,
    canadeGenerationHash,
    canadeNetworkCurrencyMosaicId,
    canadeNetworkCurrencyDivisibility,
  });
  console.log(canadeNetworkCurrencyMosaicId.toHex());

  // Alice account info
  const aliceRawPrivateKey = process.env.SYMBOL_TESTNET_ALICE_PRIVATE_KEY!;
  const aliceRawAddress = process.env.SYMBOL_TESTNET_ALICE_ADDRESS!;
  const aliceAccount = Account.createFromPrivateKey(
    aliceRawPrivateKey,
    canadeNetworkType
  );
  if (aliceAccount.address.plain() !== aliceRawAddress) {
    throw Error("aliceAccount does not match aliceRawAddress");
  }

  // Bob account info
  const bobRawPrivateKey = process.env.SYMBOL_TESTNET_BOB_PRIVATE_KEY!;
  const bobRawAddress = process.env.SYMBOL_TESTNET_BOB_ADDRESS!;
  const bobAccount = Account.createFromPrivateKey(
    bobRawPrivateKey,
    canadeNetworkType
  );
  if (bobAccount.address.plain() !== bobRawAddress) {
    throw Error("bobAccount does not match bobRawAddress");
  }

  // Transfer with secret lock from alice to bob on symbol blockchain
  const deadline = Deadline.create(canadeEpochAdjustment); // デフォルトは2時間後
  const aliceAddress = aliceAccount.address; // 受取先アドレスとしてaliceアドレスを指定
  const mosaic = canadeNetworkCurrency.createRelative(100); // 100[CBDP]
  const feeMultiplier = 100; // トランザクション手数料に影響する。現時点ではデフォルトのノードは手数料倍率が100で、多くのノードがこれ以下の数値を指定しており、100を指定しておけば素早く承認される傾向。

  // Todo: ハッシュとして直接文字列をハードコードしている箇所を3-1のトランザクションで指定されていたハッシュ(ブロックエクスプローラー等でネットワークを通じて確認可能 ... secretと表記されている)と同じものに置き換える必要があることに注意してください。
  // Create secret lock transaction
  const secretLockTransactionFromBobToAliceOnCanade = SecretLockTransaction.create(
    deadline,
    mosaic,
    UInt64.fromUint(120),
    LockHashAlgorithm.Op_Sha3_256,
    "9F9188DECABE85AE9CDEAF8D2EF16A042F820D5D1DDFB26F31A6DB81E74D308D", // 重要: aliceからのシークレットロックトランザクションで使用されていたものと同じハッシュを使うことがポイント
    aliceAddress,
    canadeNetworkType
  ).setMaxFee(feeMultiplier)

  // Sign transaction
  const signedSecretLockTransactionFromBobToAliceOnCanade = bobAccount.sign(
    secretLockTransactionFromBobToAliceOnCanade,
    canadeGenerationHash
  );

  // Start monitoring of transaction status with websocket
  const canadeListener = canadeRepositoryFactoryHttp.createListener();
  await canadeListener.open();
  canadeListener.newBlock().subscribe((block) => {
    console.log("Canade New blok");
    console.dir({ block }, { depth: null });
  });
  canadeListener.status(bobAccount.address).subscribe((status) => {
    console.dir({ status }, { depth: null });
    canadeListener.close();
    console.log("Canade Transaction status error");
  });
  canadeListener
    .unconfirmedAdded(bobAccount.address)
    .subscribe((unconfirmedTransaction) => {
      console.dir({ unconfirmedTransaction }, { depth: null });
      console.log("Canade Transaction unconfirmed");
    });
  canadeListener
    .confirmed(bobAccount.address)
    .subscribe((confirmedTransaction) => {
      console.dir({ confirmedTransaction }, { depth: null });
      canadeListener.close();
      console.log("Canade Transaction confirmed");
      console.log(
        `https://explorer.test.siamreiwa.com/transactions/${confirmedTransaction.transactionInfo?.hash}`
      );
    });

  // Announce transaction
  const canadeTransactionRepository =
    canadeRepositoryFactoryHttp.createTransactionRepository();
  const canadeTransactionAnnounceResponse = await firstValueFrom(
    canadeTransactionRepository.announce(signedSecretLockTransactionFromBobToAliceOnCanade)
  );
  console.dir({ canadeTransactionAnnounceResponse }, { depth: null });
})();
