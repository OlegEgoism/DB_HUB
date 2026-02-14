// frontend/src/app/layout/base-layout.tsx

import {Outlet} from "react-router";
import {Header} from "@widgets/header"
import {Footer} from "@widgets/footer";

import '@shared/config'
import '@app/styles/App.scss'


export default function BaseLayout() {
    return (
        <>
            <Header/>
            <main className={'main'}>
                <Outlet/>
            </main>
            <Footer/>
        </>

    );
}