import React, { useState } from 'react';
import axios from 'axios';

const Home = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [outputImage, setOutputImage] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setOutputImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return;

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await axios.post('http://localhost:5000/visualize', formData, {
        responseType: 'blob',
      });

      const imageBlob = new Blob([response.data], { type: 'image/png' });
      const imageUrl = URL.createObjectURL(imageBlob);
      setOutputImage(imageUrl);
    } catch (error) {
      console.error('Error fetching feature map:', error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🧠 CNN Feature Map Visualizer</h1>

      <form onSubmit={handleSubmit} className="mb-4">
        <input type="file" onChange={handleImageChange} />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded ml-2"
        >
          Generate Feature Maps
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 mt-6">
        {preview && (
          <div>
            <h2 className="text-lg font-semibold">Original Image</h2>
            <img
              src={preview}
              alt="Preview"
              className="w-full max-w-xs rounded border"
            />
          </div>
        )}

        {outputImage && (
          <div>
            <h2 className="text-lg font-semibold">Feature Map Output</h2>
            <img
              src={outputImage}
              alt="Feature Map"
              className="w-full max-w-xs rounded border"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
