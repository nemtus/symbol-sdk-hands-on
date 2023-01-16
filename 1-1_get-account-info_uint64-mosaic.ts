import { firstValueFrom } from "rxjs";
import {
  RepositoryFactoryHttp,
  Address,
  NetworkType,
  UInt64,
} from "symbol-sdk";

const nodeUrl = "https://sym-test-04.opening-line.jp:3001";
const repositoryFactoryHttp = new RepositoryFactoryHttp(nodeUrl);
const accountRepository = repositoryFactoryHttp.createAccountRepository();

const rawAddress = "TACDCQIQYRZ3L7ARKSQBAVDQZJQ6PPGY4K2SSCY";
const address = Address.createFromRawAddress(rawAddress);

// Async/Await
(async () => {
  const accountInfo = await firstValueFrom(
    accountRepository.getAccountInfo(address)
  );
  console.dir({ accountInfo }, { depth: null });

  // NetworkType ... Mainnet, Testnetで異なる。Testnetは152
  console.log(`networkType from sdk is ${NetworkType.TEST_NET}`);
  console.log(
    `networkType from accountInfo is ${accountInfo.address.networkType}`
  );

  // UInt64からJSの型への変換
  const addressHeight = accountInfo.addressHeight; // UInt64
  const addressHeightDTO = addressHeight.toDTO(); // Data Type Object: ここでは32bitの整数の配列
  const addressHeightHex = addressHeight.toHex(); // 16進数の文字列
  const addressHeightString = addressHeight.toString(); // 10進数の文字列
  console.log({
    addressHeight,
    addressHeightDTO,
    addressHeightHex,
    addressHeightString,
  });

  // UInt64同士の一致判定
  const restoredAddressHeight = new UInt64(accountInfo.addressHeight.toDTO());
  if (restoredAddressHeight.equals(accountInfo.addressHeight)) {
    console.log("restoredAddressHeight is equal to accountInfo.addressHeight");
  }

  // UInt64同士の大・小・一致判定
  console.log(restoredAddressHeight.compare(UInt64.fromUint(0))); // addressHeightと0を比較 ... addressHeightの方が大きいので1が返る
  console.log(restoredAddressHeight.compare(accountInfo.addressHeight)); // addressHeightとaddressHeightを比較 ... 一致しているので0が返る
  console.log(
    restoredAddressHeight.compare(
      accountInfo.addressHeight.add(UInt64.fromUint(1))
    )
  ); // addressHeightとaddressHeight+1を比較 ... addressHeightの方が小さいので-1が返る

  // Mosaic(=Token)
  const mosaicIdHex = accountInfo.mosaics[0].id.toHex(); // トークンのIDの16進数文字列表記
  const mosaicAmountString = accountInfo.mosaics[0].amount.toString(); // トークンの量の可分性を考慮していない整数値(≒絶対値)
  console.log({
    mosaicIdHex,
    mosaicAmountString,
  });
})();
