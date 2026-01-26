import { Outlet } from "react-router";
import { Header } from "@widgets/header"

import '@shared/config'
import '@app/styles/App.scss'



export default function BaseLayout() {
    return (
        <>
            <Header />
            <main className={'main'}>
                <Outlet />
            </main>
        </>

    );
}