# symbol-sdk@2 ハンズオン #1

## ウォレット

ウォレットの準備については以下のYouTube動画もご参照ください。なお今回のハンズオンではメインネットではなくテストネットを利用することや、動画の頃と比べてGitHubのレポジトリが変更(nemgrouplimited -> symbol)されたことにご注意ください。

[https://youtu.be/N4Lrkn1TIE0](https://youtu.be/N4Lrkn1TIE0)

### デスクトップウォレット

[https://github.com/symbol/desktop-wallet/releases](https://github.com/symbol/desktop-wallet/releases)から(Windowsの方は`.exe`ファイルを、Macの方は`.dmg`ファイルを)ダウンロードしてインストールしてください。

### テストネットで新しいアカウントを作成

- プロファイルを新規作成
- ネットワークタイプを選択する画面で、`Symbol Testnet`を選択

### フォーセットからテスト用トークンを取得

- ウォレットの画面上部の蛇口アイコンのフォーセット( [https://testnet.symbol.tools/](https://testnet.symbol.tools/) )をクリック
- ブラウザでテスト用トークン取得画面がアドレスがセットされた状態で開くので、`CLAIM!`をクリック

### 新しく作成したテストネットのアカウントの情報を記録

- アドレス
- 公開鍵
- 秘密鍵 ... 絶対に誰にも教えない＆公開しないこと
- ニーモニックフレーズ(≒シードフレーズ) ... 絶対に誰にも教えない＆公開しないこと

## 環境構築

### Node.js

#### Node.jsを利用可能か確認

以下のようにコマンドを実行してNode.jsやnpmのバージョンが表示された場合、Node.jsはインストール済で利用可能な状態になっています。
その場合は以下のインストール手順はスキップして頂いて構いません。

```shell
~$ node -v
v18.13.0

~$ npm -v
8.19.3

```

なお、このハンズオンでのNode.jsのバージョンは上記バージョン前提ですが、概ねv14以上であれば同様に動作するでしょう。

#### Linux(Ubuntu, WindowsでのWSL)へNode.jsをインストール

nvm( [https://github.com/nvm-sh/nvm#installing-and-updating](https://github.com/nvm-sh/nvm#installing-and-updating) )を利用してインストールするとNode.jsのバージョンを容易に変更できて便利です。

以下のようにコマンドを実行してインストールしてください。

```shell
# GitHubからnvmをダウンロードしてインストール
~$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# nvmを利用可能な状態にする
~$ source ~/.bashrc

# 最新のLTS版をインストール
~$ nvm install --lts

# インストールした最新のLTS版を選択し利用可能な状態にする
~$ nvm use --lts

# Node.jsのバージョンを確認
~$ node -v

# npmのバージョンを確認
~$ npm -v

```

#### Windows, Macへインストール

以下リンクからご自身の環境向けのインストーラーをダウンロードしてインストールしてください。インストール完了後にNode.jsとnpmのバージョンが表示できることを確認してください。

[https://nodejs.org/ja/download/](https://nodejs.org/ja/download/)

それ以外の方法として、MacだとHomebrewを利用したり、Windows, Macともに、そもそもローカルにインストールせずにDockerを利用する方法等もあると思いますが、今回のハンズオンではそういった詳細の説明は省略させて頂きます。

### ハンズオン用ディレクトリ作成

Node.jsのインストールが完了したら、ハンズオン用のディレクトリを作成して、作成したディレクトリに移動してください。

ここでは、`symbol-sdk-hands-on`というディレクトリを作成することにします。

(各々好きな名前で作成して頂いて構いません。)

```shell
~/$ mkdir symbol-sdk-hands-on

~/$ cd symbol-sdk-hands-on

```

### プロジェクト初期化

```shell
~/symbol-sdk-hands-on$ npm init -y

```

### typescript, ts-node のインストール

```shell
~/symbol-sdk-hands-on$ npm install -D typescript ts-node

```

### (.gitignoreの設定)

npmでパッケージをインストールするとインストールしたパッケージは`node_modules`というディレクトリに格納されます。このディレクトリはバージョン管理する必要は無いので、`.gitignore`というファイル名で以下のようなファイルを作成し、バージョン管理から除外しておきましょう。

```gitignore:.gitignore
node_modules/

```

### Hello World

`0_hello-world.ts`というファイル名で以下のようなファイルを作成して、

```ts:0_hello-world.ts
const greeting: string = "Hello World";
console.log(greeting);

```

以下のコマンドを実行して`Hello World`と表示されることを確認してください。

```shell
~/symbol-sdk-hands-on$ npx ts-node 0_hello-world.ts

```

### symbol-sdk v2系のインストール

Symbolブロックチェーンを利用するためのライブラリであるsymbol-sdkをインストールします。

インストールするバージョンですが、symbol-sdkは現在v2系とv3系が存在し、両者には大きな差があります。

v3系はSDKの継続的なメンテナンスを行いやすいような工夫が施された新しいシンプルなSDKなのですが、シンプル故にv2系と比べて機能が少なく、前提として必要な知識が多くなってしまうため、ハンズオン等で利用するには不向きと考え、今回のハンズオンではv2系を利用します。

また、symbol-sdk v2系はrxjsを利用しているため、rxjsも同時にインストールしておきます。

```shell
npm install symbol-sdk@2 rxjs

```

### 秘密鍵などのソースコードにハードコードすべきでない情報の扱い

#### dotenvのインストール

```shell
npm install dotenv

```

#### .envファイルの作成

.envというファイル名で以下のようなファイルを作成して、`PUT_YOUR_PRIVATE_KEY_HERE`の箇所はご自身のテストネットのウォレットの秘密鍵に置き換えてください。

```env:.env
SYMBOL_TESTNET_PRIVATE_KEY="PUT_YOUR_PRIVATE_KEY_HERE"

```

#### .envファイルを.gitignoreに追加

.envを誤ってコミットしてしまわないよう、.gitignoreに`.env`の行を追加しておきましょう。

```gitignore:.gitignore
node_modules/
.env

```

## 1. アドレスを指定してアカウント情報を取得する

symbol-sdkを利用して、アカウント情報を取得するプログラムを作成してみましょう。

`1-0_get-account-info.ts`というファイル名で以下のようなファイルを作成してください。

```ts:1-0_get-account-info.ts
import { firstValueFrom } from "rxjs";
import { RepositoryFactoryHttp, Address } from "symbol-sdk";

// ノードはテストネットのノードリスト(https://symbolnodes.org/nodes_testnet/)からお好みのものを指定ください
const nodeUrl = "https://sym-test-03.opening-line.jp:3001";
const repositoryFactoryHttp = new RepositoryFactoryHttp(nodeUrl);
const accountRepository = repositoryFactoryHttp.createAccountRepository();

// アドレスはご自身のアドレスに置き換えてください
const rawAddress = "TACDCQIQYRZ3L7ARKSQBAVDQZJQ6PPGY4K2SSCY";
const address = Address.createFromRawAddress(rawAddress);

// RxJS
accountRepository.getAccountInfo(address).subscribe((accountInfo) => {
  console.dir({ accountInfo }, { depth: null });
});

// Async/Await
(async () => {
  const accountInfo = await firstValueFrom(
    accountRepository.getAccountInfo(address)
  );
  console.dir({ accountInfo }, { depth: null });
})()

```

以下のように実行して対象アカウントの情報が表示できれば成功です！

```shell
~/symbol-sdk-hands-on$ npx ts-node 1-0_get-account-info.ts
{
  accountInfo: AccountInfo {
    version: 1,
    recordId: '63C4BD8210A0FEFB721D9E66',
    address: Address {
      address: 'TACDCQIQYRZ3L7ARKSQBAVDQZJQ6PPGY4K2SSCY',
      networkType: 152
    },
    addressHeight: UInt64 { lower: 155557, higher: 0 },
    publicKey: '0000000000000000000000000000000000000000000000000000000000000000',
    publicKeyHeight: UInt64 { lower: 0, higher: 0 },
    accountType: 0,
    supplementalPublicKeys: SupplementalPublicKeys {
      linked: undefined,
      node: undefined,
      vrf: undefined,
      voting: undefined
    },
    activityBucket: [],
    mosaics: [
      Mosaic {
        id: MosaicId { id: Id { lower: 1738574798, higher: 1925194030 } },
        amount: UInt64 { lower: 2129598560, higher: 1 }
      }
    ],
    importance: UInt64 { lower: 0, higher: 0 },
    importanceHeight: UInt64 { lower: 0, higher: 0 }
  }
}

```

### 解説(アカウント情報やSDKの特徴について)

#### RxJS or Async/Await

symbol-sdk v2系ではノードとの通信等の非同期な処理で、RxJSが内部的に使用されています。

RxJSを存分に使いこなすには少し学習コストが必要ですが、RxJSの知識がさほどなくても、Async/Awaitを利用することで簡単に利用することができます。

RxJSでの実装とAsync/Awaitを用いた実装の双方を記載してありますので必要に応じてそれぞれご参照ください。

Async/Awaitを用いた実装の場合、firstValueFromを利用することで、RxJSのObservableをPromiseに変換することができるということを覚えておくと良いでしょう。

#### UInt64

JavaScriptの数値の型のNumber型は大きな数値を扱うのに限界があり、ブロックチェーンでは非常に大きな数を扱うことが多いこともあって範囲が足りない場合があります。

そこで、symbol-sdk v2系ではそのためにUInt64(64bitの符号無し整数を便利に扱うためのクラス)が内部的に利用されています。

UInt64の使い方は以下の`1-1_get-account-info_uint64-mosaic.ts`ファイルの実装を参考にしてみてください。

`npx ts-node 1-1_get-account-info_uint64-mosaic.ts`コマンドを実行すると先ほどのアカウント情報に加え、UInt64関連情報や、モザイク(≒トークン)関連情報を、より一般的なデータ形式として表示させることができます。

```ts:1-1_get-account-info_uint64-mosaic.ts
import { firstValueFrom } from "rxjs";
import {
  RepositoryFactoryHttp,
  Address,
  NetworkType,
  UInt64,
} from "symbol-sdk";

// ノードはテストネットのノードリスト(https://symbolnodes.org/nodes_testnet/)からお好みのものを指定ください
const nodeUrl = "https://sym-test-03.opening-line.jp:3001";
const repositoryFactoryHttp = new RepositoryFactoryHttp(nodeUrl);
const accountRepository = repositoryFactoryHttp.createAccountRepository();

// アドレスはご自身のアドレスに置き換えてください
const rawAddress = "TACDCQIQYRZ3L7ARKSQBAVDQZJQ6PPGY4K2SSCY";
const address = Address.createFromRawAddress(rawAddress);

// Async/Await
(async () => {
  const accountInfo = await firstValueFrom(
    accountRepository.getAccountInfo(address)
  );
  console.dir({ accountInfo }, { depth: null });

  // NetworkType ... Mainnet/Testnetで異なりTestnetは152
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

```

## 2. 転送トランザクション(TransferTransaction)の送信

次にsymbol-sdkを使って、メッセージとともにトークンを送信するシンプルな転送トランザクションを送信してみましょう。

ハンズオン冒頭で作成したウォレットのアカウントから、フォーセットのアドレスに10XYMのトークンを「Hello, Symbol!」というメッセージとともに送信してみることにします。

`1-2_send-transfer-transaction.ts`という名前で以下のようなファイルを作成し、送信元のアドレス(=senderRawAddress)を自分のウォレットのものに変更し、`npx ts-node 1-2_send-transfer-transaction.ts`コマンドを実行してください。

ウォレットを開いたままにしていると、Unconfirmedになった瞬間に「チーン」という効果音が鳴り、Confirmedになった瞬間に「ジャキーン」という効果音が鳴ります。

```ts:1-2_send-transfer-transaction.ts
import { firstValueFrom } from "rxjs";
import {
  Account,
  Address,
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
  // ノードはテストネットのノードリスト(https://symbolnodes.org/nodes_testnet/)からお好みのものを指定ください
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
  // アドレスはご自身のアドレスに置き換えてください
  const senderRawAddress = "TACDCQIQYRZ3L7ARKSQBAVDQZJQ6PPGY4K2SSCY";
  const senderAccount = Account.createFromPrivateKey(
    senderRawPrivateKey,
    networkType
  );
  if (senderAccount.address.plain() !== senderRawAddress) {
    throw Error("senderAccount does not match senderRawAddress");
  }

  // Transaction info
  const deadline = Deadline.create(epochAdjustment); // デフォルトは2時間後
  const recipientRawAddress = "TARDV42KTAIZEF64EQT4NXT7K55DHWBEFIXVJQY";
  const recipientAddress = Address.createFromRawAddress(recipientRawAddress);
  const relativeAmount = 10; // 10[XYM]送信 = 10*10^divisibility[μXYM]送信
  const absoluteAmount =
    relativeAmount * parseInt("1" + "0".repeat(networkCurrencyDivisibility)); // networkCurrencyDivisibility = 6 => 1[XYM] = 10^6[μXYM]
  const absoluteAmountUInt64 = UInt64.fromUint(absoluteAmount);
  const mosaic = new Mosaic(networkCurrencyMosaicId, absoluteAmountUInt64);
  const mosaics = [mosaic];
  const rawMessage = "Hello, Symbol!";
  const plainMessage = PlainMessage.create(rawMessage); // 平文メッセージ
  const feeMultiplier = 100; // トランザクション手数料に影響する。現時点ではデフォルトのノードは手数料倍率が100で、多くのノードがこれ以下の数値を指定しており、100を指定しておけば素早く承認される傾向。

  // Create transaction
  const transferTransaction = TransferTransaction.create(
    deadline,
    recipientAddress,
    mosaics,
    plainMessage,
    networkType
  ).setMaxFee(feeMultiplier);

  // Sign transaction
  const signedTransaction = senderAccount.sign(
    transferTransaction,
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

```

## トランザクション送信の解説

トランザクション送信の大まかな流れは以下となります。

1. ネットワーク固有の情報を(予め取得しておくか、ノードからREST APIで取得して)準備しておく。(例. networkType, epochAdjustment, generationHash, networkCurrencyMosaicId, networkCurrencyDivisibility)
2. トランザクションに署名を行うアカウントを準備しておく。
3. トランザクションの情報を準備しておく。(例. 送信先アドレス, 送信するトークンID, 送信するトークン数量, 送信するメッセージ, トランザクションの有効期限, ノードの手数料倍率最大許容値等)
4. トランザクションのデータを1～3の情報を元に作成する。
5. 4で作成したトランザクションのデータに2のアカウントと1のgenerationHashを使って署名する。
6. これから送信するトランザクションの状態がブロックチェーン上で変化した際に通知を受け取るために事前にノードに接続してWebSocketを利用したモニタリングを開始する。
7. 5で作成した署名済トランザクションをノードにREST APIで送信する。

### ネットワーク固有の情報について

- networkType: ネットワークの種類。Symbolブロックチェーンの場合、テストネットならTEST_NET(152), メインネットならMAIN_NET(104)を指定する。
- epochAdjustment: Symbolブロックチェーン上での時刻はジェネシスブロックからの経過時間をミリ秒で表した数値として一貫性をもって扱われており、一般的なUnix Timeに対してオフセットする必要がある。そのオフセット値がepochAdjustment。テストネットはリセットされることがあり、リセットされる毎に変化するため、直接値をハードコードしておく場合は注意が必要。
- generationHash: ブロックチェーンネットワーク毎に異なる値であり、リプレイアタック防止のためにトランザクションへの署名等に利用される。
- networkCurrency: 対象のブロックチェーンに置ける基軸通貨的な役割を果たすトークンの情報。

### トランザクションの状態について

以下のような点が特徴的です。

1. トランザクションがノードに受付されるとUnconfirmedという状態になるが、この段階ではブロックチェーン上に永続的な状態として記録されているわけではない。なお、手数料不足や署名のミスマッチや不正なトランザクション等の場合はこのUnconfirmedという状態にならず、エラーとして処理される。なお、そういったエラーはREST APIでのトランザクションアナウンス時には通知されないため、別途WebSocketを通じたモニタリングや、REST APIを定期実行するポーリングのような処理が必要。
2. PoS的な形でノード間で合意が形成されブロックに組み込まれるとConfirmedという状態になり、ブロックに刻まれる。ただし、次の状態のFinalizedになるまでの間は、ブロックがロールバックされて覆る可能性は残る。
3. 約6時間に1回行われる投票で、投票ノード全体の2/3以上のインポータンスを持つノード群で合意が形成されると、Finalizedという状態になり、それ以降はブロックチェーンの状態として覆ることはない。

### トランザクションの有効期限について

Symbolブロックチェーンでは、トランザクションの送信の際に、毎回インクリメントする必要がある`nounce`のような値を含める必要が無い仕様となっています。その代わり、トランザクションの有効期限の指定が必須です。また、トランザクションの署名時にブロックチェーンネットワーク毎に異なるgenerationHashという値を使用して署名を行うことでリプレイアタックが防止されています。

## symbol-sdk@2 ハンズオン #1 まとめ

1回目となるこのハンズオンでは、ウォレットを作成し、アカウントを作成し、フォーセットからテスト用トークンを取得して、symbol-sdk@2を使ってREST APIでそのアカウント情報を取得し、シンプルな転送トランザクションを送信するところまでを一緒に体験しました。

Symbolブロックチェーンを用いた開発が、(トランザクションの種類については様々な種類がブロックチェーンにビルトインで用意されており、それぞれ、トランザクションの送信のためにセットすべき値が異なるものの、)REST APIで必要な情報を参照し、トランザクションを作成し、署名し、トランザクションの状態のモニタリングをセットした上で、トランザクションをネットワークにアナウンスするという要素から成り立っており、それらを、既存のアプリケーションに組み込むというシンプルな形で実現できること感じ取ってくださっていたら幸いです。

言い換えると、今そこにある、全世界に力強く分散したREST API, WebSocketノード群をそのまま開発者が利用して、入念に検証済の柔軟な表現力を持つトランザクションを送信するだけで、ブロックチェーンの機能を活用したアプリケーションが、既存のアプリケーション開発の極めて近い延長線上で可能なことを、実際に体験して頂けたのではないかとも思います。

2回目となる次回ハンズオンでは、様々な種類のトランザクションや、Symbolの大きな技術的特徴であるアグリゲートトランザクションやマルチシグ等のトランザクションの送信や、ブロックチェーン上の情報の検索等について一緒に体験していきたいと思います。

よろしければ次回ハンズオンもぜひご参加ください。皆さまとともにSymbolブロックチェーンを用いた開発の世界を一緒に探求していくことを楽しみにしています！

[次のハンズオン: symbol-sdk@2 ハンズオン #2](/symbol-sdk-2-hands-on-2.md)
