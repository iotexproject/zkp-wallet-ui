import { makeAutoObservable } from 'mobx'
import { constants, providers } from "ethers"
import { ZKPassAccount__factory } from "../contracts/ZKPassAccount__factory"
import { ZKPassAccountFactory__factory } from "../contracts/ZKPassAccountFactory__factory"
import { INSRegistry__factory } from "../contracts/INSRegistry__factory"
import { EntryPoint__factory } from "@account-abstraction/contracts"
import { addresses } from "../common/constants"
import { ZKPWalletNFT__factory } from '../contracts/ZKPWalletNFT__factory'
import { hexConcat, hexlify, keccak256, namehash, resolveProperties, toUtf8Bytes, formatEther } from 'ethers/lib/utils'
import { ZKPSigner, prove } from '../signer'
import { PublicResolver__factory } from '../contracts/PublicResolver__factory'
import { deepHexlify, fillUserOp, signOp } from '../signer/utils'

const config = addresses["testnet"]

export class BaseStore {
    username: String = ''
    password: String = ''

    info = {
        show: false,
        text: ''
    }

    isLogin = false
    minted = 0

    provider = new providers.JsonRpcProvider(config.endpoint)
    paymaster = new providers.JsonRpcProvider(config.paymaster)
    bundler = new providers.JsonRpcProvider(config.bundler)
    accountTpl = new ZKPassAccount__factory()
    factory = ZKPassAccountFactory__factory.connect(config.accountFactory, this.provider)
    registry = INSRegistry__factory.connect(config.registry, this.provider)
    entryPoint = EntryPoint__factory.connect(config.entryPoint, this.provider)
    nft = ZKPWalletNFT__factory.connect(config.nft, this.provider)
    disableButton = false

    account = {
        created: false,
        username: "",
        password: "",
        address: "",
        balance: "",
        nameHash: "",
        passHash: "",
        nft: 0,
    }

    constructor() {
        makeAutoObservable(this)
    }

    async login() {
        if (this.username.trim() === "") {
            this.info = {
                show: true,
                text: 'Account name is empty'
            }
            return
        }
        if (this.password.trim() === "") {
            this.info = {
                show: true,
                text: 'Password is empty'
            }
            return
        }
        this.disableButton = true
        this.account.username = this.username.trim()
        this.account.password = this.password.trim()

        const nameHash = namehash(this.account.username + ".zwallet.io")
        const resovler = await this.registry.resolver(nameHash)

        this.info = {
            show: true,
            text: 'Generate password proof...'
        }
        const passport = BigInt(keccak256(
            hexConcat([nameHash, hexlify(toUtf8Bytes(this.account.password))])
        ))
        const {publicSignals} = await prove(
            BigInt(0), // nonce
            BigInt(0), // opHash
            passport,
            "passport.wasm",
            "passport_0001.zkey"
        )
        if (resovler === constants.AddressZero) {
            this.account.address = await this.factory.getAddress(this.account.username, publicSignals[0])
        } else {
            const publicRessolver = PublicResolver__factory.connect(resovler, this.provider)
            this.account.address = await publicRessolver["addr(bytes32)"](nameHash)
            this.account.created = true

            const account = ZKPassAccount__factory.connect(this.account.address, this.provider)
            const passHash = await account.passHash()
            if (passHash.toString() !== publicSignals[0].toString()) {
                this.disableButton = false
                this.info = {
                    show: true,
                    text: 'Password incorrect'
                }
                return
            }
        }
        this.account.nameHash = nameHash
        this.account.passHash = publicSignals[0]
        this.disableButton = false
        this.isLogin = true
        this.info = {
            show: true,
            text: `Logined account ${this.account.username}.zwallet.io`
        }
    }

    async disconnect() {
        this.isLogin = false
        this.account.created = false
    }

    async mint() {
        this.info = {
            show: true,
            text: 'Prepare user operation to mint NFT...'
        }
        this.disableButton = true
        const op = {
            sender: this.account.address,
            callData: this.accountTpl.interface.encodeFunctionData("execute", [
                config.nft,
                0,
                "0x1249c58b",
            ]),
            callGasLimit: 70000,
            preVerificationGas: 80000
        }
        if (!this.account.created) {
            // @ts-ignore
            op.initCode = hexConcat([
                this.factory.address,
                this.factory.interface.encodeFunctionData("createAccount", [this.account.username, this.account.passHash]),
            ])
        }
        const fullOp = await fillUserOp(op, this.entryPoint)
        let hexifiedUserOp = deepHexlify(await resolveProperties(fullOp))
        this.info = {
            show: true,
            text: 'Request paymaster signature...'
        }
        let result = await this.paymaster.send("eth_signVerifyingPaymaster", [hexifiedUserOp])
        fullOp.paymasterAndData = result

        const chainId = (await this.provider.getNetwork()).chainId
        this.info = {
            show: true,
            text: 'Sign user operation using zk prover...'
        }
        const signedOp = await signOp(
            fullOp,
            this.entryPoint.address,
            chainId,
            new ZKPSigner(this.account.nameHash, this.account.password, fullOp.nonce)
        )
        hexifiedUserOp = deepHexlify(await resolveProperties(signedOp))

        this.info = {
            show: true,
            text: 'Send user operation to bundler...'
        }
        result = await this.bundler.send("eth_sendUserOperation", [hexifiedUserOp, this.entryPoint.address])

        if (this.account.created) {
            this.info = {
                show: true,
                text: `Mint NFT opHash: ${result}`
            }
        } else {
            this.info = {
                show: true,
                text: `Create account and mint NFT opHash: ${result}`
            }
        }
        this.disableButton = false
    }

    async fetchMintedNFT() {
        this.minted = (await this.nft.nextTokenId()).toNumber()
    }

    async fillAccount() {
        const balance = await this.provider.getBalance(this.account.address)
        this.account.balance = formatEther(balance)

        const amount = await this.nft.balanceOf(this.account.address)
        this.account.nft = amount.toNumber()
    }
}
