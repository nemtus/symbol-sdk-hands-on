import { firstValueFrom } from "rxjs";
import {
  Account,
  Address,
  Deadline,
  EmptyMessage,
  Mosaic,
  MosaicId,
  PublicAccount,
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
  const pointyMosaicId = new MosaicId(pointyRawMosaicId);
  const pointyMosaicDivisibility = 0;
  console.log({ pointyCustomerRawAddress, pointyRawMosaicId });

  // Sender account info
  const senderRawPrivateKey = process.env.SYMBOL_SHOP_PRIVATE_KEY!;
  const senderAccount = Account.createFromPrivateKey(
    senderRawPrivateKey,
    networkType,
  );

  // Transaction info
  const deadline = Deadline.create(epochAdjustment); // デフォルトは2時間後
  const recipientRawAddress = pointyCustomerRawAddress;
  const recipientAddress = Address.createFromRawAddress(recipientRawAddress);
  const relativeAmount = 100; // 10[XYM]送信 = 10*10^divisibility[μXYM]送信
  const absoluteAmount =
    relativeAmount * parseInt("1" + "0".repeat(pointyMosaicDivisibility)); // pointyMosaicDivisibility = 0 => 1[absolute token] = 10^0[relative to]
  const absoluteAmountUInt64 = UInt64.fromUint(absoluteAmount);
  const mosaic = new Mosaic(pointyMosaicId, absoluteAmountUInt64);
  const mosaics = [mosaic];
  const emptyMessage = EmptyMessage; // 空メッセージ
  const feeMultiplier = 100; // トランザクション手数料に影響する。現時点ではデフォルトのノードは手数料倍率が100で、多くのノードがこれ以下の数値を指定しており、100を指定しておけば素早く承認される傾向。

  // Create transaction
  const transferTransaction = TransferTransaction.create(
    deadline,
    recipientAddress,
    mosaics,
    emptyMessage,
    networkType,
  ).setMaxFee(feeMultiplier);

  // Sign transaction
  const signedTransaction = senderAccount.sign(
    transferTransaction,
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
