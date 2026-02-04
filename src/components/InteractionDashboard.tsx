"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import InteractionChart from './InteractionChart';
import MeetingMap from './MeetingMap';
import { MapPin, TrendingUp, Users as UsersIcon, Star, Filter, Loader2 } from 'lucide-react';
import { User, Event } from '@/types';

const InteractionDashboard = ({ groupId }: { groupId: string }) => {
    const [selectedYear, setSelectedYear] = useState<string>('All');
    const [users, setUsers] = useState<User[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch group members' profiles
                const { data: groupMembers } = await supabase
                    .from('group_members')
                    .select('profiles(*)')
                    .eq('group_id', groupId);

                const profileData = (groupMembers?.map(m => Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as any[]).filter(Boolean);
                setUsers(profileData);

                // Fetch meetings for THIS group
                const { data: meetingData } = await supabase
                    .from('meetings')
                    .select('*')
                    .eq('group_id', groupId);
                setEvents(meetingData || []);

                // Fetch participants for these meetings
                if (meetingData && meetingData.length > 0) {
                    const meetingIds = meetingData.map(m => m.id);
                    const { data: participantData } = await supabase
                        .from('meeting_participants')
                        .select('*')
                        .in('meeting_id', meetingIds);
                    setParticipants(participantData || []);
                } else {
                    setParticipants([]);
                }

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [groupId]);

    const filteredEvents = useMemo(() => {
        if (selectedYear === 'All') return events;
        return events.filter(e => e.date.startsWith(selectedYear));
    }, [selectedYear, events]);

    const getInteractionCount = (userA: string, userB: string) => {
        if (userA === userB) return null;

        let count = 0;
        filteredEvents.forEach(event => {
            const eventParticipants = participants
                .filter(p => p.meeting_id === event.id)
                .map(p => p.user_id);

            if (eventParticipants.includes(userA) && eventParticipants.includes(userB)) {
                count++;
            }
        });
        return count;
    };

    const fullGroupMeetups = filteredEvents.filter(event => {
        const eventParticipants = participants.filter(p => p.meeting_id === event.id);
        return users.length > 0 && eventParticipants.length === users.length;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-4">
                <Loader2 className="animate-spin" size={32} />
                <p className="font-bold uppercase tracking-widest text-xs">Syncing with Supabase...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Header with Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm">
                <div>
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Social Insights Dashboard</h2>
                    <p className="text-slate-400">Connected to your real-time friendship network.</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                    <Filter size={18} className="ml-3 text-slate-500" />
                    {['2023', '2024', '2025', 'All'].map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${selectedYear === year
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>

            {/* Empty State Check */}
            {events.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 p-20 rounded-[3rem] text-center border-dashed">
                    <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-500">
                        <TrendingUp size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">The database is currently quiet.</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        Once you log your first reunion above, your interaction charts, heatmaps, and map pins will come to life here.
                    </p>
                </div>
            ) : (
                <>
                    {/* Hero Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <StatCard icon={<UsersIcon className="text-blue-400" />} label="Total Network" value={users.length.toString()} />
                        <StatCard icon={<TrendingUp className="text-green-400" />} label="Logs in {selectedYear}" value={filteredEvents.length.toString()} />
                        <StatCard icon={<Star className="text-yellow-400" />} label="Full Reunions" value={fullGroupMeetups.length.toString()} />
                        <StatCard icon={<MapPin className="text-purple-400" />} label="Global Pins" value={events.length.toString()} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-500" /> Interaction Trends
                            </h3>
                            <InteractionChart year={selectedYear} data={filteredEvents} />
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <MapPin size={20} className="text-red-500" /> Geography of Friendships
                            </h3>
                            <MeetingMap year={selectedYear} data={filteredEvents} />
                        </div>
                    </div>

                    {/* Recent Memories Gallery */}
                    {filteredEvents.some(e => e.media_url) && (
                        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[3rem] overflow-hidden">
                            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                                <Star size={20} className="text-yellow-500" /> Captured Moments
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredEvents.filter(e => e.media_url).slice(0, 8).map(event => (
                                    <div key={event.id} className="group relative aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 hover:border-blue-500/50 transition-all">
                                        <img src={event.media_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                            <p className="text-[10px] font-black text-white uppercase tracking-wider mb-1">{event.title}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(event.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Interaction Matrix */}
                    {users.length > 0 && (
                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl overflow-hidden">
                            <h3 className="text-xl font-bold text-white mb-8">Social Interaction Matrix</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr>
                                            <th className="p-4"></th>
                                            {users.map(user => (
                                                <th key={user.id} className="p-4 text-center">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 mx-auto mb-2 border-2 border-slate-700 flex items-center justify-center font-black text-slate-500 text-xs uppercase">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user.name.split(' ')[0]}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(rowUser => (
                                            <tr key={rowUser.id} className="border-t border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                <td className="p-4 font-bold text-white text-sm">{rowUser.name}</td>
                                                {users.map(colUser => {
                                                    const count = getInteractionCount(rowUser.id, colUser.id);
                                                    return (
                                                        <td key={colUser.id} className="p-4 text-center">
                                                            <div className={`
                                                                w-12 h-12 mx-auto rounded-2xl flex items-center justify-center font-black text-lg transition-all
                                                                ${count === null ? 'bg-slate-950/30 text-slate-800' :
                                                                    count > 0 ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-950 text-slate-900'
                                                                }
                                                            `}>
                                                                {count !== null ? count : '-'}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center gap-5">
        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-xl">
            {icon}
        </div>
        <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-black text-white">{value}</p>
        </div>
    </div>
);

export default InteractionDashboard;
