import { observer } from "mobx-react-lite";
import { useStore } from "../store";

export const Email = observer(() => {
    const { base } = useStore();

    return (
        <div className="text-gray-700 text-base">
            <form className="space-y-6" action="#" method="POST">
                <div><b>Account name</b>: {base.account.username}.zkwallets.io</div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">New Recovery Email</label>
                    <div className="mt-2">
                        <input onChange={e => {
                            base.email = e.target.value
                        }} id="email" name="email" type="input"
                            required
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 pl-2 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                    </div>
                    {base.disableButton?
                    <button
                        type="button" disabled
                        className="flex mt-10 w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >{base.account.guarded?'Change':'Add'}
                    </button> : 
                    <button
                        type="button"
                        className="flex mt-10 w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        onClick={() => base.addEmailGuardian()}
                    >{base.account.guarded?'Change':'Add'}
                    </button>}
                </div>
            </form>
        </div>
    )
})
