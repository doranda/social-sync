"use client";

import Sidebar from "@/components/Sidebar";
import ProfileEditor from "@/components/ProfileEditor";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Settings } from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                router.push('/auth');
            } else {
                setSession(currentSession);
                setLoading(false);
            }
        };
        checkAuth();
    }, [router]);

    if (loading || !session) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-50">
            <Sidebar />
            <div className="pl-64">
                <header className="h-20 border-b border-slate-800 flex items-center px-10 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Settings size={18} />
                        <h2 className="font-semibold text-white">Account Settings</h2>
                    </div>
                </header>

                <div className="p-10 max-w-4xl mx-auto">
                    <div className="mb-10">
                        <h1 className="text-4xl font-black text-white mb-2">Member Profile</h1>
                        <p className="text-slate-500 font-medium">This information is shared with your friend groups.</p>
                    </div>

                    <ProfileEditor />
                </div>
            </div>
        </main>
    );
}
