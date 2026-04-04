// frontend/src/app/layout/base-layout.tsx

import {useEffect} from "react";
import {Outlet, useNavigate} from "react-router";
import {Header} from "@widgets/header"
import {Footer} from "@widgets/footer";
import {useSession} from "@features/auth";
import {ROUTES} from "@shared/config";

import '@shared/config'


export default function BaseLayout() {
    const navigate = useNavigate();
    const {validateSession} = useSession();

    useEffect(() => {
        let destroyed = false;

        const check = async () => {
            const isValid = await validateSession();
            if (!isValid && !destroyed) {
                navigate(ROUTES.LOGIN);
            }
        };

        void check();

        const intervalId = window.setInterval(() => {
            void check();
        }, 15000);

        const onFocus = () => {
            void check();
        };

        window.addEventListener('focus', onFocus);

        return () => {
            destroyed = true;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', onFocus);
        };
    }, [navigate, validateSession]);

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
