import { observer } from "mobx-react-lite";
import { useStore } from "../store";

export const Account = observer(() => {
    const { base } = useStore();

    return (
        <div></div>
    )
})
