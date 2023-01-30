import * as crypto from 'crypto';
import { sha3_256 } from 'js-sha3';
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
  const symbolNodeUrl = "https://sym-test-04.opening-line.jp:3001";
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

  // Transfer with secret lock from alice to bob on symbol blockchain
  const deadline = Deadline.create(symbolEpochAdjustment); // デフォルトは2時間後
  const bobAddress = bobAccount.address; // 受取先アドレスとしてbobアドレスを指定
  const mosaic = symbolNetworkCurrency.createRelative(100); // 100[XYM]
  const feeMultiplier = 100; // トランザクション手数料に影響する。現時点ではデフォルトのノードは手数料倍率が100で、多くのノードがこれ以下の数値を指定しており、100を指定しておけば素早く承認される傾向。

  // Create random secret value and hash
  const secretBytes = crypto.randomBytes(20); // 乱数を作成し
  const secretProof = secretBytes.toString('hex'); // 作成された乱数のhex文字列を秘密の値として手元でキープしておく(1)
  console.log({secretProof});
  const hasher = sha3_256.create();
  const hash = hasher.update(secretBytes).hex().toUpperCase(); // (1)で作成した秘密の値のハッシュを生成してこれを使ってシークレットロックトランザクションを実行する
  console.log({hash});

  // Create secret lock transaction
  const secretLockTransactionFromAliceToBobOnSymbol = SecretLockTransaction.create(
    deadline,
    mosaic,
    UInt64.fromUint(120),
    LockHashAlgorithm.Op_Sha3_256,
    hash,
    bobAddress,
    symbolNetworkType
  ).setMaxFee(feeMultiplier)

  // Sign transaction
  const signedSecretLockTransactionFromAliceToBobOnSymbol = aliceAccount.sign(
    secretLockTransactionFromAliceToBobOnSymbol,
    symbolGenerationHash
  );

  // Start monitoring of transaction status with websocket
  const symbolListener = symbolRepositoryFactoryHttp.createListener();
  await symbolListener.open();
  symbolListener.newBlock().subscribe((block) => {
    console.log("Symbol New blok");
    console.dir({ block }, { depth: null });
  });
  symbolListener.status(aliceAccount.address).subscribe((status) => {
    console.dir({ status }, { depth: null });
    symbolListener.close();
    console.log("Symbol Transaction status error");
  });
  symbolListener
    .unconfirmedAdded(aliceAccount.address)
    .subscribe((unconfirmedTransaction) => {
      console.dir({ unconfirmedTransaction }, { depth: null });
      console.log("Symbol Transaction unconfirmed");
    });
  symbolListener
    .confirmed(aliceAccount.address)
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
    symbolTransactionRepository.announce(signedSecretLockTransactionFromAliceToBobOnSymbol)
  );
  console.dir({ symbolTransactionAnnounceResponse }, { depth: null });
})();
