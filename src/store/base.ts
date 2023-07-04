import { makeAutoObservable } from 'mobx';
import {providers} from "ethers";
import {ZKPassAccount__factory} from "../contracts/ZKPassAccount__factory";
import {ZKPassAccountFactory__factory} from "../contracts/ZKPassAccountFactory__factory";
import {INSRegistry__factory} from "../contracts/INSRegistry__factory";
import {EntryPoint__factory} from "@account-abstraction/contracts";
import config from "tailwindcss/defaultConfig";

export class BaseStore {

    username: String = ''
    password: String = ''

    isLogin:  boolean = false

    provider = new providers.JsonRpcProvider(config.endpoint)
    paymaster = new providers.JsonRpcProvider(config.paymaster)
    bundler = new providers.JsonRpcProvider(config.bundler)
    accountTpl = new ZKPassAccount__factory()
    factory = ZKPassAccountFactory__factory.connect(config.accountFactory, this.provider)
    registry = INSRegistry__factory.connect(config.registry, this.provider)
    entryPoint = EntryPoint__factory.connect(config.entryPoint, this.provider)

    constructor() {
        makeAutoObservable(this);
    }


    claim() {


        this.isLogin = true;
    }
}
