"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Bell, Check, Trash2, Loader2, MessageCircle, Heart, Zap, UserPlus } from 'lucide-react';

interface Notification {
    id: string;
    type: 'comment' | 'reaction' | 'badge' | 'meeting';
    title: string;
    content: string;
    is_read: boolean;
    link?: string;
    created_at: string;
}

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
            if (user) {
                fetchNotifications(user.id);
                subscribeToNotifications(user.id);
            }
        };
        fetchUser();
    }, []);

    const fetchNotifications = async (userId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) setNotifications(data);
        setLoading(false);
    };

    const subscribeToNotifications = (userId: string) => {
        const channel = supabase
            .channel(`notifications-${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                setNotifications(prev => [payload.new as Notification, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    };

    const markAllAsRead = async () => {
        if (!currentUser) return;
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    const deleteNotification = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'comment': return <MessageCircle size={14} className="text-blue-500" />;
            case 'reaction': return <Heart size={14} className="text-red-500" />;
            case 'badge': return <Zap size={14} className="text-amber-500" />;
            case 'meeting': return <UserPlus size={14} className="text-purple-500" />;
            default: return <Bell size={14} className="text-slate-500" />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all group"
            >
                <Bell size={20} className={`text-slate-400 group-hover:text-white ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-slate-950 shadow-lg">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Inbox</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-10 text-center">
                                <Loader2 className="animate-spin text-slate-700 mx-auto" size={24} />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-10 text-center">
                                <Bell className="text-slate-800 mx-auto mb-4" size={32} />
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">All caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/50">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`p-5 hover:bg-slate-800/30 transition-colors group/item ${!n.is_read ? 'bg-blue-500/5' : ''}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800">
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <p className={`text-xs font-black truncate ${!n.is_read ? 'text-white' : 'text-slate-400'}`}>
                                                        {n.title}
                                                    </p>
                                                    <span className="text-[8px] font-bold text-slate-600 uppercase whitespace-nowrap">
                                                        {new Date(n.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-3">
                                                    {n.content}
                                                </p>
                                                <div className="flex gap-3 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                    {!n.is_read && (
                                                        <button
                                                            onClick={() => markAsRead(n.id)}
                                                            className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 hover:text-blue-400"
                                                        >
                                                            <Check size={10} /> Read
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(n.id)}
                                                        className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1 hover:text-red-500"
                                                    >
                                                        <Trash2 size={10} /> Clear
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-center">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Syncing Real-time</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
