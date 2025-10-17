// src/components/auth/SignOutButton.js
'use client';

import { useTransition } from 'react';
import { signOutUser } from '../../app/actions';

export default function SignOutButton() {
    const [isPending, startTransition] = useTransition();

    const handleSignOut = () => {
        startTransition(async () => {
            await signOutUser();
        });
    };

    return (
        <button
            onClick={handleSignOut}
            disabled={isPending}
            className="group relative inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-md shadow-indigo-500/20 transition hover:-translate-y-[1px] hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {isPending ? (
                <>
                    <span className="flex h-5 w-5 items-center justify-center">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                    </span>
                    Signing out
                </>
            ) : (
                <>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 text-white shadow-sm shadow-indigo-500/30 transition group-hover:scale-105">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.8"
                            stroke="currentColor"
                            className="h-4 w-4"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m4.5-3H9m8.25-3.75L21 12l-3.75 3.75" />
                        </svg>
                    </span>
                    Sign out
                </>
            )}
        </button>
    );
}