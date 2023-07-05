import { observer } from "mobx-react-lite";
import { useStore } from "../store";
import { useEffect } from "react";

export const Account = observer(() => {
    const { base } = useStore();

    useEffect(() => {
        base.fillAccount()
    })
    setInterval(() => base.fillAccount(), 1000)

    return (
        <div className="text-gray-700 text-base">
            <div className="text-1xl">
                <div>Account name: {base.account.username}.zkwallet.io</div>
                <div>Account address: {base.account.address}</div>
                <div>Account balance: {base.account.balance} IOTX</div>
                <div>NFT amount: {base.account.nft}</div>
            </div>
        </div>
    )
})
