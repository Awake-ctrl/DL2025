import React, { useState, useEffect } from 'react';
import './Compare_Models.css';

function ModelComparator() {
  const [models, setModels] = useState({});
  const [model1, setModel1] = useState('');
  const [model2, setModel2] = useState('');
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

  const processModel = async (model) => {
    const modelResults = [];
    const layers = models[model];
    
    for (const layer of layers) {
      try {
        const formData = new FormData();
        formData.append('model', model);
        formData.append('layer', layer);
        formData.append('heatmap', includeHeatmap);
        formData.append('file', image);

        const response = await fetch('http://localhost:5000/api/process', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Processing failed for ${model} layer ${layer}`);
        }

        const result = await response.json();
        modelResults.push({
          model,
          layer,
          ...result
        });
      } catch (err) {
        console.error(`Error processing ${model} layer ${layer}:`, err);
      }
    }
    
    return modelResults;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!model1 || !model2 || !image) {
      setError('Please select both models and an image');
      return;
    }

    setLoading(prev => ({ ...prev, processing: true }));
    setError('');
    setResults([]);

    try {
      // Process both models in parallel
      const [results1, results2] = await Promise.all([
        processModel(model1),
        processModel(model2)
      ]);
      
      // Combine results for side-by-side comparison
      const combinedResults = [];
      const maxLayers = Math.max(results1.length, results2.length);
      
      for (let i = 0; i < maxLayers; i++) {
        combinedResults.push({
          model1Result: results1[i],
          model2Result: results2[i]
        });
      }
      
      setResults(combinedResults);
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
        <h1>CNN Model Comparator</h1>
        <p>Compare feature maps and Grad-CAM between two models</p>
      </header>

      <div className="control-panel">
        <form onSubmit={handleSubmit} className="visualization-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="model1-select">Select Model 1:</label>
              <select
                id="model1-select"
                value={model1}
                onChange={(e) => setModel1(e.target.value)}
                required
                disabled={loading.processing}
              >
                <option value="">-- Select Model 1 --</option>
                {Object.keys(models).map(model => (
                  <option key={`model1-${model}`} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="model2-select">Select Model 2:</label>
              <select
                id="model2-select"
                value={model2}
                onChange={(e) => setModel2(e.target.value)}
                required
                disabled={loading.processing}
              >
                <option value="">-- Select Model 2 --</option>
                {Object.keys(models).map(model => (
                  <option key={`model2-${model}`} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </div>

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
            disabled={loading.processing || !model1 || !model2 || !image}
          >
            {loading.processing ? (
              <>
                <span className="button-spinner"></span>
                Processing...
              </>
            ) : (
              'Compare Models'
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
          <h2>Comparison Results ({results.length} layers)</h2>
          <div className="comparison-grid">
            {results.map((comparison, index) => (
              <div key={index} className="layer-comparison">
                <h3>Layer {index + 1}</h3>
                
                <div className="model-comparison">
                  {/* Model 1 Results */}
                  <div className="model-results">
                    <h4>{model1}</h4>
                    {comparison.model1Result && (
                      <>
                        <div className="result-image-container">
                          <h5>Feature Map</h5>
                          <img 
                            src={`data:image/png;base64,${comparison.model1Result.filter}`} 
                            alt={`${model1} Feature Map`}
                          />
                        </div>
                        {includeHeatmap && comparison.model1Result.heatmap && (
                          <div className="result-image-container">
                            <h5>Grad-CAM</h5>
                            <img 
                              src={`data:image/png;base64,${comparison.model1Result.heatmap}`} 
                              alt={`${model1} Grad-CAM`}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Model 2 Results */}
                  <div className="model-results">
                    <h4>{model2}</h4>
                    {comparison.model2Result && (
                      <>
                        <div className="result-image-container">
                          <h5>Feature Map</h5>
                          <img 
                            src={`data:image/png;base64,${comparison.model2Result.filter}`} 
                            alt={`${model2} Feature Map`}
                          />
                        </div>
                        {includeHeatmap && comparison.model2Result.heatmap && (
                          <div className="result-image-container">
                            <h5>Grad-CAM</h5>
                            <img 
                              src={`data:image/png;base64,${comparison.model2Result.heatmap}`} 
                              alt={`${model2} Grad-CAM`}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelComparator;