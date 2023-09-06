import * as ethers from "ethers"
import { defaultAbiCoder, hexConcat, hexlify, keccak256, namehash, toUtf8Bytes } from "ethers/lib/utils"
import { BundlerJsonRpcProvider, IPresetBuilderOpts, Presets, UserOperationBuilder, UserOperationMiddlewareFn } from "userop"
import { BigNumber } from "ethers"
import { EntryPoint, EntryPoint__factory } from "@account-abstraction/contracts"
import {
    ZKPassAccountFactory__factory,
    ZKPassAccount__factory,
    ZKPassAccount as ZKPassAccountImpl,
    ZKPassAccountFactory,
} from "../contracts"

// @ts-ignore
const snarkjs = window.snarkjs

export async function prove(
    nonce: BigInt, op: BigInt, secret: BigInt,
    wasm: string, zkey: string
) {
    return await snarkjs.groth16.fullProve({
        nonce: nonce.toString(),
        op: op.toString(),
        secret: secret.toString()
    }, wasm, zkey);
}

export class ZKPSigner {
    private readonly SNARK_SCALAR_FIELD = BigInt("0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001")
    public name: string
    private passport: bigint
    private nonce?: bigint

    constructor(name:string, password: string, nonce?: number | BigNumber) {
        const nameHash = namehash(name + ".zkwallets.io")
        this.passport = BigInt(keccak256(
            hexConcat([nameHash, hexlify(toUtf8Bytes(password))])
        ))
        if (nonce != null) {
            this.nonce = BigInt(nonce.toString())
        }
        this.name = name
    }

    async initSignals(): Promise<any> {
        const {publicSignals} = await prove(
            BigInt(0), // nonce
            BigInt(0), // opHash
            this.passport,
            "passport.wasm",
            "passport_0001.zkey"
        )
        return publicSignals
    }

    public setNonce(nonce: bigint) {
        this.nonce = nonce
    }

    async sign(opHash: string): Promise<string> {
        if (this.nonce == null) {
            throw new Error("nonce is null")
        }

        let op = BigInt(hexlify(opHash))
        op %= this.SNARK_SCALAR_FIELD

        const passport = this.passport - this.nonce
        const {proof, publicSignals} = await prove(
            this.nonce,
            op,
            passport,
            "passport.wasm",
            "passport_0001.zkey"
        )

        const signature = defaultAbiCoder.encode(
            ["uint256","uint256","uint256","uint256","uint256","uint256","uint256","uint256","uint256"],
            [proof.pi_a[0], proof.pi_a[1], proof.pi_b[0][1], proof.pi_b[0][0], proof.pi_b[1][1], proof.pi_b[1][0], proof.pi_c[0], proof.pi_c[1], publicSignals[1]]
        )
        return signature
    }
}

export const ZKPassSignature =
    (signer: ZKPSigner): UserOperationMiddlewareFn =>
    async (ctx) => {
        ctx.op.signature = await signer.sign(ctx.getUserOpHash())
    }

export class ZKPAccount extends UserOperationBuilder {
    private signer: ZKPSigner
    private provider: ethers.providers.JsonRpcProvider
    private entryPoint: EntryPoint
    private factory: ZKPassAccountFactory
    private initCode: string
    proxy: ZKPassAccountImpl

    private constructor(signer: ZKPSigner, rpcUrl: string, opts?: IPresetBuilderOpts) {
        super()
        this.signer = signer
        this.provider = new BundlerJsonRpcProvider(rpcUrl).setBundlerRpc(opts?.overrideBundlerRpc)
        this.entryPoint = EntryPoint__factory.connect(
            opts?.entryPoint || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
            this.provider
        )
        this.factory = ZKPassAccountFactory__factory.connect(
            opts?.factory || '0x1188fDa16947dB086408Dc47A3267Aa3C4Aca9c4',
            this.provider
        )
        this.initCode = "0x"
        this.proxy = ZKPassAccount__factory.connect(ethers.constants.AddressZero, this.provider)
    }

    private resolveAccount: UserOperationMiddlewareFn = async (ctx) => {
        ctx.op.nonce = await this.entryPoint.getNonce(ctx.op.sender, 0)
        ctx.op.initCode = ctx.op.nonce.eq(0) ? this.initCode : "0x"
    }

    public static async init(
        signer: ZKPSigner,
        rpcUrl: string,
        opts?: IPresetBuilderOpts
    ): Promise<ZKPAccount> {
        const instance = new ZKPAccount(signer, rpcUrl, opts)

        try {
            instance.initCode = ethers.utils.hexConcat([
                instance.factory.address,
                instance.factory.interface.encodeFunctionData("createAccount", [
                    signer.name,
                    (await signer.initSignals())[0],
                ]),
            ])
            await instance.entryPoint.callStatic.getSenderAddress(instance.initCode)

            throw new Error("getSenderAddress: unexpected result")
        } catch (error: any) {
            const addr = error?.errorArgs?.sender
            if (!addr) throw error

            instance.proxy = ZKPassAccount__factory.connect(addr, instance.provider)
        }

        const base = instance
            .useDefaults({
                sender: instance.proxy.address,
                signature: await instance.signer.sign(ethers.utils.keccak256("0xdead")),
            })
            .useMiddleware(instance.resolveAccount)
            .useMiddleware(Presets.Middleware.getGasPrice(instance.provider))

        const withPM = opts?.paymasterMiddleware
            ? base.useMiddleware(opts.paymasterMiddleware)
            : base.useMiddleware(Presets.Middleware.estimateUserOperationGas(instance.provider))

        return withPM.useMiddleware(ZKPassSignature(instance.signer))
    }

    execute(to: string, value: ethers.BigNumberish, data: ethers.BytesLike) {
        return this.setCallData(
            this.proxy.interface.encodeFunctionData("execute", [to, value, data])
        )
    }

    executeBatch(
        to: Array<string>,
        values: Array<ethers.BigNumberish>,
        data: Array<ethers.BytesLike>
    ) {
        return this.setCallData(
            this.proxy.interface.encodeFunctionData("executeBatch", [to, data])
        )
    }
}
