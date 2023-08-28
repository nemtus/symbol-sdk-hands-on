import { firstValueFrom } from "rxjs";
import {
  Account,
  Deadline,
  LockHashAlgorithm,
  RepositoryFactoryHttp,
  SecretProofTransaction,
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
    symbolNetworkType
  );
  if (aliceAccount.address.plain() !== aliceRawAddress) {
    throw Error("aliceAccount does not match aliceRawAddress");
  }

  // Bob account info
  const bobRawPrivateKey = process.env.SYMBOL_TESTNET_BOB_PRIVATE_KEY!;
  const bobRawAddress = process.env.SYMBOL_TESTNET_BOB_ADDRESS!;
  const bobAccount = Account.createFromPrivateKey(
    bobRawPrivateKey,
    symbolNetworkType
  );
  if (bobAccount.address.plain() !== bobRawAddress) {
    throw Error("bobAccount does not match bobRawAddress");
  }

  // Transfer with secret proof from alice to bob on symbol blockchain
  const deadline = Deadline.create(symbolEpochAdjustment); // デフォルトは2時間後
  const bobAddress = bobAccount.address; // 受取先アドレスとしてbobアドレスを指定
  const feeMultiplier = 100; // トランザクション手数料に影響する。現時点ではデフォルトのノードは手数料倍率が100で、多くのノードがこれ以下の数値を指定しており、100を指定しておけば素早く承認される傾向。

  // Todo: 3-3のトランザクションのブロックエクスプローラーでネットワークを通じて確認できる情報から、秘密の値(=secretProof, ブロックエクスプローラー上ではproofという表示)とハッシュ値(ブロックエクスプローラー上ではsecretという表示))を置き換えてください。
  // Create secret proof transaction
  const secretProofTransactionFromBobOnSymbol = SecretProofTransaction.create(
    deadline,
    LockHashAlgorithm.Op_Sha3_256,
    "9F9188DECABE85AE9CDEAF8D2EF16A042F820D5D1DDFB26F31A6DB81E74D308D",
    bobAddress,
    "48e85f61bcbd850875c1301f685c8a6a9b379eed".toUpperCase(),
    symbolNetworkType,
  ).setMaxFee(feeMultiplier)

  // Sign transaction
  const signedSecretProofTransactionFromBobOnSymbol = bobAccount.sign(
    secretProofTransactionFromBobOnSymbol,
    symbolGenerationHash
  );

  // Start monitoring of transaction status with websocket
  const symbolListener = symbolRepositoryFactoryHttp.createListener();
  await symbolListener.open();
  symbolListener.newBlock().subscribe((block) => {
    console.log("Symbol New blok");
    console.dir({ block }, { depth: null });
  });
  symbolListener.status(bobAccount.address).subscribe((status) => {
    console.dir({ status }, { depth: null });
    symbolListener.close();
    console.log("Symbol Transaction status error");
  });
  symbolListener
    .unconfirmedAdded(bobAccount.address)
    .subscribe((unconfirmedTransaction) => {
      console.dir({ unconfirmedTransaction }, { depth: null });
      console.log("Symbol Transaction unconfirmed");
    });
  symbolListener
    .confirmed(bobAccount.address)
    .subscribe((confirmedTransaction) => {
      console.dir({ confirmedTransaction }, { depth: null });
      symbolListener.close();
      console.log("Symbol Transaction confirmed");
      console.log(
        `https://testnet.symbol.fyi/transactions/${confirmedTransaction.transactionInfo?.hash}`
      );
    });

  // Announce transaction
  const symbolTransactionRepository =
    symbolRepositoryFactoryHttp.createTransactionRepository();
  const symbolTransactionAnnounceResponse = await firstValueFrom(
    symbolTransactionRepository.announce(signedSecretProofTransactionFromBobOnSymbol)
  );
  console.dir({ symbolTransactionAnnounceResponse }, { depth: null });
})();
