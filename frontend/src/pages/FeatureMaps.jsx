import React, { useState, useEffect } from 'react';
import './FeatureMaps.css';

function FeatureMaps() {
  const [models, setModels] = useState({});
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedLayer, setSelectedLayer] = useState('');
  const [includeHeatmap, setIncludeHeatmap] = useState(true);
  const [image, setImage] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch available models and layers
    fetch('/api/models')
      .then(response => response.json())
      .then(data => setModels(data))
      .catch(err => setError('Failed to load models'));
  }, []);

  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
    setSelectedLayer('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedModel || !selectedLayer || !image) {
      setError('Please select a model, layer, and image');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('model', selectedModel);
    formData.append('layer', selectedLayer);
    formData.append('heatmap', includeHeatmap);
    formData.append('file', image);

    fetch('/api/process', {
      method: 'POST',
      body: formData,
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(err.error || 'Processing failed') });
        }
        return response.json();
      })
      .then(data => {
        setResults(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>CNN Visualization Tool</h1>
      </header>

      <div className="container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Model:</label>
            <select 
              value={selectedModel} 
              onChange={handleModelChange}
              required
            >
              <option value="">-- Select a Model --</option>
              {Object.keys(models).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          {selectedModel && (
            <div className="form-group">
              <label>Select Layer:</label>
              <select 
                value={selectedLayer} 
                onChange={(e) => setSelectedLayer(e.target.value)}
                required
              >
                <option value="">-- Select a Layer --</option>
                {models[selectedModel].map(layer => (
                  <option key={layer} value={layer}>{layer}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>
              <input 
                type="checkbox" 
                checked={includeHeatmap}
                onChange={(e) => setIncludeHeatmap(e.target.checked)}
              />
              Include Grad-CAM Heatmap
            </label>
          </div>

          <div className="form-group">
            <label>Upload Image:</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileChange}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Visualize'}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        {results && (
          <div className="results">
            <h2>Results</h2>
            <div className="image-grid">
              <div className="image-container">
                <h3>Original Image</h3>
                <img 
                  src={`data:image/png;base64,${results.original}`} 
                  alt="Original"
                />
              </div>
              
              <div className="image-container">
                <h3>Filter Output</h3>
                <img 
                  src={`data:image/png;base64,${results.filter}`} 
                  alt="Filter Output"
                />
              </div>

              {results.heatmap && (
                <div className="image-container">
                  <h3>Grad-CAM Heatmap</h3>
                  <img 
                    src={`data:image/png;base64,${results.heatmap}`} 
                    alt="Grad-CAM Heatmap"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeatureMaps;