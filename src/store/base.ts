import { makeAutoObservable } from 'mobx'
import {providers} from "ethers"
import {ZKPassAccount__factory} from "../contracts/ZKPassAccount__factory"
import {ZKPassAccountFactory__factory} from "../contracts/ZKPassAccountFactory__factory"
import {INSRegistry__factory} from "../contracts/INSRegistry__factory"
import {EntryPoint__factory} from "@account-abstraction/contracts"
import { addresses } from "../common/constants"
import { ZKPWalletNFT__factory } from '../contracts/ZKPWalletNFT__factory'

const config = addresses["testnet"]

export class BaseStore {
    username: String = ''
    password: String = ''

    info = {
        show: false,
        text: ''
    }

    isLogin:  boolean = false
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

    constructor() {
        makeAutoObservable(this)
    }

    claim() {
        this.disableButton = true
        this.info = {
            show: true,
            text: 'Hello'
        }
        console.log(this.username)
    }

    async fetchMintedNFT() {
        this.minted = (await this.nft.nextTokenId()).toNumber()
    }
}
