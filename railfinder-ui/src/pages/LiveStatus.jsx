import { useState } from 'react';
import { fetchLiveStatus } from '../services/api';

export default function LiveStatus() {
  const [trainNumber, setTrainNumber] = useState('');
  const [date, setDate] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!trainNumber.trim() || !date.trim()) {
      setError('Please enter both a train number and a date.');
      return;
    }
    setIsLoading(true);
    setError('');
    setStatusData(null);

    try {
      const data = await fetchLiveStatus(trainNumber.trim(), date.trim());
      setStatusData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSearch();
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'monospace' }}>
      <h2>Live Train Status — Raw Data Viewer</h2>
      <p style={{ marginBottom: '16px', color: '#555', fontSize: '13px' }}>
        Dumps the raw RapidAPI response as JSON. Styled UI comes next.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
        <label>
          Train Number
          <input
            type="text"
            value={trainNumber}
            onChange={(e) => setTrainNumber(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g. 12487"
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px', fontSize: '14px' }}
          />
        </label>

        <label>
          Date <span style={{ color: '#888', fontSize: '12px' }}>(YYYYMMDD)</span>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g. 20260605"
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px', fontSize: '14px' }}
          />
        </label>

        <button
          onClick={handleSearch}
          disabled={isLoading}
          style={{
            padding: '10px 24px',
            background: '#005bbf',
            color: '#fff',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.65 : 1,
            fontSize: '14px',
          }}
        >
          {isLoading ? 'Fetching…' : 'Fetch Status'}
        </button>
      </div>

      {error && (
        <p style={{ marginTop: '16px', color: '#ba1a1a', background: '#ffdad6', padding: '10px', maxWidth: '400px' }}>
          {error}
        </p>
      )}

      {statusData && (
        <pre
          style={{
            marginTop: '24px',
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: '20px',
            borderRadius: '6px',
            overflowX: 'auto',
            fontSize: '13px',
            lineHeight: '1.6',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          {JSON.stringify(statusData, null, 2)}
        </pre>
      )}
    </div>
  );
}
