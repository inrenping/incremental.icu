'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGarminProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/garmin');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch profile');
        }
        const data = await response.json();
        setUserProfile(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    fetchGarminProfile();
  }, []);

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Garmin Profile Test</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {userProfile && (
        <pre className="bg-slate-100 p-4 rounded overflow-auto">
          {JSON.stringify(userProfile, null, 2)}
        </pre>
      )}
    </div>
  );
}
