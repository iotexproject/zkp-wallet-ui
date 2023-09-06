import { observer } from "mobx-react-lite";
import { useStore } from "../store";
import { useEffect } from "react";
import { Email } from "./Email";

export const Account = observer(() => {
    const { base } = useStore();

    useEffect(() => {
        base.fillAccount()
        setInterval(async () => await base.fillAccount(), 5000)
    }, [])

    return (
        base.showEmail? <Email />:
        <div className="text-gray-700 text-base">
            <div className="text-1xl">
                <div>Account name: {base.account.username}.zkwallets.io</div>
                <div>Account minted: {base.account.created?'True':'False'}</div>
                <div>Account address: <a target="_blank" href={"https://testnet.iotexscan.io/address/"+base.account.address}>{base.account.address}</a></div>
                <div>Account balance: {base.account.balance} IOTX</div>
                <div>Recovery email: {base.account.guarded?'Set':'Not Set'}</div>
                <div>Minted NFT amount: {base.account.nft}</div>
                {base.disableButton? (
                        <button
                            type="button" disabled
                            className="flex mt-10 w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >Mint
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="flex mt-10 w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            onClick={() => base.mint()}
                        >Mint an NFT
                        </button>
                    )
                }
                {base.account.created?
                    <button
                        type="button"
                        className="flex mt-10 w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        onClick={() => base.openEmailGuardian()}
                    >{base.account.guarded?'Change Recovery Email':'Add Recovery Email'}
                    </button>
                    : null
                }
                
                <button
                    type="button"
                    className="flex mt-10 w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={() => base.disconnect()}
                >Disconnect
                </button>
            </div>
        </div>
    )
})
