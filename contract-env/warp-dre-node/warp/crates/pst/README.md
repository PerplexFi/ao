# 🦀 Warp contracts - Rust template

Following repository is a template for writing SmartWeave contracts in Rust and building them into WASM binaries which can be then processed by Warp SDK.

It contains an example implementation of a PST contract - which you can use as a base for implementing your own contract.
If you are not familiar with the concept of Profit Sharing Tokens, check out a [tutorial](https://academy.warp.cc/tutorials/pst/introduction/intro) for writing your first PST contract in our Warp Academy.

- [Installation](#-installation)
- [Code structure](#-code-structure)
- [Writing contract](#-writing-contract)
  - [Accessing JavaScript imports](#accessing-javascript-imports)
  - [Foreign contract read](#foreign-contract-read)
  - [Foreign contract write](#foreign-contract-write)
- [Build](#-build)
- [Typescript bindings](#typescript-bindings)
- [Tests](#-tests)
- [Deploy](#-deploy)
- [Using SDK](#-using-sdk)


## 📦 Installation

You will need:

- Rust :-) (https://doc.rust-lang.org/cargo/getting-started/installation.html)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) (on Apple's M1s you may need Rosetta `softwareupdate --install-rosetta` for wasm-pack to run)
- [Node.js](https://nodejs.org/en/download/) version 16.5 or above
- [yarn](https://yarnpkg.com/getting-started/install) installed

To install all Node.js dependencies run the following command:

```bash
yarn install
```

## 🔍 Code structure

- [deploy/](deploy) - contains deployment scripts for localhost/testnet/mainnet and contract's initial state definition
- [contract](contract) - contains definitions and implementation for the contract
  - [definition/](contract/definition) - contains contract definitions (e.g. actions, errors and state) which define shape of the contract, it also includes tools to generate JSON files from contract definition files
    - [action.rs](contract/definition/src/action.rs) - contains enums of the `WriteAction`, `ReadAction` and `ReadResponse`, each of it includes structs with specific definitons (e.g. `Balance` struct), it also contains `ActionResult` and `HandlerResult` enums
    - [error.rs](contract/defintion/src/error.rs) - contains the definition of contract's business errors (e.g. "not enough balance")
    - [generate_json.rs](contract/definition/src/generate_json.rs) - tool to generate JSON schemas from the definitions
    - [state.rs](contract/definition/src/state.rs) - contains the definition of contract's state
  - [implementation](contract/implementation) - contains implementation for the contract definitions, it will be compiled to WASM and used when deploying contract to the blockchain
    - [pkg/](pkg) - generated by `wasm-pack` during build process - contains compiled wasm binary, js "glue" code, etc.
    - [src/](src) - contains the source code of the contract implementing contract definitions
      - [actions/](contract/implementation/src/actions) - the main part of the contract - contains `actions` (functions) that can be called to interact
        with the contract (and either change its internal state or return a view of the current state).
        These functions contain all the business logic of the contract
      - [contract_utils/](contract/implementation/src/contract_utils) - contains low-level code responsible for mapping types, storing state,
        definition of functions imported from js, etc.  
        🔥Do Not Edit🔥, unless you really know what you're doing :-)
      - [contract.rs](contract/implementation/src/contract.rs) - entry point (from the contract's developer perspective) to the contract.
        Contains the `handle` function that calls specific contract's functions based on passed action
- [tests/](tests) - contains integration tests written in Jest

## 🧑‍💻 Writing contract

If you want to edit contract's code and create your own implementation you can do it by following these steps:

1. Edit `init-state.json` by adding the initial state for your contract - [deploy/state/init-state.json](deploy/state/init-state.json)
2. Modify the state definition of the contract - [contract/definition/src/state.rs](contract/definition/src/state.rs)
3. Edit/add actions which user will be able to call while interacting with the contract - [contract/definiton/src/actions](contract/definition/src/actions) and [contract/implementation/src/actions](contract/implementation/src/actions).
   We suggest keeping each action in a separate file.
4. Add above action functions to the pattern matching in `handle` function in [contract/implementation/src/contract.rs](contract/implementation/src/contract.rs)

### Accessing JavaScript imports

An example of how to access imports can be found here: [contract/implementation/src/contract.rs](contract/implementation/src/contract.rs)

### Foreign contract read

An example of how to read other contract state can be found here: [contract/implementation/src/actions/foreign_read.rs](contract/implementation/src/actions/foreign_read.rs)

### Foreign contract write

An example of how to call other contract function can be found here: [contract/implementation/src/actions/foreign_write.rs](contract/implementation/src/actions/foreign_write.rs)

Keep in mind that internal contract writes require the flag `internalWrites` to be turned on in the
evaluation options (for both calling and callee contracts). See [tests/contract.spec.ts](tests/contract.spec.ts#L111).

In order to access the calling contract tx id - use `SmartWeave::caller()`.
`SmartWeave::caller()` returns:

1. same value as `Transaction::owner()` - for standard interactions with contract
2. transaction id of the calling contract - in case of internal writes

## 👷 Build

Compile your contract to WASM binary by running following command:

```bash
yarn build
```

## Typescript bindings

Rust contract definitions can be compiled to Typescript:

1. Firstly JSON schemas are generated from Rust contract definitions using [schemars](https://github.com/GREsau/schemars).
2. Then, JSON schemas are compiled to Typescript using [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript).
3. Lastly, a helper class is generated from typescript bindings which allows to easily interact with the contract. Instead of using `writeInteraction` method each time, specific functions can be called within the contract, e.g.:

```ts
  async transfer(transfer: Transfer, options?: WriteInteractionOptions): Promise<WriteInteractionResponse | null> {
  return await this.contract.writeInteraction<BaseInput & Transfer>({ function: 'transfer', ...transfer }, options);
}
```

Generate JSON:

```bash
yarn gen-json
```

Compile JSON to Typescript:

```bash
yarn gen-ts
```

Gnerate JSON and compile to Typescript:

```bash
yarn gen-bindings
```

Files will be generated in [contract/definition/bindings](contract/definition/bindings).

## 🧪 Tests

Write tests for your contract (we will use Jest library for testing) - you can find a template in the [tests/](tests) folder.
Run tests with

```bash
yarn test
```

## 📜 Deploy

Deploy your contract to one of the networks (mainnet/Warp public testnet/localhost) by running following command (`network`: `mainnet` | `testnet` | `local`)

Please note that in case of local deployment, you need to have `ArLocal` instance running - `npx arlocal`.

```bash
yarn deploy:[network]
```

💡**NOTE**: If you want to deploy your contract locally you need to run Arlocal by typing following command:

```bash
npx arlocal
```

💡**NOTE**: When using mainnet please put your wallet key in [deploy/mainnet/.secrets/wallet-mainnet.json](deploy/mainnet/.secrets/wallet-mainnet.json). `.secrets` folder has been added to `.gitignore` so your key is kept securely.

You can view deploy script code [here](deploy/scripts/deploy.js).

## 🟥 Using SDK

Optionally - you can run one of the scripts which uses Warp SDK to interact with the contract. Using SDKs' methods works exactly the same as in case of a regular JS contract.

💡**NOTE** You will need to have a file with the wallet key and a file with the contract id to run these scripts. If you do not have them please run a [deploy](#-deploy) script.

1. `read` - reads contract state, check out the code in [deploy/scripts/read-contract-state.js](deploy/scripts/read-contract-state.js)

```bash
    npm run read:[network]
```

2. `balance` - get balance for a wallet address, check out the code in [deploy/scripts/interact-balance.js](deploy/scripts/interact-balance.js)

```bash
    npm run balance:[network]
```

3. `transfer` - transfer specific amount of tokens to the indicated wallet, check out the code in [deploy/scripts/interact-transfer.js](deploy/scripts/interact-transfer.js)