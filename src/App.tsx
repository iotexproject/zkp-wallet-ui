import { observer } from "mobx-react-lite";
import { useStore } from "./store";
import { Login } from "./components/Login";
import { NFTInfo } from "./components/NFTInfo";
import { Account } from "./components/Account";

export const App = observer(() => {
    const { base } = useStore();

    return (
        <div className="bg-white">
            <div className="pt-6">
                <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-3 lg:grid-rows-[auto,auto,1fr] lg:gap-x-8 lg:px-8 lg:pb-24 lg:pt-16">
                    <div className="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8 pb-10">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                            Introducing ZKP wallet NFT
                        </h1>
                    </div>
                    <div className="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8">
                        <img
                            src="https://images.ctfassets.net/0idwgenf7ije/1nZPLIuyqGxAyoPN4b4nFY/b1c977b8d34c15532f432d9ba9250fc1/Gemini-Zcash_Leads_the_Way_on_Zero-Knowledge_Proofs_With_zk-SNARKs.png"
                            alt=""
                            className="object-cover object-center"
                        />
                    </div>
                    <div className="mt-4 lg:row-span-3 lg:mt-0">
                        <NFTInfo />
                        {base.isLogin ? <Account /> : <Login />}
                    </div>
                </div>
                {
                    base.info.show? (
                        <div className="mx-auto max-w-7xl">
                            <p className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4">{base.info.text}</p>
                        </div>
                    ): null
                }
            </div>
        </div>
    )
})

export default App;
