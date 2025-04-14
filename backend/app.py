from flask import Flask, request, jsonify, send_from_directory
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.applications.vgg16 import VGG16, preprocess_input as preprocess_vgg
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input as preprocess_resnet
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input as preprocess_mnetv2
from tensorflow.keras.utils import array_to_img
import matplotlib as mpl
import matplotlib.pyplot as plt
import os
import uuid
import base64
from io import BytesIO
from PIL import Image

app = Flask(__name__, static_folder='../frontend/build')

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Load models once at startup
MODELS = {
    "VGG16": {
        "model": VGG16(weights="imagenet"),
        "preprocess": preprocess_vgg,
        "layers": [1, 2, 4, 5, 7, 8, 9, 11, 12, 13, 15, 16, 17],
    },
    "ResNet50": {
        "model": ResNet50(weights="imagenet"),
        "preprocess": preprocess_resnet,
        "layers": [
            "conv1_conv", "conv2_block1_out", "conv2_block3_out", "conv3_block1_out",
            "conv3_block4_out", "conv4_block1_out", "conv4_block3_out", "conv4_block6_out",
            "conv5_block1_out", "conv5_block2_out", "conv5_block3_out", "avg_pool", "conv3_block2_out"
        ],
    },
    "MobileNetV2": {
        "model": MobileNetV2(weights="imagenet"),
        "preprocess": preprocess_mnetv2,
        "layers": [
            "Conv1", "expanded_conv_project_BN", "block_2_project_BN", "block_3_project_BN",
            "block_4_project_BN", "block_5_project_BN", "block_6_project_BN", "block_7_project_BN",
            "block_8_project_BN", "block_10_project_BN", "block_11_project_BN", "block_12_project_BN", "block_13_project_BN"
        ],
    },
}

def make_gradcam_heatmap(img_array, model, layer_name, pred_index=None):
    grad_model = Model([model.inputs], [model.get_layer(layer_name).output, model.output])
    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_array)
        if pred_index is None:
            pred_index = tf.argmax(predictions[0])
        class_channel = predictions[:, pred_index]
    grads = tape.gradient(class_channel, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
    return heatmap.numpy()

def generate_visuals(model_info, img_path, layer_name, include_heatmap):
    model = model_info["model"]
    preprocess = model_info["preprocess"]
    
    # Load and preprocess image
    img_raw = load_img(img_path, target_size=(224, 224))
    original_img = img_to_array(img_raw)
    img_array = np.expand_dims(img_to_array(img_raw), axis=0)
    img_array = preprocess(img_array)
    
    # Get intermediate model
    intermediate_model = Model(inputs=model.inputs, outputs=model.get_layer(layer_name).output)
    fmap = intermediate_model.predict(img_array)[0]
    
    # Skip if feature map is not 3D
    if len(fmap.shape) != 3:
        return None, None
    
    # Generate filter visualization
    filter_means = np.mean(fmap, axis=(0, 1))
    best_filter_idx = np.argmax(filter_means)
    
    plt.figure(figsize=(5, 5))
    plt.imshow(fmap[:, :, best_filter_idx], cmap="gray")
    plt.axis('off')
    
    # Save filter image to bytes
    filter_bytes = BytesIO()
    plt.savefig(filter_bytes, format='png', bbox_inches='tight', pad_inches=0)
    plt.close()
    filter_bytes.seek(0)
    
    # Generate heatmap if requested
    heatmap_bytes = None
    if include_heatmap:
        try:
            heatmap = make_gradcam_heatmap(img_array, model, layer_name)
            heatmap = np.uint8(255 * heatmap)
            jet = mpl.colormaps['jet']
            jet_colors = jet(np.arange(256))[:, :3]
            jet_heatmap = jet_colors[heatmap]
            jet_heatmap = array_to_img(jet_heatmap)
            jet_heatmap = jet_heatmap.resize((original_img.shape[1], original_img.shape[0]))
            jet_heatmap = img_to_array(jet_heatmap)
            superimposed_img = jet_heatmap * 0.4 + original_img
            superimposed_img = array_to_img(superimposed_img)
            
            heatmap_bytes = BytesIO()
            superimposed_img.save(heatmap_bytes, format='PNG')
            heatmap_bytes.seek(0)
        except Exception as e:
            print(f"Grad-CAM failed: {e}")
    
    return filter_bytes, heatmap_bytes

@app.route('/api/process', methods=['POST'])
def process_image():
    try:
        # Get request data
        model_name = request.form.get('model')
        layer_name = request.form.get('layer')
        include_heatmap = request.form.get('heatmap', 'false').lower() == 'true'
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # Save uploaded file
        filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Get model info
        model_info = MODELS.get(model_name)
        if not model_info:
            return jsonify({'error': 'Invalid model name'}), 400
        
        # Generate visuals
        filter_bytes, heatmap_bytes = generate_visuals(model_info, filepath, layer_name, include_heatmap)
        
        if filter_bytes is None:
            return jsonify({'error': 'Invalid layer selection'}), 400
        
        # Prepare response
        response = {
            'filter': base64.b64encode(filter_bytes.read()).decode('utf-8'),
            'heatmap': base64.b64encode(heatmap_bytes.read()).decode('utf-8') if heatmap_bytes else None,
            'original': base64.b64encode(open(filepath, 'rb').read()).decode('utf-8')
        }
        
        # Clean up
        os.remove(filepath)
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    models_info = {}
    for name, info in MODELS.items():
        layers = []
        for layer in info["layers"]:
            layer_name = info["model"].layers[layer].name if isinstance(layer, int) else layer
            layers.append(layer_name)
        models_info[name] = layers
    return jsonify(models_info)

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)