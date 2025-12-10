'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useRouter } from 'next/navigation';

type DesignerProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  specialization: 'Interior Designer' | 'Architect' | 'Civil Engineer' | 'Others';
  experienceYears: number;
  studioCompany: string;
  gstNumber?: string;
  about: string;
  profilePic?: string;
};

const PROFILE_KEY = "dc:designerProfile";
const USER_EMAIL_KEY = "dc:userEmail";

export default function AccountPage() {
  const { user, isDemo } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<DesignerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const saveProfile = async (updatedProfile: DesignerProfile) => {
    if (!user) return;
    const storageKey = isDemo ? PROFILE_KEY : `dc:designerProfile:${user.id}`;
    
    // Save to Supabase designer_details table first
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('designer_details')
        .upsert({
          user_id: user.id,
          name: updatedProfile.name,
          email: updatedProfile.email,
          phone: updatedProfile.phone || null,
          address: updatedProfile.address || null,
          specialization: updatedProfile.specialization,
          experience: updatedProfile.experienceYears.toString() + ' years',
          studio: updatedProfile.studioCompany || null,
          gst_id: updatedProfile.gstNumber || null,
          about: updatedProfile.about || null,
          profile_pic: updatedProfile.profilePic || null,
        }, { onConflict: 'user_id' });
      
      if (error) {
        console.error('Failed to save profile to Supabase:', error);
        alert(`Failed to save profile: ${error.message}`);
        return;
      }
      
      // Only update local state if Supabase save was successful
      localStorage.setItem(storageKey, JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      console.log('Profile saved successfully');
    } catch (err) {
      console.error('Supabase upsert error:', err);
      alert('Failed to save profile. Please try again.');
    }
  };

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      router.replace('/login');
      return;
    }

    if (isDemo) {
      // Load or create demo profile
      const existing = localStorage.getItem(PROFILE_KEY);
      if (existing) {
        setProfile(JSON.parse(existing) as DesignerProfile);
      } else {
        const demo: DesignerProfile = {
          name: "Demo Designer",
          email: "demo@designandcart.in",
          phone: "+91 98765 43210",
          address: "HSR Layout, Bengaluru, Karnataka",
          specialization: "Interior Designer",
          experienceYears: 6,
          studioCompany: "De'Artisa Designs LLP",
          gstNumber: "29ABCDE1234F2Z5",
          about: "A passionate interior designer focused on modern, sustainable design. Helping clients visualize and implement spaces with real, purchasable products.",
          profilePic: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=800&auto=format&fit=crop",
        };
        localStorage.setItem(PROFILE_KEY, JSON.stringify(demo));
        setProfile(demo);
      }
    } else {
      // Real user - fetch profile from Supabase
      const fetchProfile = async () => {
        const userProfileKey = `dc:designerProfile:${user.id}`;
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data, error } = await supabase
            .from('designer_details')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (error) {
            console.warn('Supabase fetch error:', error.message);
          }
          
          if (data) {
            // Parse experience years from text (e.g., "5 years" -> 5)
            const experienceYears = data.experience ? parseInt(data.experience) || 0 : 0;
            
            // Map Supabase data to DesignerProfile
            const loadedProfile: DesignerProfile = {
              name: data.name || '',
              email: data.email || '',
              phone: data.phone || '',
              address: data.address || '',
              specialization: data.specialization || 'Interior Designer',
              experienceYears: experienceYears,
              studioCompany: data.studio || '',
              gstNumber: data.gst_id || '',
              about: data.about || '',
              profilePic: data.profile_pic || '',
            };
            setProfile(loadedProfile);
            localStorage.setItem(userProfileKey, JSON.stringify(loadedProfile));
            return;
          }
        } catch (err) {
          console.error('Error fetching profile from Supabase:', err);
        }
        
        // Fallback to localStorage or create new profile
        const existing = localStorage.getItem(userProfileKey);
        if (existing) {
          setProfile(JSON.parse(existing) as DesignerProfile);
        } else {
          // Create a basic profile from user data
          const newProfile: DesignerProfile = {
            name: (user as any).user_metadata?.full_name || (user as any).name || 'Designer',
            email: user.email || '',
            phone: '',
            address: '',
            specialization: 'Interior Designer',
            experienceYears: 0,
            studioCompany: '',
            about: 'Welcome to Design & Cart! Complete your profile to showcase your expertise.',
          };
          localStorage.setItem(userProfileKey, JSON.stringify(newProfile));
          setProfile(newProfile);
        }
      };
      fetchProfile();
    }

    setLoading(false);
  }, [user, router, isDemo]);

  if (loading) {
    return <main className="p-10 text-zinc-500">Loading…</main>;
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-1.5 rounded-full bg-[#d96857]" />
          <h1 className="text-3xl font-bold text-[#d96857] tracking-tight">Account</h1>
        </div>

        <ProfileCard profile={profile} onSave={saveProfile} isDemo={isDemo} />
      </div>
    </main>
  );
}

// ---------------- Components ----------------



function ProfileCard({ 
  profile, 
  onSave, 
  isDemo 
}: { 
  profile: DesignerProfile; 
  onSave: (updatedProfile: DesignerProfile) => void;
  isDemo: boolean;
}) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedProfile, setEditedProfile] = useState<DesignerProfile>(profile);

  // Separate edit state for top profile area
  const isProfileEditing = editingSection === 'profile';

  const handleSave = () => {
    onSave(editedProfile);
    setEditingSection(null);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setEditingSection(null);
  };
  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <div className="bg-gradient-to-br from-[#d96857]/5 to-[#d96857]/10 rounded-2xl border border-[#d96857]/20 p-8 shadow-md">
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg ring-2 ring-[#d96857]/20">
            <img
              src={isProfileEditing ? (editedProfile.profilePic || "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=800&auto=format&fit=crop") : (profile.profilePic || "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=800&auto=format&fit=crop")}
              alt="Profile picture"
              className="object-cover w-full h-full"
            />
            {isProfileEditing && (
              <>
                <input
                  id="profile-pic-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    try {
                      const { supabase } = await import('@/lib/supabase');
                      const fileExt = file.name.split('.').pop();
                      const fileName = `profile_${Date.now()}.${fileExt}`;
                      
                      // Upload to chat-files bucket (which we know exists)
                      const { data, error } = await supabase.storage
                        .from('chat-files')
                        .upload(`avatars/${fileName}`, file, { upsert: true });
                      
                      if (error) {
                        console.error('Upload error:', error);
                        alert(`Failed to upload image: ${error.message}`);
                        return;
                      }
                      
                      if (data) {
                        // Get public URL
                        const { data: { publicUrl } } = supabase.storage
                          .from('chat-files')
                          .getPublicUrl(data.path);
                        
                        setEditedProfile(prev => ({ ...prev, profilePic: publicUrl }));
                      }
                    } catch (err) {
                      console.error('Upload error:', err);
                      alert('Failed to upload image. Please try again.');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('profile-pic-upload')?.click()}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-all hover:scale-105"
                  aria-label="Change profile picture"
                >
                  <FiCamera size={18} className="text-[#d96857]" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex-1">
          {isProfileEditing ? (
            <input
              type="text"
              value={editedProfile.name}
              onChange={(e) => setEditedProfile(prev => ({ ...prev, name: e.target.value }))}
              className="text-2xl font-bold text-[#2e2e2e] border border-[#2e2e2e]/20 rounded-xl px-4 py-2.5 w-full mb-3 focus:outline-none focus:ring-2 focus:ring-[#d96857]/30 focus:border-[#d96857]"
              placeholder="Full Name"
            />
          ) : (
            <h2 className="text-2xl font-bold text-[#2e2e2e] mb-1">
              {profile.name}
            </h2>
          )}
          <p className="text-base text-[#2e2e2e]/70 font-medium mb-1">{isProfileEditing ? editedProfile.specialization : profile.specialization}</p>
          {(profile.studioCompany || isProfileEditing) && (
            <p className="text-sm text-[#2e2e2e]/60">{isProfileEditing ? editedProfile.studioCompany : profile.studioCompany}</p>
          )}
        </div>
        <div className="flex gap-3 items-start">
          {isProfileEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-[#d96857] text-white rounded-xl text-sm hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 bg-white text-[#2e2e2e] border border-[#2e2e2e]/10 rounded-xl text-sm hover:bg-[#2e2e2e]/5 transition-colors font-semibold"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditingSection('profile')}
              className="px-5 py-2.5 text-[#d96857] border-2 border-[#d96857] rounded-xl text-sm hover:bg-[#d96857]/10 transition-all font-semibold"
            >
              Edit Profile
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Contact Information */}
      <Section title="Contact Information" showEdit onEdit={() => setEditingSection('contact')}>
        <Grid>
          {editingSection === 'contact' ? (
            <div className="bg-white/50 rounded-lg p-3 border border-[#2e2e2e]/5">
              <div className="text-xs text-[#2e2e2e]/60 mb-1.5 font-semibold uppercase tracking-wider">Email</div>
              <input 
                type="email" 
                value={editedProfile.email} 
                onChange={e => setEditedProfile(prev => ({ ...prev, email: e.target.value }))} 
                className="w-full border border-[#2e2e2e]/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d96857]/30 focus:border-[#d96857] bg-white" 
                placeholder="your@email.com"
              />
            </div>
          ) : (
            <Info 
              label="Email" 
              value={profile.email} 
            />
          )}
          {editingSection === 'contact' ? (
            <div className="bg-white/50 rounded-lg p-3 border border-[#2e2e2e]/5">
              <div className="text-xs text-[#2e2e2e]/60 mb-1.5 font-semibold uppercase tracking-wider">Phone</div>
              <input 
                type="tel" 
                value={editedProfile.phone} 
                onChange={e => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))} 
                className="w-full border border-[#2e2e2e]/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d96857]/30 focus:border-[#d96857] bg-white" 
                placeholder="+91 98765 43210"
              />
            </div>
          ) : (
            <Info 
              label="Phone" 
              value={profile.phone} 
            />
          )}
          <div className="sm:col-span-2">
            {editingSection === 'contact' ? (
              <div className="bg-white/50 rounded-lg p-3 border border-[#2e2e2e]/5">
                <div className="text-xs text-[#2e2e2e]/60 mb-1.5 font-semibold uppercase tracking-wider">Address</div>
                <textarea 
                  value={editedProfile.address} 
                  onChange={e => setEditedProfile(prev => ({ ...prev, address: e.target.value }))} 
                  className="w-full border border-[#2e2e2e]/20 rounded-xl px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#d96857]/30 focus:border-[#d96857] bg-white resize-none" 
                  placeholder="Your full address"
                />
              </div>
            ) : (
              <Info 
                label="Address" 
                value={profile.address} 
              />
            )}
          </div>
        </Grid>
        {editingSection === 'contact' && (
          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} className="px-5 py-2.5 bg-[#d96857] text-white rounded-xl text-sm hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">Save</button>
            <button onClick={handleCancel} className="px-5 py-2.5 bg-white text-[#2e2e2e] border border-[#2e2e2e]/10 rounded-xl text-sm hover:bg-[#2e2e2e]/5 transition-colors font-semibold">Cancel</button>
          </div>
        )}
      </Section>

      {/* Professional Details */}
      <Section title="Professional Details" solid showEdit onEdit={() => setEditingSection('professional')}>
        <Grid>
          {editingSection === 'professional' ? (
            <div className="bg-white/50 rounded-lg p-3 border border-[#2e2e2e]/5">
              <div className="text-xs text-[#2e2e2e]/60 mb-1.5 font-semibold uppercase tracking-wider">Specialization</div>
              <select 
                value={editedProfile.specialization} 
                onChange={e => setEditedProfile(prev => ({ ...prev, specialization: e.target.value as any }))} 
                className="w-full border border-[#2e2e2e]/20 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#d96857]/30 focus:border-[#d96857]"
              >
                <option value="Interior Designer">Interior Designer</option>
                <option value="Architect">Architect</option>
                <option value="Civil Engineer">Civil Engineer</option>
                <option value="Others">Others</option>
              </select>
            </div>
          ) : (
            <Info 
              label="Specialization" 
              value={profile.specialization} 
            />
          )}
          {editingSection === 'professional' ? (
            <div className="bg-white/50 rounded-lg p-3 border border-[#2e2e2e]/5">
              <div className="text-xs text-[#2e2e2e]/60 mb-1.5 font-semibold uppercase tracking-wider">Experience (in years)</div>
              <input 
                type="number" 
                min="0"
                value={editedProfile.experienceYears} 
                onChange={e => setEditedProfile(prev => ({ ...prev, experienceYears: parseInt(e.target.value) || 0 }))} 
                className="w-full border border-[#2e2e2e]/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d96857]/30 focus:border-[#d96857] bg-white" 
                placeholder="e.g., 5"
              />
            </div>
          ) : (
            <Info 
              label="Experience (in years)" 
              value={`${profile.experienceYears} years`} 
            />
          )}
          {editingSection === 'professional' ? (
            <div className="bg-white/50 rounded-lg p-3 border border-[#2e2e2e]/5">
              <div className="text-xs text-[#2e2e2e]/60 mb-1.5 font-semibold uppercase tracking-wider">Studio / Company (if any)</div>
              <input 
                type="text" 
                value={editedProfile.studioCompany} 
                onChange={e => setEditedProfile(prev => ({ ...prev, studioCompany: e.target.value }))} 
                className="w-full border border-[#2e2e2e]/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d96857]/30 focus:border-[#d96857] bg-white" 
                placeholder="Your studio name"
              />
            </div>
          ) : (
            <Info 
              label="Studio / Company (if any)" 
              value={profile.studioCompany || "-"} 
            />
          )}
          {editingSection === 'professional' ? (
            <div className="bg-white/50 rounded-lg p-3 border border-[#2e2e2e]/5">
              <div className="text-xs text-[#2e2e2e]/60 mb-1.5 font-semibold uppercase tracking-wider">GST Number (Optional)</div>
              <input 
                type="text" 
                value={editedProfile.gstNumber || ''} 
                onChange={e => setEditedProfile(prev => ({ ...prev, gstNumber: e.target.value }))} 
                className="w-full border border-[#2e2e2e]/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d96857]/30 focus:border-[#d96857] bg-white" 
                placeholder="29ABCDE1234F2Z5"
              />
            </div>
          ) : (
            <Info 
              label="GST Number (Optional)" 
              value={profile.gstNumber || "-"} 
            />
          )}
        </Grid>
        {editingSection === 'professional' && (
          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} className="px-5 py-2.5 bg-[#d96857] text-white rounded-xl text-sm hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">Save</button>
            <button onClick={handleCancel} className="px-5 py-2.5 bg-white text-[#2e2e2e] border border-[#2e2e2e]/10 rounded-xl text-sm hover:bg-[#2e2e2e]/5 transition-colors font-semibold">Cancel</button>
          </div>
        )}
      </Section>

      {/* About Designer */}
      <Section title="About Designer" solid showEdit onEdit={() => setEditingSection('about')}>
        {editingSection === 'about' ? (
          <textarea 
            value={editedProfile.about} 
            onChange={e => setEditedProfile(prev => ({ ...prev, about: e.target.value }))} 
            className="w-full border border-[#2e2e2e]/20 rounded-xl px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#d96857]/30 focus:border-[#d96857] bg-white resize-none" 
            placeholder="Tell us about yourself and your work..."
          />
        ) : (
          <p className="text-[15px] text-[#2e2e2e] leading-relaxed whitespace-pre-line">
            {profile.about}
          </p>
        )}
        {editingSection === 'about' && (
          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} className="px-5 py-2.5 bg-[#d96857] text-white rounded-xl text-sm hover:opacity-90 transition-all font-semibold shadow-sm hover:shadow-md">Save</button>
            <button onClick={handleCancel} className="px-5 py-2.5 bg-white text-[#2e2e2e] border border-[#2e2e2e]/10 rounded-xl text-sm hover:bg-[#2e2e2e]/5 transition-colors font-semibold">Cancel</button>
          </div>
        )}
      </Section>
    </div>
  );
}

import { FiEdit2, FiCamera } from 'react-icons/fi';

function Section({
  title,
  children,
  solid = false,
  onEdit,
  showEdit = false
}: {
  title: string;
  children: React.ReactNode;
  solid?: boolean;
  onEdit?: () => void;
  showEdit?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#2e2e2e]/10 p-7 ${
        solid ? "bg-[#f5f5f5] shadow-md" : "bg-[#fafafa] shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-[#d96857] tracking-tight">{title}</h3>
        {showEdit && (
          <button
            onClick={onEdit}
            className="ml-2 p-2.5 rounded-xl hover:bg-[#d96857]/10 text-[#d96857] transition-all hover:scale-105"
            aria-label={`Edit ${title}`}
          >
            <FiEdit2 size={19} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-5">{children}</div>;
}

function Info({
  label,
  value,
  link = false,
}: {
  label: string;
  value?: string;
  link?: boolean;
}) {
  return (
    <div className="bg-white/50 rounded-lg p-3 border border-[#2e2e2e]/5">
      <div className="text-xs text-[#2e2e2e]/60 mb-1.5 font-semibold uppercase tracking-wider">{label}</div>
      {value ? (
        link ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-[#d96857] hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          <div className="text-[15px] text-[#2e2e2e] font-medium">{value}</div>
        )
      ) : (
        <div className="text-[15px] text-[#2e2e2e]/30">—</div>
      )}
    </div>
  );
}
