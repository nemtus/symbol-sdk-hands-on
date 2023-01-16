import { firstValueFrom } from "rxjs";
import { RepositoryFactoryHttp, Address } from "symbol-sdk";

const nodeUrl = "https://sym-test-04.opening-line.jp:3001";
const repositoryFactoryHttp = new RepositoryFactoryHttp(nodeUrl);
const accountRepository = repositoryFactoryHttp.createAccountRepository();
const rawAddress = "TACDCQIQYRZ3L7ARKSQBAVDQZJQ6PPGY4K2SSCY";
const address = Address.createFromRawAddress(rawAddress);

// RxJS
accountRepository.getAccountInfo(address).subscribe((accountInfo) => {
  console.dir({ accountInfo }, { depth: null });
});

// Async/Await
const accountInfo = await firstValueFrom(
  accountRepository.getAccountInfo(address)
);
console.dir({ accountInfo }, { depth: null });
