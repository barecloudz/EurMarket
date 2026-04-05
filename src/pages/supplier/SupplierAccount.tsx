import { useState, useEffect } from 'react';
import { User, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import Spinner from '../../components/ui/Spinner';

export default function SupplierAccount() {
  const { user, profile, fetchProfile, session } = useAuthStore();
  const { addToast } = useToast();

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();
      addToast('Profile updated successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }

    if (!session?.access_token) {
      addToast('Session expired — please sign in again', 'error');
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch('/.netlify/functions/set-supplier-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      addToast('Password updated successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      addToast(err.message || 'Failed to update password', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile and password</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Profile section */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/10">
              <User className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Profile</h2>
              <p className="text-sm text-gray-500">Update your display name</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
            {/* Email — read only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isSavingProfile ? <Spinner size="sm" /> : null}
                Save Profile
              </button>
            </div>
          </form>
        </div>

        {/* Change Password section */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/10">
              <Lock className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-500">Set a new password for your account</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingPassword || !newPassword || !confirmPassword}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isSavingPassword ? <Spinner size="sm" /> : null}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
