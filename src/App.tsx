import { prove } from "./prover"

export default function Home() {
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
                <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">Account name</label>
                <div className="mt-2">
                  <input id="name" name="name" type="text" autoComplete="name" required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">Password</label>
                </div>
                <div className="mt-2">
                  <input id="password" name="password" type="password" autoComplete="current-password" required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                </div>
              </div>
              <div>
                <button 
                  type="button"
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  onClick={async () => {
                    const proof = await prove(
                      BigInt(0),
                      BigInt(0),
                      BigInt(0),
                      "passport.wasm",
                      "passport_0001.zkey"
                    );
                    console.log(proof);
                  }}
                >Create wallet & Mint</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
