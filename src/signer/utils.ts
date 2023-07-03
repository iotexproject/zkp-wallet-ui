import * as ethers from "ethers"
import { BigNumber, BigNumberish, Contract, Signer, Wallet } from "ethers"
import { BytesLike } from "@ethersproject/bytes"
import { arrayify, defaultAbiCoder, hexDataSlice, hexlify, keccak256 } from "ethers/lib/utils"
import { EntryPoint } from "@account-abstraction/contracts"

export interface UserOperation {
    sender: string
    nonce: BigNumberish
    initCode: BytesLike
    callData: BytesLike
    callGasLimit: BigNumberish
    verificationGasLimit: BigNumberish
    preVerificationGas: BigNumberish
    maxFeePerGas: BigNumberish
    maxPriorityFeePerGas: BigNumberish
    paymasterAndData: BytesLike
    signature: BytesLike
}

export const DefaultsForUserOp: UserOperation = {
    sender: ethers.constants.AddressZero,
    nonce: 0,
    initCode: "0x",
    callData: "0x",
    callGasLimit: 0,
    verificationGasLimit: 300000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
    preVerificationGas: 21000, // should also cover calldata cost.
    maxFeePerGas: 0, // TODO: how to setting for NON-EIP1559 chain
    maxPriorityFeePerGas: 1e12, // iotex gas price
    paymasterAndData: "0x",
    signature: "0x",
}

export function getUserOpHash(op: UserOperation, entryPoint: string, chainId: number): string {
    const userOpHash = keccak256(packUserOp(op, true))
    const enc = defaultAbiCoder.encode(
        ["bytes32", "address", "uint256"],
        [userOpHash, entryPoint, chainId]
    )
    return keccak256(enc)
}

export function packUserOp(op: UserOperation, forSignature = true): string {
    if (forSignature) {
        return defaultAbiCoder.encode(
            [
                "address",
                "uint256",
                "bytes32",
                "bytes32",
                "uint256",
                "uint256",
                "uint256",
                "uint256",
                "uint256",
                "bytes32",
            ],
            [
                op.sender,
                op.nonce,
                keccak256(op.initCode),
                keccak256(op.callData),
                op.callGasLimit,
                op.verificationGasLimit,
                op.preVerificationGas,
                op.maxFeePerGas,
                op.maxPriorityFeePerGas,
                keccak256(op.paymasterAndData),
            ]
        )
    } else {
        // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
        return defaultAbiCoder.encode(
            [
                "address",
                "uint256",
                "bytes",
                "bytes",
                "uint256",
                "uint256",
                "uint256",
                "uint256",
                "uint256",
                "bytes",
                "bytes",
            ],
            [
                op.sender,
                op.nonce,
                op.initCode,
                op.callData,
                op.callGasLimit,
                op.verificationGasLimit,
                op.preVerificationGas,
                op.maxFeePerGas,
                op.maxPriorityFeePerGas,
                op.paymasterAndData,
                op.signature,
            ]
        )
    }
}

function encode(typevalues: Array<{ type: string; val: any }>, forSignature: boolean): string {
    const types = typevalues.map((typevalue) =>
        typevalue.type === "bytes" && forSignature ? "bytes32" : typevalue.type
    )
    const values = typevalues.map((typevalue) =>
        typevalue.type === "bytes" && forSignature ? keccak256(typevalue.val) : typevalue.val
    )
    return defaultAbiCoder.encode(types, values)
}

export interface AccountSigner {
    sign(opHash: string): Promise<string>
}

export class ECDSASigner implements AccountSigner {
    private signer: Wallet | Signer

    constructor(signer: Wallet | Signer) {
        this.signer = signer
    }

    async sign(opHash: string): Promise<string> {
        const message = arrayify(opHash)
        return this.signer.signMessage(message)
    }
}

export async function signOp(
    op: UserOperation,
    entryPoint: string,
    chainId: number,
    signer: AccountSigner
): Promise<UserOperation> {
    console.log(`pending sign UserOperation: ${JSON.stringify(op)}`)

    return {
        ...op,
        signature: await signer.sign(getUserOpHash(op, entryPoint, chainId)),
    }
}

const panicCodes: { [key: number]: string } = {
    // from https://docs.soliditylang.org/en/v0.8.0/control-structures.html
    0x01: "assert(false)",
    0x11: "arithmetic overflow/underflow",
    0x12: "divide by zero",
    0x21: "invalid enum value",
    0x22: "storage byte array that is incorrectly encoded",
    0x31: ".pop() on an empty array.",
    0x32: "array sout-of-bounds or negative index",
    0x41: "memory overflow",
    0x51: "zero-initialized variable of internal function type",
}

export function callDataCost(data: string): number {
    return ethers.utils
        .arrayify(data)
        .map((x) => (x === 0 ? 4 : 16))
        .reduce((sum, x) => sum + x)
}

export function decodeRevertReason(data: string, nullIfNoMatch = true): string | null {
    const methodSig = data.slice(0, 10)
    const dataParams = "0x" + data.slice(10)

    if (methodSig === "0x08c379a0") {
        const [err] = ethers.utils.defaultAbiCoder.decode(["string"], dataParams)
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        return `Error(${err})`
    } else if (methodSig === "0x00fa072b") {
        const [opindex, paymaster, msg] = ethers.utils.defaultAbiCoder.decode(
            ["uint256", "address", "string"],
            dataParams
        )
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        return `FailedOp(${opindex}, ${
            paymaster !== ethers.constants.AddressZero ? paymaster : "none"
        }, ${msg})`
    } else if (methodSig === "0x4e487b71") {
        const [code] = ethers.utils.defaultAbiCoder.decode(["uint256"], dataParams)
        return `Panic(${panicCodes[code] ?? code} + ')`
    }
    if (!nullIfNoMatch) {
        return data
    }
    return null
}

// rethrow "cleaned up" exception.
// - stack trace goes back to method (or catch) line, not inner provider
// - attempt to parse revert data (needed for geth)
// use with ".catch(rethrow())", so that current source file/line is meaningful.
export function rethrow(): (e: Error) => void {
    const callerStack = new Error()
        .stack!.replace(/Error.*\n.*at.*\n/, "")
        .replace(/.*at.* \(internal[\s\S]*/, "")

    if (arguments[0] != null) {
        throw new Error("must use .catch(rethrow()), and NOT .catch(rethrow)")
    }
    return function (e: Error) {
        const solstack = e.stack!.match(/((?:.* at .*\.sol.*\n)+)/)
        const stack = (solstack != null ? solstack[1] : "") + callerStack
        // const regex = new RegExp('error=.*"data":"(.*?)"').compile()
        const found = /error=.*?"data":"(.*?)"/.exec(e.message)
        let message: string
        if (found != null) {
            const data = found[1]
            message = decodeRevertReason(data) ?? e.message + " - " + data.slice(0, 100)
        } else {
            message = e.message
        }
        const err = new Error(message)
        err.stack = "Error: " + message + "\n" + stack
        throw err
    }
}

export function fillUserOpDefaults(
    op: Partial<UserOperation>,
    defaults = DefaultsForUserOp
): UserOperation {
    const partial: any = { ...op }
    // we want "item:undefined" to be used from defaults, and not override defaults, so we must explicitly
    // remove those so "merge" will succeed.
    for (const key in partial) {
        if (partial[key] == null) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete partial[key]
        }
    }
    const filled = { ...defaults, ...partial }
    return filled
}

// helper to fill structure:
// - default callGasLimit to estimate call from entryPoint to account (TODO: add overhead)
// if there is initCode:
//  - calculate sender by eth_call the deployment code
//  - default verificationGasLimit estimateGas of deployment code plus default 100000
// no initCode:
//  - update nonce from account.nonce()
// entryPoint param is only required to fill in "sender address when specifying "initCode"
// nonce: assume contract as "nonce()" function, and fill in.
// sender - only in case of construction: fill sender from initCode.
// callGasLimit: VERY crude estimation (by estimating call to account, and add rough entryPoint overhead
// verificationGasLimit: hard-code default at 100k. should add "create2" cost
export async function fillUserOp(
    op: Partial<UserOperation>,
    entryPoint?: EntryPoint
): Promise<UserOperation> {
    const op1 = { ...op }
    const provider = entryPoint?.provider
    if (op.initCode != null) {
        const initAddr = hexDataSlice(op1.initCode!, 0, 20)
        const initCallData = hexDataSlice(op1.initCode!, 20)
        if (op1.nonce == null) op1.nonce = 0
        if (op1.sender == null) {
            if (provider == null) throw new Error("no entrypoint/provider")
            op1.sender = await entryPoint!.callStatic
                .getSenderAddress(op1.initCode!)
                .catch((e) => e.errorArgs.sender)
        }
        if (op1.verificationGasLimit == null) {
            if (provider == null) throw new Error("no entrypoint/provider")
            const initEstimate = await provider.estimateGas({
                from: entryPoint?.address,
                to: initAddr,
                data: initCallData,
                gasLimit: 10e6,
            })
            op1.verificationGasLimit = BigNumber.from(DefaultsForUserOp.verificationGasLimit).add(
                initEstimate
            )
        }
    }
    if (op1.nonce == null) {
        if (provider == null) throw new Error("must have entryPoint to autofill nonce")
        const c = new Contract(op.sender!, ["function getNonce() view returns(uint256)"], provider)
        op1.nonce = await c.getNonce().catch(rethrow())
    }
    if (op1.callGasLimit == null && op.callData != null) {
        if (provider == null) throw new Error("must have entryPoint for callGasLimit estimate")
        const gasEtimated = await provider.estimateGas({
            from: entryPoint?.address,
            to: op1.sender,
            data: op1.callData,
        })

        // console.log('estim', op1.sender,'len=', op1.callData!.length, 'res=', gasEtimated)
        // estimateGas assumes direct call from entryPoint. add wrapper cost.
        op1.callGasLimit = gasEtimated // .add(55000)
    }
    if (op1.maxFeePerGas == null) {
        if (provider == null) throw new Error("must have entryPoint to autofill maxFeePerGas")
        const block = await provider.getBlock("latest")
        const baseFeePerGas = block.baseFeePerGas ? block.baseFeePerGas : BigNumber.from(0)
        op1.maxFeePerGas = baseFeePerGas.add(
            op1.maxPriorityFeePerGas ?? DefaultsForUserOp.maxPriorityFeePerGas
        )
    }
    // TODO: this is exactly what fillUserOp below should do - but it doesn't.
    // adding this manually
    if (op1.maxPriorityFeePerGas == null) {
        op1.maxPriorityFeePerGas = DefaultsForUserOp.maxPriorityFeePerGas
    }
    const op2 = fillUserOpDefaults(op1)
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    if (op2.preVerificationGas.toString() === "0") {
        // TODO: we don't add overhead, which is ~21000 for a single TX, but much lower in a batch.
        op2.preVerificationGas = callDataCost(packUserOp(op2, false))
    }
    return op2
}

export function deepHexlify(obj: any): any {
    if (typeof obj === "function") {
        return undefined
    }
    if (obj == null || typeof obj === "string" || typeof obj === "boolean") {
        return obj
    } else if (obj._isBigNumber != null || typeof obj !== "object") {
        return hexlify(obj).replace(/^0x0/, "0x")
    }
    if (Array.isArray(obj)) {
        return obj.map((member) => deepHexlify(member))
    }
    return Object.keys(obj).reduce(
        (set, key) => ({
            ...set,
            [key]: deepHexlify(obj[key]),
        }),
        {}
    )
}
