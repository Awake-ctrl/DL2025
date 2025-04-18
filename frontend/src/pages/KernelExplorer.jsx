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
    description: 'Returns the original image unchanged'
  },
  sharpen: {
    name: 'Sharpen',
    matrix: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
    description: 'Enhances edges and details'
  },
  edge: {
    name: 'Edge Detection',
    matrix: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
    description: 'Detects edges in the image'
  },
  blur: {
    name: 'Box Blur',
    matrix: [
      [1/9, 1/9, 1/9],
      [1/9, 1/9, 1/9],
      [1/9, 1/9, 1/9],
    ],
    description: 'Simple averaging blur'
  },
  gaussian: {
    name: 'Gaussian Blur',
    matrix: [
      [1/16, 2/16, 1/16],
      [2/16, 4/16, 2/16],
      [1/16, 2/16, 1/16],
    ],
    description: 'Smoothing with Gaussian distribution'
  },
  emboss: {
    name: 'Emboss',
    matrix: [
      [-2, -1, 0],
      [-1, 1, 1],
      [0, 1, 2],
    ],
    description: 'Creates 3D embossed effect'
  }
};

const KernelExplorer = () => {
  const canvasRef = useRef();
  const outputCanvasRef = useRef();
  const [image, setImage] = useState(null);
  const [kernel, setKernel] = useState(kernels.identity);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [calculationSteps, setCalculationSteps] = useState([]);
  const [showCalculation, setShowCalculation] = useState(false);
  const [customKernel, setCustomKernel] = useState([
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0]
  ]);
  const [useCustomKernel, setUseCustomKernel] = useState(false);

  useEffect(() => {
    if (image) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      processImage();
    }
  }, [image, kernel, customKernel, useCustomKernel]);

  const processImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const activeKernel = useCustomKernel ? { matrix: customKernel } : kernel;
    const result = applyKernel(imgData, activeKernel);
    outputCanvasRef.current.getContext('2d').putImageData(result, 0, 0);
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const img = new Image();
    img.onload = () => {
      setImage(img);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleCanvasHover = (e, isOutput = false) => {
    if (!image) return;
    
    const canvas = isOutput ? outputCanvasRef.current : canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    
    setHoverPosition({ x, y, isOutput });
    
    if (showCalculation && !isOutput) {
      calculateDotProduct(x, y);
    }
  };

  const calculateDotProduct = (x, y) => {
    if (!image || x < 1 || y < 1 || x >= canvasRef.current.width - 1 || y >= canvasRef.current.height - 1) {
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    const { data } = imgData;
    const activeKernel = useCustomKernel ? customKernel : kernel.matrix;
    const steps = [];
    let total = 0;

    for (let ky = -1; ky <= 1; ky++) {
      for (let kx = -1; kx <= 1; kx++) {
        const px = x + kx;
        const py = y + ky;
        const index = (py * canvasRef.current.width + px) * 4;
        const pixelValue = data[index]; // Using red channel for grayscale calculation
        const weight = activeKernel[ky + 1][kx + 1];
        const product = pixelValue * weight;
        
        steps.push({
          pixelPos: { x: px, y: py },
          pixelValue,
          weight,
          product
        });
        
        total += product;
      }
    }

    steps.push({
      description: `Total = ${steps.map(s => s.product.toFixed(1)).join(' + ')} = ${total.toFixed(1)}`,
      finalValue: Math.min(Math.max(total, 0), 255)
    });

    setCalculationSteps(steps);
  };

  const toggleCalculation = () => {
    setShowCalculation(!showCalculation);
    if (!showCalculation && hoverPosition && !hoverPosition.isOutput) {
      calculateDotProduct(hoverPosition.x, hoverPosition.y);
    } else {
      setCalculationSteps([]);
    }
  };

  const handleKernelValueChange = (row, col, value) => {
    const newKernel = [...customKernel];
    newKernel[row][col] = parseFloat(value) || 0;
    setCustomKernel(newKernel);
  };

  return (
    <div className="visualizer-container">
      <h2>CNN Kernel Visualizer</h2>
      
      <div className="controls">
        <div className="control-group">
          <label>Upload Image:</label>
          <input type="file" onChange={handleImageUpload} accept="image/*" />
        </div>
        
        <div className="control-group">
          <label>Select Kernel:</label>
          <select 
            onChange={(e) => {
              setKernel(kernels[e.target.value]);
              setUseCustomKernel(false);
            }}
            value={Object.keys(kernels).find(key => kernels[key].name === kernel.name)}
            disabled={useCustomKernel}
          >
            {Object.keys(kernels).map((key) => (
              <option value={key} key={key}>
                {kernels[key].name}
              </option>
            ))}
          </select>
          <div className="kernel-description">{kernel.description}</div>
        </div>
        
        <div className="control-group">
          <label>
            <input 
              type="checkbox" 
              checked={useCustomKernel}
              onChange={() => setUseCustomKernel(!useCustomKernel)}
            />
            Use Custom Kernel
          </label>
        </div>

        {useCustomKernel && (
          <div className="custom-kernel-editor">
            <h4>Custom Kernel (3×3)</h4>
            <table>
              <tbody>
                {customKernel.map((row, i) => (
                  <tr key={i}>
                    {row.map((val, j) => (
                      <td key={j}>
                        <input
                          type="number"
                          step="0.1"
                          value={val}
                          onChange={(e) => handleKernelValueChange(i, j, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={processImage}>Apply Custom Kernel</button>
          </div>
        )}
        
        <div className="control-group">
          <label>
            <input 
              type="checkbox" 
              checked={showCalculation}
              onChange={toggleCalculation}
            />
            Show Kernel Calculations
          </label>
        </div>
      </div>

      <div className="canvas-grid">
        <div className="canvas-container">
          <h3>Input Image</h3>
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              onMouseMove={(e) => handleCanvasHover(e, false)}
              className="canvas"
            />
            {hoverPosition && !hoverPosition.isOutput && (
              <div 
                className="input-highlight"
                style={{
                  left: hoverPosition.x - 15,
                  top: hoverPosition.y - 15,
                  width: 30,
                  height: 30,
                }}
              />
            )}
          </div>
        </div>
        
        <div className="canvas-container">
          <h3>Output (After Kernel)</h3>
          <div className="canvas-wrapper">
            <canvas
              ref={outputCanvasRef}
              width={400}
              height={400}
              onMouseMove={(e) => handleCanvasHover(e, true)}
              className="canvas"
            />
            {hoverPosition && !hoverPosition.isOutput && (
              <div 
                className="output-highlight"
                style={{
                  left: hoverPosition.x ,
                  top: hoverPosition.y,
                  width: 10,
                  height: 10,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {hoverPosition && (
        <div className="position-info">
          {!hoverPosition.isOutput ? (
            <>
              <p>Input position: ({hoverPosition.x-1}-{hoverPosition.x+1}, {hoverPosition.y-1}-{hoverPosition.y+1})</p>
              
              {/* <p>Input Position: ({hoverPosition.x}, {hoverPosition.y})</p> */}
              <p>Affecting Output Area:  ({hoverPosition.x}, {hoverPosition.y})</p>
            </>
          ) : (
            <p>Output Position:({hoverPosition.x}, {hoverPosition.y})</p>
          )}
        </div>
      )}

      {showCalculation && hoverPosition && !hoverPosition.isOutput && calculationSteps.length > 0 && (
        <div className="calculation-panel">
          <h3>Kernel Calculation at ({hoverPosition.x}, {hoverPosition.y})</h3>
          
          <div className="kernel-matrix">
            <h4>Kernel Weights:</h4>
            <table>
              <tbody>
                {(useCustomKernel ? customKernel : kernel.matrix).map((row, i) => (
                  <tr key={i}>
                    {row.map((val, j) => (
                      <td key={j}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="calculation-steps">
            <h4>Calculation Steps:</h4>
            <table>
              <thead>
                <tr>
                  <th>Pixel</th>
                  <th>Value</th>
                  <th>× Weight</th>
                  <th>= Product</th>
                </tr>
              </thead>
              <tbody>
                {calculationSteps.slice(0, 9).map((step, i) => (
                  <tr key={i}>
                    <td>({step.pixelPos.x}, {step.pixelPos.y})</td>
                    <td>{step.pixelValue}</td>
                    <td>{step.weight}</td>
                    <td>{step.product.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {calculationSteps.length > 9 && (
              <div className="calculation-summary">
                <p>{calculationSteps[9].description}</p>
                <p>Final Output Value: {calculationSteps[9].finalValue}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KernelExplorer;