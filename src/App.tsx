import React, { useState } from "react"
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
import {useLocalStore} from "mobx-react-lite";
import {useStore} from "./store";
import {Login} from "./component/Login";

export default function Home() {
  const empty: string[] = []
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [info, setInfo] = useState(empty)

  const { base } = useStore();
  const config = addresses["testnet"]
  const store = useLocalStore(() => ({
    username: '',
    password:'',
  }));

  const claim = async () => {

    const nameHash = namehash(username + ".zkwallet.io")
    const resovler = await base.registry.resolver(nameHash)
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
      {base.isLogin?

        <div className="mx-auto max-w-2xl sm:px-6 lg:max-w-7xl lg:grid-cols-3 lg:grid-rows-[auto,auto,1fr] lg:gap-x-8 lg:px-8 lg:pb-24 lg:pt-16">
          {
            info.map(i => <div className="row-span-full text-gray-900 sm:text-3l">{i}</div>)
          }
        </div>:<Login />
      }
      </div>

  );
}
