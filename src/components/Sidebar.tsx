"use client";

import React, { useState, useEffect } from 'react';
import { Users, Calendar, Home, BarChart2, LogOut, Loader2, Settings } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

const Sidebar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(profileData);
            }
        };
        getUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/auth');
    };

    return (
        <div className="w-64 bg-slate-900 h-screen text-white p-6 fixed left-0 top-0 border-r border-slate-800 flex flex-col">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-500/20 transform rotate-3">
                    <span className="text-white -rotate-3 text-lg">S</span>
                </div>
                <h1 className="text-2xl font-black tracking-tighter">SocialSync</h1>
            </div>

            <nav className="space-y-2 flex-1">
                <NavItem
                    href="/"
                    icon={<Home size={20} />}
                    label="Dashboard"
                    active={pathname === '/'}
                />
                <NavItem
                    href="/groups"
                    icon={<Users size={20} />}
                    label="My Circle"
                    active={pathname === '/groups'}
                />
                <NavItem
                    href="/meetings"
                    icon={<Calendar size={20} />}
                    label="Reunions"
                    active={pathname === '/meetings'}
                />
                <NavItem
                    href="/analytics"
                    icon={<BarChart2 size={20} />}
                    label="Analytics"
                    active={pathname === '/analytics'}
                />
                <NavItem
                    href="/profile"
                    icon={<Settings size={20} />}
                    label="Profile"
                    active={pathname === '/profile'}
                />
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-800 flex flex-col gap-4">
                {user ? (
                    <div className="flex items-center gap-3 p-2 bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-xs overflow-hidden shrink-0">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                (profile?.name || user.email)?.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 font-black uppercase truncate">Active Pilot</p>
                            <p className="text-xs font-bold text-white truncate">{profile?.name || user.email}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center py-2"><Loader2 className="animate-spin text-slate-600" size={16} /></div>
                )}

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-4 rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all font-black text-[10px] uppercase tracking-[0.2em]"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, href, active }: { icon: React.ReactNode, label: string, href: string, active: boolean }) => (
    <Link href={href}>
        <div className={`
            flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group
            ${active
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1'
                : 'text-slate-500 hover:bg-slate-800 hover:text-white hover:translate-x-1'
            }
        `}>
            <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                {icon}
            </div>
            <span className="font-bold text-xs uppercase tracking-widest">{label}</span>
        </div>
    </Link>
);

export default Sidebar;
