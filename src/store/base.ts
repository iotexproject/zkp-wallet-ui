import { makeAutoObservable } from 'mobx'
import { BigNumber, constants, ethers, providers } from "ethers"
import { ZKPassAccount__factory } from "../contracts/ZKPassAccount__factory"
import { ZKPassAccountFactory__factory } from "../contracts/ZKPassAccountFactory__factory"
import { INSRegistry__factory } from "../contracts/INSRegistry__factory"
import { EntryPoint__factory } from "@account-abstraction/contracts"
import { addresses } from "../common/constants"
import { ZKPWalletNFT__factory } from '../contracts/ZKPWalletNFT__factory'
import { hexConcat, hexlify, keccak256, namehash, resolveProperties, toUtf8Bytes, formatEther } from 'ethers/lib/utils'
import { ZKPAccount, ZKPSigner, prove } from '../signer'
import { PublicResolver__factory } from '../contracts/PublicResolver__factory'
import { Client, Presets } from 'userop'

const config = addresses["testnet"]

export class BaseStore {
    username: String = ''
    password: String = ''
    email: String = ''

    info = {
        show: false,
        text: ''
    }

    isLogin = false
    showEmail = false
    showRecovery = false
    showRecoveryMessage = false
    minted = 0
    recoveryMessage = ''

    provider = new providers.JsonRpcProvider(config.endpoint)
    paymaster = new providers.JsonRpcProvider(config.paymaster)
    bundler = new providers.JsonRpcProvider(config.bundler)
    accountTpl = new ZKPassAccount__factory()
    factory = ZKPassAccountFactory__factory.connect(config.accountFactory, this.provider)
    registry = INSRegistry__factory.connect(config.registry, this.provider)
    entryPoint = EntryPoint__factory.connect(config.entryPoint, this.provider)
    nft = ZKPWalletNFT__factory.connect(config.nft, this.provider)
    disableButton = false
    client = null;

    account = {
        created: false,
        username: "",
        password: "",
        address: "",
        balance: "",
        nameHash: "",
        passHash: "",
        guarded: false,
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

        const nameHash = namehash(this.account.username + ".zkwallets.io")
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
                this.showRecovery = true
                return
            }
        }
        this.account.nameHash = nameHash
        this.account.passHash = publicSignals[0]
        this.disableButton = false
        this.isLogin = true
        // @ts-ignore
        this.client = await Client.init(config.endpoint, {
            entryPoint: config.entryPoint,
            overrideBundlerRpc: config.bundler,
        })
        this.info = {
            show: true,
            text: `Logined account ${this.account.username}.zkwallets.io`
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

        // mint NFT
        const callData = this.accountTpl.interface.encodeFunctionData("execute", [
            config.nft,
            0,
            "0x1249c58b",
        ])
        let nonce = 0
        if (this.account.created) {
            nonce = (await ZKPassAccount__factory.connect(this.account.address, this.provider).getNonce()).toNumber()
        }

        const gas = await this.paymaster.send("pm_gasRemain", [this.account.address])
        if (BigNumber.from(gas).lt(ethers.utils.parseEther("1.0"))) {
            this.info = {
                show: true,
                text: 'Request paymaster gas...'
            }
            await this.paymaster.send("pm_requestGas", [this.account.address])
        }
        const signer = new ZKPSigner(this.account.username, this.account.password, nonce)
        const accountBuilder = await ZKPAccount.init(signer, config.endpoint, {
            overrideBundlerRpc: config.bundler,
            entryPoint: config.entryPoint,
            paymasterMiddleware: Presets.Middleware.verifyingPaymaster(
                config.paymaster,
                ""
            ),
        })
        accountBuilder.setCallData(callData)

        this.info = {
            show: true,
            text: 'Send user operation to bundler...'
        }
        // @ts-ignore
        const response = await this.client.sendUserOperation(accountBuilder)
        if (this.account.created) {
            this.info = {
                show: true,
                text: `Mint NFT opHash: ${response.userOpHash}`
            }
        } else {
            this.info = {
                show: true,
                text: `Create account and mint NFT opHash: ${response.userOpHash}`
            }
        }
        const userOperationEvent = await response.wait()
        this.info = {
            show: true,
            text: `Mint NFT txhash: ${userOperationEvent?.transactionHash}`
        }
        this.account.created = true
        this.disableButton = false
    }

    async fetchMintedNFT() {
        this.minted = (await this.nft.nextTokenId()).toNumber()
    }

    async openEmailGuardian() {
        this.showEmail = true
    }

    async fillAccount() {
        const balance = await this.provider.getBalance(this.account.address)
        this.account.balance = formatEther(balance)

        const amount = await this.nft.balanceOf(this.account.address)
        this.account.nft = amount.toNumber()

        try {
            const email = await ZKPassAccount__factory.connect(this.account.address, this.provider).email()
            if (email !== "0x" + "0".repeat(64)) {
                this.account.guarded = true
            }
        } catch (err) {
        }
    }

    async addEmailGuardian() {
        if (this.email.trim() === "") {
            this.info = {
                show: true,
                text: 'Email is empty'
            }
            return
        }

        const emailHash = keccak256(toUtf8Bytes(this.email.trim()))

        this.info = {
            show: true,
            text: 'Prepare user operation to add email guardian...'
        }
        this.disableButton = true

        const callData = this.accountTpl.interface.encodeFunctionData("execute", [
            this.account.address,
            0,
            `0x99a44531${emailHash.substring(2)}`,
        ])
        let nonce = 0
        if (this.account.created) {
            nonce = (await ZKPassAccount__factory.connect(this.account.address, this.provider).getNonce()).toNumber()
        }
        const gas = await this.paymaster.send("pm_gasRemain", [this.account.address])
        if (BigNumber.from(gas).lt(ethers.utils.parseEther("1.0"))) {
            this.info = {
                show: true,
                text: 'Request paymaster gas...'
            }
            await this.paymaster.send("pm_requestGas", [this.account.address])
        }
        const signer = new ZKPSigner(this.account.username, this.account.password, nonce)
        const accountBuilder = await ZKPAccount.init(signer, config.endpoint, {
            overrideBundlerRpc: config.bundler,
            entryPoint: config.entryPoint,
            paymasterMiddleware: Presets.Middleware.verifyingPaymaster(
                config.paymaster,
                ""
            ),
        })
        accountBuilder.setCallData(callData)

        this.info = {
            show: true,
            text: 'Send user operation to bundler...'
        }
        // @ts-ignore
        const response = await this.client.sendUserOperation(accountBuilder)

        this.info = {
            show: true,
            text: `Add email guardian opHash: ${response.userOpHash}`
        }
        const userOperationEvent = await response.wait()
        this.info = {
            show: true,
            text: `Add email guardian txhash: ${userOperationEvent?.transactionHash}`
        }
        this.disableButton = false
        this.showEmail = false
    }

    async generateRecovery() {
        this.info = {
            show: true,
            text: 'Generate email recovery message...'
        }

        const username = this.username.trim()
        const password = this.password.trim()
        if (username === "") {
            this.info = {
                show: true,
                text: 'Account name is empty'
            }
            return
        }
        if (password === "") {
            this.info = {
                show: true,
                text: 'Password is empty'
            }
            return
        }
        const nameHash = namehash(username + ".zkwallets.io")
        const resovler = await this.registry.resolver(nameHash)
        if (resovler === constants.AddressZero) {
            this.info = {
                show: true,
                text: `Account ${username}.zkwallets.io haven't create`
            }
            return
        }
        const publicRessolver = PublicResolver__factory.connect(resovler, this.provider)
        const address = await publicRessolver["addr(bytes32)"](nameHash)

        const email = await ZKPassAccount__factory.connect(address, this.provider).email()
        if (email === "0x" + "0".repeat(64)) {
            this.recoveryMessage = `Account ${username}.zkwallets.io haven't add email guardian.`
            this.showRecoveryMessage = true
            return
        }
        
        this.info = {
            show: true,
            text: 'Generate password proof...'
        }
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
        const chainId = (await this.provider.getNetwork()).chainId
        const passHash = hexlify(BigInt(publicSignals[0]))

        this.recoveryMessage =  `Send an email with below text as subject to iopay-recover@iotex.me\n01${chainId}${address.toLowerCase()}${passHash.substring(2)}`
        this.showRecoveryMessage = true
    }

    async closeRecoveryMessage() {
        this.showRecoveryMessage = false
    }
}
