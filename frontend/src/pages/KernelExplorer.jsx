import React, { useRef, useState, useEffect } from 'react';
import './KernelExplorer.css';

const kernels = {
  identity: {
    name: 'Identity',
    matrix: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
  sharpen: {
    name: 'Sharpen',
    matrix: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
  },
  edge: {
    name: 'Edge Detection',
    matrix: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
  },
};

const applyKernel = (imageData, kernel) => {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);
  const k = kernel.matrix;
  const side = k.length;
  const half = Math.floor(side / 2);

  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = 0; ky < side; ky++) {
          for (let kx = 0; kx < side; kx++) {
            const px = x + kx - half;
            const py = y + ky - half;
            const index = (py * width + px) * 4 + c;
            sum += data[index] * k[ky][kx];
          }
        }
        const idx = (y * width + x) * 4 + c;
        output[idx] = Math.min(Math.max(sum, 0), 255);
      }
      output[(y * width + x) * 4 + 3] = 255; // alpha
    }
  }

  return new ImageData(output, width, height);
};

const KernelExplorer = () => {
  const canvasRef = useRef();
  const outputCanvasRef = useRef();
  const [image, setImage] = useState(null);
  const [kernel, setKernel] = useState(kernels.identity);
  const [selectedPixel, setSelectedPixel] = useState(null);
  const [hoverPatch, setHoverPatch] = useState(null);

  useEffect(() => {
    if (image) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = applyKernel(imgData, kernel);
      outputCanvasRef.current.getContext('2d').putImageData(result, 0, 0);
    }
  }, [image, kernel]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const img = new Image();
    img.onload = () => {
      setImage(img);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvasRef.current.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvasRef.current.height);
    setSelectedPixel({ x, y });
    setHoverPatch({ x, y });
  };

  return (
    <div className="visualizer-container">
      <h2>CNN Visualizer</h2>
      <input type="file" onChange={handleImageUpload} />
      <select onChange={(e) => setKernel(kernels[e.target.value])}>
        {Object.keys(kernels).map((key) => (
          <option value={key} key={key}>
            {kernels[key].name}
          </option>
        ))}
      </select>
      <div className="canvas-grid">
        <div>
          <h3>Input</h3>
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            onClick={handleCanvasClick}
            className="canvas"
          />
        </div>
        <div>
          <h3>Output</h3>
          <div className="output-wrapper">
            <canvas
              ref={outputCanvasRef}
              width={300}
              height={300}
              className="canvas"
            />
            {hoverPatch && (
              <div
                className="highlight"
                style={{
                  left: hoverPatch.x * (300 / canvasRef.current.width) - 5,
                  top: hoverPatch.y * (300 / canvasRef.current.height) - 5,
                  width: 10,
                  height: 10,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KernelExplorer;
