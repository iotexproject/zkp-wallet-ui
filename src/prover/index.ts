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
