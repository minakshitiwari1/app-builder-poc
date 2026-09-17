import { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:4000/api';

function App() {
  const [form, setForm] = useState({
    tenantId: 'amma-store',
    appName: 'Amma Store',
    environment: 'stage',
    androidPackageName: 'com.ammastore',
    iosBundleId: 'com.ammastore.ios',
    primaryColor: '#FF6B00',
  });

  const [build, setBuild] = useState(null);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState('android');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  const handleChange = event => {
    const { name, value } = event.target;

    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const payload = {
        tenantId: form.tenantId,
        appName: form.appName,
        environment: form.environment,
        androidPackageName: form.androidPackageName,
        iosBundleId: form.iosBundleId,
        theme: {
          primaryColor: form.primaryColor,
        },
      };

      const response = await axios.post(
        `${API_URL}/builds`,
        payload
      );

      setBuild(response.data.data);
    } catch (error) {
      console.error(error);
      alert('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!build) {
      alert('Save the configuration first');
      return;
    }

    try {
      setPublishing(true);
      setPublishError('');

      const response = await axios.post(
        `${API_URL}/builds/${build.buildId}/publish`,
        { platform }
      );

      setBuild(prev => ({
        ...prev,
        status: response.data.data.status,
        platform: response.data.data.platform,
      }));
    } catch (error) {
      console.error(error);

      const message =
        error.response?.data?.message || 'Failed to publish build';

      setPublishError(message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="container">
      <h1>App Builder POC</h1>

      <p className="subtitle">
        Configure, save and publish a white-label application.
      </p>

      <div className="card">
        <label>Tenant ID</label>
        <input
          name="tenantId"
          value={form.tenantId}
          onChange={handleChange}
        />

        <label>App Name</label>
        <input
          name="appName"
          value={form.appName}
          onChange={handleChange}
        />

        <label>Environment</label>

        <select
          name="environment"
          value={form.environment}
          onChange={handleChange}
        >
          <option value="stage">Stage</option>
          <option value="production">Production</option>
        </select>

        <label>Android Package Name</label>
        <input
          name="androidPackageName"
          value={form.androidPackageName}
          onChange={handleChange}
        />

        <label>iOS Bundle ID</label>
        <input
          name="iosBundleId"
          value={form.iosBundleId}
          onChange={handleChange}
        />

        <label>Primary Color</label>

        <input
          type="color"
          name="primaryColor"
          value={form.primaryColor}
          onChange={handleChange}
        />

        <label>Platform</label>

        <select
          name="platform"
          value={platform}
          onChange={event => setPlatform(event.target.value)}
        >
          <option value="android">Android</option>
          <option value="ios">iOS</option>
        </select>

        <div className="actions">
          <button
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={handlePublish}
            disabled={!build || publishing}
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>

        {publishError && <p className="error-text">{publishError}</p>}
      </div>

      {build && (
        <div className="build-card">
          <h2>Saved Build</h2>

          <p>
            <strong>Build ID:</strong>
          </p>

          <code>{build.buildId}</code>

          <p>
            <strong>Status:</strong> {build.status}
          </p>

          {build.platform && (
            <p>
              <strong>Platform:</strong> {build.platform}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;