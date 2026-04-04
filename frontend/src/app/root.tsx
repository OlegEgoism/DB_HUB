/* eslint-disable react-refresh/only-export-components */
// frontend/src/app/root.tsx

import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "react-router";
import type { LinksFunction, MetaFunction } from "react-router";

import '@shared/styles/normalize.css';
import '@app/styles/App.scss';
import { LanguageProvider } from '@shared/i18n';

export const meta: MetaFunction = () => [
    { title: 'DB HUB' },
];

export const links: LinksFunction = () => [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
];

export function Layout({children}: { children: React.ReactNode }) {
    return (
        <html>
        <head>
            <meta charSet="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <Meta/>
            <Links/>
        </head>
        <body>
        {children}
        <ScrollRestoration/>
        <Scripts/>
        </body>
        </html>
    );
};

export default function App() {
    return (
        <LanguageProvider>
            <Outlet/>
        </LanguageProvider>
    );
}
