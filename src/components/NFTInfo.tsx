import { observer } from "mobx-react-lite"
import { useStore } from "../store"
import { useEffect } from "react"

export const NFTInfo = observer(() => {
    const { base } = useStore()

    useEffect(() => {
        base.fetchMintedNFT()
    })
    setInterval(() => base.fetchMintedNFT(), 1000)

    return (
        <div className="text-1xl font-bold pb-10 text-gray-900">
            {base.minted} / 20000 minted
        </div>
    )
})
