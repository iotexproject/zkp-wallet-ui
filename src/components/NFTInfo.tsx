import { observer } from "mobx-react-lite"
import { useStore } from "../store"
import { useEffect } from "react"

export const NFTInfo = observer(() => {
    const { base } = useStore()

    useEffect(() => {
        base.fetchMintedNFT()
        setInterval(async () => await base.fetchMintedNFT(), 5000)
    }, [])

    return (
        <div style={{marginBottom: 40}}>
        <h3 className="font-bold text-gray-900">
            {base.minted} / 20000
        </h3>
        <p className="text-gray-600">
        NFTs minted by all users
        </p>
        </div>
    )
})
