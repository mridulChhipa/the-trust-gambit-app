// src/app/rate-domains/page.js
import { redirect } from 'next/navigation';
import RatingForm from './RatingForm';
import { getServerSupabaseClient } from '@/lib/supabase/server';

async function getPageData() {
    const supabase = await getServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return { user: null, domains: [], existingRatings: [] };
    }

    // Fetch all available domains
    const { data: domains, error: domainsError } = await supabase
        .from('domains')
        .select('*');

    // Fetch ratings this user has already submitted
    const { data: existingRatings, error: ratingsError } = await supabase
        .from('player_ratings')
        .select('domain_id, rating, justification')
    .eq('profile_id', user.id);

    if (domainsError || ratingsError) {
        console.error('Error fetching data:', domainsError || ratingsError);
    }

    return {
        user,
        domains: domains || [],
        existingRatings: existingRatings || [],
    };
}

export default async function RateDomainsPage() {
    const { user, domains, existingRatings } = await getPageData();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 px-4 py-12 text-white">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row">
                <section className="flex flex-1 flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
                    <div className="space-y-5">
                        <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                            Signal your strengths
                        </span>
                        <h1 className="text-4xl font-bold leading-tight">Help teammates delegate smarter.</h1>
                        <p className="text-sm text-white/70">
                            Rate your capability across every domain. Your scores power lobby assignments and trust cues so partners know exactly when to pass you the baton.
                        </p>
                    </div>
                    <div className="grid gap-4 text-sm text-white/80 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Transparency</p>
                            <p className="mt-2 font-semibold">Ratings visible to your lobby and admins</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Context</p>
                            <p className="mt-2 font-semibold">Justifications surface alongside your score</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Flexibility</p>
                            <p className="mt-2 font-semibold">Adjust before each season or game reset</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Impact</p>
                            <p className="mt-2 font-semibold">High ratings boost your delegation credibility</p>
                        </div>
                    </div>
                </section>

                <section className="flex flex-1 rounded-3xl border border-white/15 bg-white/95 p-8 text-slate-900 shadow-2xl">
                    <RatingForm domains={domains} existingRatings={existingRatings} userId={user.id} />
                </section>
            </div>
        </div>
    );
}