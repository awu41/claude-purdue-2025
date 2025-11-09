import { useEffect, useState } from 'react';

const initialState = {
  username: '',
  email: '',
  password: ''
};

const RegisterForm = ({ onRegister, onSignOut, currentProfile, isLoading }) => {
  const [formData, setFormData] = useState(initialState);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setFormData((prev) => ({
        ...prev,
        username: currentProfile.username || prev.username,
        email: currentProfile.email || prev.email
      }));
    }
  }, [currentProfile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const result = await onRegister(formData);
      setFeedback({ success: true, message: result?.message || (result?.isNew ? 'Profile created.' : 'Signed in.') });
      setFormData((prev) => ({ ...prev, password: '' }));
    } catch (error) {
      setFeedback({ success: false, message: error.message || 'Unable to authenticate right now.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 shadow-lg shadow-slate-900/40">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-wide text-slate-500">Step 1</p>
        <h2 className="text-2xl font-semibold text-white">Register or sign in</h2>
        <p className="text-sm text-slate-400 mt-2">
          Accounts sync securely via <code className="text-amber-300">Firebase Auth</code> so the same profile can be reused across devices.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Purdue username
          <input
            required
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="purdue_student"
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-base text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Purdue email
          <input
            required
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="student@purdue.edu"
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-base text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Password
          <input
            required
            name="password"
            type="password"
            minLength={4}
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••"
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-base text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </label>
        <div className="sm:col-span-2 flex items-center justify-between gap-4">
          <button
            type="submit"
            disabled={submitting || isLoading}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-400/90 px-6 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Sync with Firebase'}
          </button>
          {currentProfile ? (
            <div className="flex flex-col items-end text-sm text-emerald-200">
              <span>Signed in as {currentProfile.username || currentProfile.email}</span>
              <span className="text-xs text-slate-400">{currentProfile.email}</span>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No active user</p>
          )}
        </div>
      </form>
      {currentProfile && (
        <button
          onClick={onSignOut}
          className="mt-4 text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
        >
          Sign out
        </button>
      )}
      {feedback && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            feedback.success ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
