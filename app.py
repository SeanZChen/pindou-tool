from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from pindou_processor import PindouProcessor
import os
import io

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    size = int(request.form.get('size', 52))
    simplify = request.form.get('simplify', 'false').lower() == 'true'
    min_count = int(request.form.get('min_count', 3))
    
    try:
        img_bytes = file.read()
        processor = PindouProcessor()
        
        temp_path = os.path.join(UPLOAD_FOLDER, 'temp_input.png')
        with open(temp_path, 'wb') as f:
            f.write(img_bytes)
        
        result = processor.process(temp_path, 'temp', size, simplify, min_count)
        
        images = {}
        
        for key in ['low_res', 'mosaic', 'color_map', 'original_color_map']:
            if key in result and result[key] is not None:
                img = result[key]
                buf = io.BytesIO()
                img.save(buf, format='PNG')
                buf.seek(0)
                images[key] = buf.getvalue().hex()
        
        color_counts = result.get('color_counts', {})
        original_color_counts = result.get('original_color_counts', {})
        
        return jsonify({
            'success': True,
            'images': images,
            'color_counts': color_counts,
            'original_color_counts': original_color_counts,
            'downsampled_size': result.get('downsampled_size', (0, 0)),
            'original_size': result.get('original_size', (0, 0))
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download/<image_type>', methods=['POST'])
def download_image(image_type):
    data = request.get_json()
    image_hex = data.get('image_data')
    
    if not image_hex:
        return jsonify({'error': 'No image data'}), 400
    
    try:
        img_bytes = bytes.fromhex(image_hex)
        buf = io.BytesIO(img_bytes)
        
        filenames = {
            'low_res': '低分辨率图.png',
            'mosaic': '马赛克效果.png',
            'color_map': '颜色映射图.png',
            'original_color_map': '简化前颜色映射图.png'
        }
        
        return send_file(
            buf,
            mimetype='image/png',
            download_name=filenames.get(image_type, 'image.png'),
            as_attachment=True
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)