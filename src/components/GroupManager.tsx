"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Users as UsersIcon, Plus, UserPlus, Copy, Check, Loader2, Sparkles, Settings2, Trash2, LogOut } from 'lucide-react';

const GroupManager = ({ activeGroupId, onGroupSync }: { activeGroupId: string | null, onGroupSync: (id?: string) => void }) => {
    const [currentGroup, setCurrentGroup] = useState<any>(null);
    const [myGroups, setMyGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState<'none' | 'create' | 'join'>('none');
    const [manageMode, setManageMode] = useState(false);

    const [groupName, setGroupName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeGroupId]);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: memberships } = await supabase
            .from('group_members')
            .select('group_id, groups(*)')
            .eq('user_id', user.id);

        if (memberships) {
            let groups = memberships.map(m => Array.isArray(m.groups) ? m.groups[0] : m.groups).filter(Boolean);

            // Sort: Active group first
            if (activeGroupId && groups.length > 0) {
                groups = [
                    ...groups.filter(g => g.id === activeGroupId),
                    ...groups.filter(g => g.id !== activeGroupId)
                ];
            }

            setMyGroups(groups);

            if (activeGroupId) {
                const active = groups.find(g => g.id === activeGroupId);
                setCurrentGroup(active || groups[0]);
            } else if (groups.length > 0) {
                setCurrentGroup(groups[0]);
                onGroupSync(groups[0].id);
            } else {
                setCurrentGroup(null);
            }
        }
        setLoading(false);
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        try {
            const { data: group, error: groupErr } = await supabase
                .from('groups')
                .insert([{ name: groupName, created_by: user?.id }])
                .select()
                .single();

            if (groupErr) throw groupErr;

            const { error: memberErr } = await supabase
                .from('group_members')
                .insert([{ group_id: group.id, user_id: user?.id }]);

            if (memberErr) throw memberErr;

            setGroupName('');
            setAction('none');
            onGroupSync(group.id);
            alert(`Group "${groupName}" created!`);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        try {
            const { data: group, error: groupErr } = await supabase
                .from('groups')
                .select('*')
                .eq('invite_code', inviteCode.trim())
                .single();

            if (groupErr || !group) throw new Error("Invalid invite code.");

            const { error: memberErr } = await supabase
                .from('group_members')
                .insert([{ group_id: group.id, user_id: user?.id }]);

            if (memberErr) throw memberErr;

            setInviteCode('');
            setAction('none');
            onGroupSync(group.id);
            alert(`Successfully joined "${group.name}"!`);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const copyInviteCode = () => {
        if (!currentGroup) return;
        navigator.clipboard.writeText(currentGroup.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchEmail.trim()) return;
        setInviting(true);

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, name')
                .eq('email', searchEmail.trim().toLowerCase())
                .maybeSingle();

            if (profile) {
                const { error: inviteErr } = await supabase
                    .from('group_members')
                    .insert([{ group_id: currentGroup.id, user_id: profile.id }]);

                if (inviteErr) throw inviteErr;
                alert(`Added ${profile.name || searchEmail} to the group!`);
            } else {
                const confirmed = confirm(`No user found with email "${searchEmail}". Copy external invite link?`);
                if (confirmed) {
                    const shareLink = `${window.location.origin}/auth?join=${currentGroup.invite_code}`;
                    navigator.clipboard.writeText(shareLink);
                    alert("Invite link copied!");
                }
            }
            setSearchEmail('');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setInviting(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!currentGroup || !confirm("Are you sure you want to leave this circle?")) return;
        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', currentGroup.id)
                .eq('user_id', user?.id);

            if (error) throw error;

            alert("You have left the circle.");
            const remainingGroups = myGroups.filter(g => g.id !== currentGroup.id);
            setMyGroups(remainingGroups);
            if (remainingGroups.length > 0) {
                onGroupSync(remainingGroups[0].id);
            } else {
                setCurrentGroup(null);
                onGroupSync(undefined);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!currentGroup || !confirm("DANGER: This will delete the circle and ALL its data permanently. Continue?")) return;
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', currentGroup.id);

            if (error) throw error;

            alert("Circle deleted successfully.");
            const remainingGroups = myGroups.filter(g => g.id !== currentGroup.id);
            setMyGroups(remainingGroups);
            if (remainingGroups.length > 0) {
                onGroupSync(remainingGroups[0].id);
            } else {
                setCurrentGroup(null);
                onGroupSync(undefined);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" />
        </div>
    );

    if (!currentGroup && action === 'none') {
        return (
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl text-center">
                <UsersIcon className="mx-auto mb-6 text-blue-500" size={48} />
                <h3 className="text-xl md:text-2xl font-black text-white mb-2">No Circle Found</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">SocialSync works best in groups. Start one or join your friends.</p>
                <div className="flex gap-4 justify-center">
                    <button onClick={() => setAction('create')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs">Create</button>
                    <button onClick={() => setAction('join')} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs">Join</button>
                </div>
            </div>
        );
    }

    if (action === 'create' || action === 'join') {
        return (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] max-w-md mx-auto relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                        {action === 'create' ? 'Start a New Circle' : 'Join a Circle'}
                    </h3>
                    <button onClick={() => setAction('none')} className="text-slate-500 hover:text-white font-bold text-xs uppercase tracking-widest">Close</button>
                </div>

                {action === 'create' ? (
                    <form onSubmit={handleCreateGroup} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Circle Name (e.g. Kyoto Crew)"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                            required
                        />
                        <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg shadow-blue-500/20">
                            {submitting ? <Loader2 className="animate-spin mx-auto" /> : 'Create Circle'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleJoinGroup} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Enter Invite Code"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none font-mono"
                            required
                        />
                        <button type="submit" disabled={submitting} className="w-full bg-purple-600 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg shadow-purple-500/20">
                            {submitting ? <Loader2 className="animate-spin mx-auto" /> : 'Join Circle'}
                        </button>
                    </form>
                )}
            </div>
        );
    }

    if (manageMode) {
        return (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center relative">
                <button onClick={() => setManageMode(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white font-bold text-xs uppercase tracking-widest">Close</button>
                <Settings2 className="text-slate-700 mb-4" size={48} />
                <h3 className="text-xl font-black text-white mb-2">Manage: {currentGroup?.name}</h3>

                <div className="flex flex-col gap-4 w-full max-w-xs mt-6">
                    <button onClick={() => { setAction('create'); setManageMode(false); }} className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-black uppercase text-slate-400 hover:text-white transition-all">
                        <Plus size={14} /> Create New Circle
                    </button>
                    <button onClick={() => { setAction('join'); setManageMode(false); }} className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-black uppercase text-slate-400 hover:text-white transition-all">
                        <UserPlus size={14} /> Join Existing Circle
                    </button>

                    <div className="h-px bg-slate-800 my-2" />

                    {currentGroup && (
                        <>
                            {currentGroup.created_by && (
                                <button
                                    onClick={handleDeleteGroup}
                                    className="flex items-center justify-center gap-2 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-black uppercase text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <Trash2 size={14} /> Delete This Circle
                                </button>
                            )}

                            <button
                                onClick={handleLeaveGroup}
                                className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 rounded-xl text-xs font-black uppercase text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                            >
                                <LogOut size={14} /> Leave Circle
                            </button>
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Active Group Header Display */}
            <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600/10 rounded-xl md:rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 shrink-0">
                        <Sparkles size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Active Circle</p>
                            <button onClick={() => setManageMode(true)} className="text-slate-600 hover:text-blue-500 transition-colors">
                                <Settings2 size={12} />
                            </button>
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-white tracking-tight truncate">{currentGroup?.name}</h3>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6 w-full md:w-auto">
                    <form onSubmit={handleInviteUser} className="flex items-center gap-2 group/search w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-hover/search:text-blue-500 transition-colors" size={16} />
                            <input
                                type="email"
                                placeholder="Invite via email..."
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 md:py-3 text-[10px] md:text-xs text-white focus:border-blue-500 outline-none w-full sm:w-48 lg:w-64 transition-all"
                            />
                        </div>
                        <button type="submit" disabled={inviting || !searchEmail} className="bg-blue-600 p-2.5 md:p-3 rounded-xl transition-all disabled:opacity-30">
                            {inviting ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                        </button>
                    </form>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 bg-slate-950/50 md:bg-transparent p-2 md:p-0 rounded-xl md:rounded-none">
                            <div className="flex flex-col items-start sm:items-end mr-2">
                                <p className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest">Invite Code</p>
                                <p className="text-[10px] md:text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">{currentGroup?.invite_code}</p>
                            </div>
                            <button onClick={copyInviteCode} className={`flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${copied ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Code</>}
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleLeaveGroup}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
                            >
                                <LogOut size={12} /> Leave
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create New Circle Button - Prominent & Separate */}
            <button
                onClick={() => setAction('create')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-5 rounded-[1.5rem] shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 transition-all group transform hover:scale-[1.01]"
            >
                <div className="bg-white/20 p-2 rounded-full">
                    <Plus size={24} className="text-white" />
                </div>
                <div className="text-left">
                    <span className="block text-lg font-black tracking-tight">Create a New Circle</span>
                    <span className="block text-[10px] font-medium text-blue-100 uppercase tracking-widest">Start a fresh group for your squad</span>
                </div>
            </button>

            {/* List of Existing Circles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myGroups.map((group) => (
                    <button
                        key={group.id}
                        onClick={() => onGroupSync(group.id)}
                        className={`p-6 rounded-[2rem] border transition-all text-left relative overflow-hidden group ${activeGroupId === group.id
                            ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/20'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            }`}
                    >
                        <Sparkles className={`mb-3 ${activeGroupId === group.id ? 'text-white' : 'text-blue-500 opacity-50'}`} size={24} />
                        <h4 className={`text-lg font-black tracking-tight ${activeGroupId === group.id ? 'text-white' : 'text-slate-200'}`}>{group.name}</h4>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${activeGroupId === group.id ? 'text-blue-200' : 'text-slate-500'}`}>
                            {activeGroupId === group.id ? 'Active Circle' : 'Switch'}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default GroupManager;
