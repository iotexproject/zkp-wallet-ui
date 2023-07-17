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
                    {base.showRecovery?
                    <button
                        type="button"
                        className="flex mt-10 w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        onClick={() => base.generateRecovery()}
                    >Generate recovery message
                    </button> : null
                    }
                </div>
            </form>
            {base.showRecoveryMessage?
            <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                        <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">Recovery account</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500 overflow:scroll">{base.recoveryMessage}</p>
                        </div>
                        </div>
                    </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button type="button" onClick={() => base.closeRecoveryMessage()} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">Cancel</button>
                    </div>
                </div>
                </div>
            </div>
            : null}
        </div>
    )
})
