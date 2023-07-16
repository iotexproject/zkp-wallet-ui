import { observer } from "mobx-react-lite";
import { useStore } from "../store";

export const Login = observer(() => {
    const { base } = useStore();

    return (
        <div>
            <form className="space-y-6" action="#" method="POST">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-900">Account
                        name</label>
                    <div className="mt-2">
                        <div
                            className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                            <input onChange={e => {
                                base.username = e.target.value
                            }} type="text" name="username" id="username" autoComplete="username"
                                className="block flex-1 border-0 bg-transparent py-1.5 pl-2 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                                placeholder="test"></input>
                            <span
                                className="flex select-none items-center pr-2 text-gray-500 sm:text-sm">.zwallet.io</span>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="password"
                            className="block text-sm font-medium leading-6 text-gray-900">Password</label>
                    </div>
                    <div className="mt-2">
                        <input onChange={e => {
                            base.password = e.target.value
                        }} id="password" name="password" type="password" autoComplete="current-password"
                            required
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 pl-2 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                    </div>
                </div>
                <div>
                    {base.disableButton? (
                            <button
                                type="button" disabled
                                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >Login
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                onClick={() => base.login()}
                            >Login
                            </button>
                        )
                    }
                </div>
            </form>
        </div>
    )
})
