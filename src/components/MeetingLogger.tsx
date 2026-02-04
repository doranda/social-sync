"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Calendar, MapPin, Users as UsersIcon, Camera, Plus, Check, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/imageUtils';

const MeetingLogger = ({ groupId, onSave }: { groupId: string, onSave?: () => void }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            // Fetch all members of the CURRENT group
            const { data: groupMembers } = await supabase
                .from('group_members')
                .select('user_id, profiles(*)')
                .eq('group_id', groupId);

            if (groupMembers) {
                const members = (groupMembers.map(m => m.profiles) as any[]).filter(Boolean);
                setAvailableUsers(members || []);
            }
        };
        checkUser();
    }, [groupId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAutoLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setCoords({ lat: latitude, lng: longitude });

            try {
                // Using Nominatim for free reverse geocoding
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await res.json();
                if (data.display_name) {
                    // Extract a shorter version of the address
                    const parts = data.display_name.split(',');
                    const shortAddress = parts.slice(0, 3).join(',');
                    setLocation(shortAddress);
                } else {
                    setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                }
            } catch (err) {
                console.error("Geocoding error:", err);
                setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            } finally {
                setIsLocating(false);
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Could not get your location. Please check browser permissions.");
            setIsLocating(false);
        });
    };

    const toggleMember = (id: string) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(selectedMembers.filter(m => m !== id));
        } else {
            setSelectedMembers([...selectedMembers, id]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Please sign in to log a meeting!");
            return;
        }

        setIsSaving(true);
        try {
            let mediaUrl = '';

            // 0. Upload Media if exists
            if (mediaFile) {
                const isImage = mediaFile.type.startsWith('image/');
                let uploadData: File | Blob = mediaFile;
                let fileExt = mediaFile.name.split('.').pop();

                if (isImage) {
                    try {
                        uploadData = await compressImage(mediaFile);
                        fileExt = 'webp'; // Converted to WebP
                    } catch (err) {
                        console.error('Compression failed, uploading original:', err);
                    }
                }

                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${currentUser.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('meeting_media')
                    .upload(filePath, uploadData);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('meeting_media')
                    .getPublicUrl(filePath);

                mediaUrl = publicUrl;
            }

            // 1. Insert Meeting
            const { data: meeting, error: meetingError } = await supabase
                .from('meetings')
                .insert([{
                    group_id: groupId,
                    created_by: currentUser.id,
                    title,
                    date,
                    location,
                    latitude: coords?.lat || 40.7128,
                    longitude: coords?.lng || -74.0060,
                    media_url: mediaUrl
                }])
                .select()
                .single();

            if (meetingError) throw meetingError;

            // 2. Insert Participants
            const participantData = selectedMembers.map(userId => ({
                meeting_id: meeting.id,
                user_id: userId
            }));

            const { error: participantError } = await supabase
                .from('meeting_participants')
                .insert(participantData);

            if (participantError) throw participantError;

            alert("Memory Saved Successfully to your Cloud Database!");
            setTitle(''); setDate(''); setLocation(''); setSelectedMembers([]); setMediaFile(null); setMediaPreview(null);
            if (onSave) onSave(); // Refresh data without reload
        } catch (error: any) {
            console.error("Save error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!currentUser) return null;

    return (
        <section className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none hidden md:block">
                <UsersIcon size={80} />
            </div>

            <div className="mb-8 md:mb-10 relative">
                <h3 className="text-xl md:text-2xl font-black text-white mb-2 ml-1">Log Real Reunion</h3>
                <p className="text-slate-500 text-sm md:text-base font-medium ml-1">Storing your memories permanently in Supabase.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputGroup label="Memory Title" icon={<Calendar size={18} />}>
                        <input
                            type="text"
                            placeholder="Dinner at Joe's"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                            required
                        />
                    </InputGroup>
                    <InputGroup label="Date" icon={<Calendar size={18} />}>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none transition-all"
                            required
                        />
                    </InputGroup>
                    <InputGroup label="Location" icon={<MapPin size={18} />}>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Manhattan, NY"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 pr-16 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                                required
                            />
                            <button
                                type="button"
                                onClick={handleAutoLocation}
                                disabled={isLocating}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-blue-500 transition-all disabled:opacity-50"
                                title="Use current location"
                            >
                                {isLocating ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
                            </button>
                        </div>
                    </InputGroup>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block ml-1">Who participated?</label>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                        {availableUsers.length > 0 ? availableUsers.map(user => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => toggleMember(user.id)}
                                className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 rounded-xl md:rounded-2xl border-2 transition-all ${selectedMembers.includes(user.id)
                                    ? 'border-blue-500 bg-blue-500/10 text-white'
                                    : 'border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700'
                                    }`}
                            >
                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[8px] md:text-[10px] shrink-0">
                                    {selectedMembers.includes(user.id) ? <Check size={10} /> : (user?.name?.charAt(0) || '?')}
                                </div>
                                <span className="text-[10px] md:text-xs font-bold truncate">{user?.name || 'Unknown'}</span>
                            </button>
                        )) : (
                            <p className="text-slate-600 text-[10px] md:text-xs italic p-4 bg-slate-950 w-full rounded-2xl border border-slate-800">
                                No other users found. Invite your friends to sign up!
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block ml-1">Attach Media (Photo/Video)</label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4 md:gap-6">
                        <label className="w-full sm:w-32 h-32 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-900 transition-all group shrink-0">
                            <Camera className="text-slate-700 group-hover:text-blue-500 mb-2" size={24} />
                            <span className="text-[10px] font-bold text-slate-700 group-hover:text-white uppercase tracking-widest">Upload</span>
                            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                        </label>

                        {mediaPreview && (
                            <div className="relative w-full h-32 bg-slate-950 rounded-2xl md:rounded-3xl overflow-hidden border border-slate-800 flex-1">
                                {mediaFile?.type.startsWith('video') ? (
                                    <video src={mediaPreview} className="w-full h-full object-cover opacity-50" />
                                ) : (
                                    <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover opacity-50" />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center px-4">
                                    <span className="text-[8px] md:text-[10px] font-black text-blue-500 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 uppercase tracking-[0.2em] backdrop-blur-md text-center">File Ready to Sync</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                                    className="absolute top-3 right-3 w-8 h-8 bg-slate-900/80 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/20 transition-all"
                                >
                                    <Plus className="rotate-45" size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-slate-800">
                    <button
                        type="submit"
                        disabled={isSaving || !title || !date || !location || selectedMembers.length === 0}
                        className="w-full sm:w-auto bg-white text-black font-black uppercase tracking-[0.15em] px-12 py-4 md:py-5 rounded-xl md:rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : "Record Permanent Memory"}
                    </button>
                </div>
            </form>
        </section>
    );
};

const InputGroup = ({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="space-y-3">
        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
            {icon} {label}
        </label>
        {children}
    </div>
);

export default MeetingLogger;
