import { useState } from "react"
import { ZKPSigner, prove } from "./signer"
import { providers, constants } from "ethers"
import {ZKPassAccountFactory__factory } from "./contracts/ZKPassAccountFactory__factory"
import { addresses } from "./common/constants"
import { hexConcat, hexlify, keccak256, namehash, resolveProperties, toUtf8Bytes } from "ethers/lib/utils"
import { INSRegistry__factory } from "./contracts/INSRegistry__factory"
import { PublicResolver__factory } from "./contracts/PublicResolver__factory"
import { deepHexlify, fillUserOp, signOp } from "./signer/utils"
import { EntryPoint__factory } from "@account-abstraction/contracts"
import { ZKPassAccount__factory } from "./contracts/ZKPassAccount__factory"

export default function Home() {
  const empty: string[] = []
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [info, setInfo] = useState(empty)

  const config = addresses["testnet"]

  const claim = async () => {
    const provider = new providers.JsonRpcProvider(config.endpoint)
    const paymaster = new providers.JsonRpcProvider(config.paymaster)
    const bundler = new providers.JsonRpcProvider(config.bundler)
    const accountTpl = new ZKPassAccount__factory()
    const factory = ZKPassAccountFactory__factory.connect(config.accountFactory, provider)
    const registry = INSRegistry__factory.connect(config.registry, provider)
    const entryPoint = EntryPoint__factory.connect(config.entryPoint, provider)

    const nameHash = namehash(username + ".zkwallet.io")
    const resovler = await registry.resolver(nameHash)
    let account = ""
    const op = {
      sender: "",
      callData: "0x",
      callGasLimit: 70000,
      preVerificationGas: 60000
    }
    setInfo(old => [...old, "---------------------------"])
    if (resovler === constants.AddressZero) {
      setInfo(old => [...old, "new account use prover..."])
      const passport = BigInt(keccak256(
        hexConcat([nameHash, hexlify(toUtf8Bytes(password))])
      ))
      const {publicSignals} = await prove(
          BigInt(0), // nonce
          BigInt(0), // opHash
          passport,
          "passport.wasm",
          "passport_0001.zkey"
      )
      account = await factory.getAddress(username, publicSignals[0])
      // @ts-ignore
      op.initCode = hexConcat([
        factory.address,
        factory.interface.encodeFunctionData("createAccount", [username, publicSignals[0]]),
      ])
    } else {
      setInfo(old => [...old, "use exists account..."])
      const publicRessolver = PublicResolver__factory.connect(resovler, provider)
      account = await publicRessolver["addr(bytes32)"](nameHash)
    }
    setInfo(old => [...old, `account address ${account}`])
    op.sender = account
    op.callData = accountTpl.interface.encodeFunctionData("execute", [
      config.nft,
      0,
      "0x1249c58b",
    ])

    const fullOp = await fillUserOp(op, entryPoint)
    let hexifiedUserOp = deepHexlify(await resolveProperties(fullOp))
    setInfo(old => [...old, `request paymaster...`])
    let result = await paymaster.send("eth_signVerifyingPaymaster", [hexifiedUserOp])
    fullOp.paymasterAndData = result

    const chainId = (await provider.getNetwork()).chainId
    setInfo(old => [...old, `signing op...`])
    const signedOp = await signOp(
      fullOp,
        entryPoint.address,
        chainId,
        new ZKPSigner(nameHash, password, fullOp.nonce)
    )
    hexifiedUserOp = deepHexlify(await resolveProperties(signedOp))
    setInfo(old => [...old, `send op to bundler...`])
    result = await bundler.send("eth_sendUserOperation", [hexifiedUserOp, entryPoint.address])
    setInfo(old => [...old, `Successful mint nft with opHash: ${result}`])
  }

  return (
    <div className="bg-white">
      <div className="pt-6">
        <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-3 lg:grid-rows-[auto,auto,1fr] lg:gap-x-8 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8 pb-10">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Introducing ZKP wallet NFT</h1>
          </div>
          <div className="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8">
            <img src="https://images.ctfassets.net/0idwgenf7ije/1nZPLIuyqGxAyoPN4b4nFY/b1c977b8d34c15532f432d9ba9250fc1/Gemini-Zcash_Leads_the_Way_on_Zero-Knowledge_Proofs_With_zk-SNARKs.png" alt="" className="object-cover object-center" />
          </div>

          <div className="mt-4 lg:row-span-3 lg:mt-0">
            <form className="space-y-6" action="#" method="POST">
              <div>
                <label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-900">Account name</label>
                <div className="mt-2">
                  <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                    <input onChange={e => {setUsername(e.target.value)}} type="text" name="username" id="username" autoComplete="username" className="block flex-1 border-0 bg-transparent py-1.5 pl-2 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="test"></input>
                    <span className="flex select-none items-center pr-2 text-gray-500 sm:text-sm">.zkwallet.io</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">Password</label>
                </div>
                <div className="mt-2">
                  <input onChange={e => {setPassword(e.target.value)}} id="password" name="password" type="password" autoComplete="current-password" required 
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 pl-2 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
              <div>
                <button 
                  type="button"
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  onClick={claim}
                >Create wallet & Mint</button>
              </div>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-2xl sm:px-6 lg:max-w-7xl lg:grid-cols-3 lg:grid-rows-[auto,auto,1fr] lg:gap-x-8 lg:px-8 lg:pb-24 lg:pt-16">
          {
            info.map(i => <div className="row-span-full text-gray-900 sm:text-3l">{i}</div>)
          }
        </div>
      </div>
    </div>
  );
}
