"use client";

import React from 'react';
import { Home, Users, Calendar, BarChart2, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MobileNav = () => {
    const pathname = usePathname();

    const navItems = [
        { href: '/', icon: <Home size={20} />, label: 'Home' },
        { href: '/groups', icon: <Users size={20} />, label: 'Circle' },
        { href: '/meetings', icon: <Calendar size={20} />, label: 'Logs' },
        { href: '/analytics', icon: <BarChart2 size={20} />, label: 'Data' },
        { href: '/profile', icon: <Settings size={20} />, label: 'You' },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 px-6 py-3 z-50 flex items-center justify-between">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 group">
                        <div className={`
                            p-2 rounded-xl transition-all duration-300
                            ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110' : 'text-slate-500 group-hover:text-slate-300'}
                        `}>
                            {item.icon}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-tighter ${isActive ? 'text-white' : 'text-slate-600'}`}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </div>
    );
};

export default MobileNav;
