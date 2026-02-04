"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User, Phone, MapPin, AlignLeft, Camera, Check, Loader2, Save } from 'lucide-react';
import { compressImage } from '@/lib/imageUtils';

const ProfileEditor = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        name: '',
        phone: '',
        favorite_spot: '',
        bio: '',
        avatar_url: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            setProfile({
                name: data.name || '',
                phone: data.phone || '',
                favorite_spot: data.favorite_spot || '',
                bio: data.bio || '',
                avatar_url: data.avatar_url || ''
            });
        }
        setLoading(false);
    };

    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setProfile({ ...profile, avatar_url: URL.createObjectURL(file) });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            let avatarUrl = profile.avatar_url;

            if (avatarFile) {
                let uploadData: File | Blob = avatarFile;
                let fileExt = avatarFile.name.split('.').pop();

                try {
                    uploadData = await compressImage(avatarFile);
                    fileExt = 'webp';
                } catch (err) {
                    console.error('Compression failed, uploading original:', err);
                }

                const filePath = `${user.id}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('profiles')
                    .upload(filePath, uploadData, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('profiles')
                    .getPublicUrl(filePath);

                avatarUrl = publicUrl;
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    name: profile.name,
                    phone: profile.phone,
                    favorite_spot: profile.favorite_spot,
                    bio: profile.bio,
                    avatar_url: avatarUrl
                })
                .eq('id', user.id);

            if (error) throw error;
            alert("Profile updated successfully!");
            fetchProfile(); // Refresh
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p className="text-xs font-black uppercase tracking-widest">Loading Profile...</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <User size={120} />
            </div>

            <form onSubmit={handleSave} className="space-y-8 relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                    <label className="relative group cursor-pointer">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-slate-800 border-4 border-slate-700 overflow-hidden shadow-2xl transition-transform group-hover:scale-105">
                            <img
                                src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name || 'default'}`}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center border-4 border-slate-900 shadow-lg">
                            <Camera size={16} className="text-white" />
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                    <div>
                        <h3 className="text-2xl font-black text-white mb-1">Public Identity</h3>
                        <p className="text-slate-500 font-medium">How your friends see you in the Kyoto Crew.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputGroup label="Display Name" icon={<User size={18} />}>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none transition-all"
                            required
                        />
                    </InputGroup>

                    <InputGroup label="Phone Number" icon={<Phone size={18} />}>
                        <input
                            type="tel"
                            placeholder="+1 234 567 890"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none transition-all"
                        />
                    </InputGroup>

                    <InputGroup label="Favorite Hangout Spot" icon={<MapPin size={18} />}>
                        <input
                            type="text"
                            placeholder="e.g. Central Park"
                            value={profile.favorite_spot}
                            onChange={(e) => setProfile({ ...profile, favorite_spot: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none transition-all"
                        />
                    </InputGroup>

                    <InputGroup label="Short Bio" icon={<AlignLeft size={18} />}>
                        <textarea
                            placeholder="Tell your friends something about yourself..."
                            value={profile.bio}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none transition-all min-h-[120px] resize-none"
                        />
                    </InputGroup>
                </div>

                <div className="flex justify-end pt-8 border-t border-slate-800">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] px-12 py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Update Profile</>}
                    </button>
                </div>
            </form>
        </div>
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

export default ProfileEditor;
