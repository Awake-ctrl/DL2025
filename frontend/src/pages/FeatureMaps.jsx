import React, { useState, useEffect } from 'react';
import './FeatureMaps.css';

function FeatureMaps() {
  const [models, setModels] = useState({});
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedLayer, setSelectedLayer] = useState('');
  const [processAllLayers, setProcessAllLayers] = useState(false);
  const [includeHeatmap, setIncludeHeatmap] = useState(true);
  const [image, setImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState({
    models: true,
    processing: false
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/models');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setModels(data);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError('Failed to load models. Please try again later.');
      } finally {
        setLoading(prev => ({ ...prev, models: false }));
      }
    };

    fetchModels();
  }, []);

  const handleModelChange = (e) => {
    const model = e.target.value;
    setSelectedModel(model);
    setSelectedLayer('');
    setResults([]);
    setProcessAllLayers(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target.result);
      };
      reader.readAsDataURL(file);
      
      setResults([]);
    }
  };

  const processSingleLayer = async (layer) => {
    const formData = new FormData();
    formData.append('model', selectedModel);
    formData.append('layer', layer);
    formData.append('heatmap', includeHeatmap);
    formData.append('file', image);

    const response = await fetch('http://localhost:5000/api/process', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Processing failed for layer ${layer}`);
    }

    return await response.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedModel || (!selectedLayer && !processAllLayers) || !image) {
      setError(processAllLayers ? 'Please select a model and image' : 'Please select a model, layer, and image');
      return;
    }

    setLoading(prev => ({ ...prev, processing: true }));
    setError('');
    setResults([]);

    try {
      if (processAllLayers) {
        // Process all layers sequentially
        const allResults = [];
        const layers = models[selectedModel];
        
        for (const layer of layers) {
          try {
            const result = await processSingleLayer(layer);
            allResults.push({
              layer,
              ...result
            });
          } catch (err) {
            console.error(`Error processing layer ${layer}:`, err);
            // Continue with next layer even if one fails
          }
        }
        
        setResults(allResults);
      } else {
        // Process single layer
        const result = await processSingleLayer(selectedLayer);
        setResults([{
          layer: selectedLayer,
          ...result
        }]);
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'An error occurred during processing');
    } finally {
      setLoading(prev => ({ ...prev, processing: false }));
    }
  };

  if (loading.models) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading models...</p>
      </div>
    );
  }

  if (error && !loading.models) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="feature-maps-container">
      <header className="header">
        <h1>CNN Feature Maps Visualizer</h1>
        <p>Visualize convolutional layers and Grad-CAM heatmaps</p>
      </header>

      <div className="control-panel">
        <form onSubmit={handleSubmit} className="visualization-form">
          <div className="form-group">
            <label htmlFor="model-select">Select Model:</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={handleModelChange}
              required
              disabled={loading.processing}
            >
              <option value="">-- Select a Model --</option>
              {Object.keys(models).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          {selectedModel && (
            <>
              <div className="form-group">
                <label htmlFor="layer-select">Select Layer:</label>
                <select
                  id="layer-select"
                  value={selectedLayer}
                  onChange={(e) => {
                    setSelectedLayer(e.target.value);
                    setProcessAllLayers(false);
                  }}
                  required={!processAllLayers}
                  disabled={loading.processing || processAllLayers}
                >
                  <option value="">-- Select a Layer --</option>
                  {models[selectedModel].map(layer => (
                    <option key={layer} value={layer}>{layer}</option>
                  ))}
                </select>
              </div>

              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="all-layers-checkbox"
                  checked={processAllLayers}
                  onChange={(e) => {
                    setProcessAllLayers(e.target.checked);
                    if (e.target.checked) setSelectedLayer('');
                  }}
                  disabled={loading.processing}
                />
                <label htmlFor="all-layers-checkbox">Process All Layers</label>
              </div>
            </>
          )}

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="heatmap-checkbox"
              checked={includeHeatmap}
              onChange={(e) => setIncludeHeatmap(e.target.checked)}
              disabled={loading.processing}
            />
            <label htmlFor="heatmap-checkbox">Include Grad-CAM Heatmap</label>
          </div>

          <div className="form-group">
            <label htmlFor="image-upload">Upload Image:</label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
              disabled={loading.processing}
            />
            {previewImage && (
              <div className="image-preview">
                <img src={previewImage} alt="Preview" />
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="visualize-button"
            disabled={loading.processing || !selectedModel || (!selectedLayer && !processAllLayers) || !image}
          >
            {loading.processing ? (
              <>
                <span className="button-spinner"></span>
                Processing...
              </>
            ) : (
              processAllLayers ? 'Visualize All Layers' : 'Visualize'
            )}
          </button>
        </form>

        {error && !loading.processing && (
          <div className="form-error">
            <p>{error}</p>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="results-section">
          <h2>Visualization Results {processAllLayers && `(${results.length} layers)`}</h2>
          <div className="results-grid">
            {results.map((result, index) => (
              <React.Fragment key={index}>
                <div className="result-card">
                  {processAllLayers && <h3 className="layer-name">Layer: {result.layer}</h3>}
                  <div className="result-image-container">
                    <h4>Original Image</h4>
                    <img 
                      src={`data:image/png;base64,${result.original}`} 
                      alt="Original"
                    />
                  </div>
                </div>
                
                <div className="result-card">
                  {processAllLayers && <h3 className="layer-name">Layer: {result.layer}</h3>}
                  <div className="result-image-container">
                    <h4>Filter Output</h4>
                    <img 
                      src={`data:image/png;base64,${result.filter}`} 
                      alt="Filter Output"
                    />
                  </div>
                </div>

                {result.heatmap && (
                  <div className="result-card">
                    {processAllLayers && <h3 className="layer-name">Layer: {result.layer}</h3>}
                    <div className="result-image-container">
                      <h4>Grad-CAM Heatmap</h4>
                      <img 
                        src={`data:image/png;base64,${result.heatmap}`} 
                        alt="Grad-CAM Heatmap"
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FeatureMaps;