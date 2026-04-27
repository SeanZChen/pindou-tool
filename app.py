from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from pindou_processor import PindouProcessor
from mard_colors import MARD_221_COLORS
import os
import io
import json

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
    use_ai = request.form.get('ai', 'false').lower() == 'true'
    api_key = request.form.get('api_key', '')
    
    try:
        img_bytes = file.read()
        processor = PindouProcessor()
        
        temp_path = os.path.join(UPLOAD_FOLDER, 'temp_input.png')
        with open(temp_path, 'wb') as f:
            f.write(img_bytes)
        
        input_path = temp_path
        ai_processed = False
        
        if use_ai:
            if not api_key:
                return jsonify({'error': '启用AI优化时必须提供API Key'}), 400
            
            from ai_processor import AIProcessor
            ai_processor = AIProcessor(api_key)
            ai_temp_path = os.path.join(UPLOAD_FOLDER, 'ai_processed.png')
            
            try:
                ai_processor.optimize_image(temp_path, ai_temp_path)
                input_path = ai_temp_path
                ai_processed = True
            except Exception as e:
                return jsonify({'error': f'AI优化失败: {str(e)}'}), 500
        
        result = processor.process(input_path, 'temp', size, simplify, min_count)
        
        images = {}
        
        if ai_processed:
            from PIL import Image
            ai_img = Image.open(input_path)
            buf = io.BytesIO()
            ai_img.save(buf, format='PNG')
            buf.seek(0)
            images['ai_processed'] = buf.getvalue().hex()
        
        for key in ['low_res', 'mosaic', 'color_map', 'original_color_map']:
            if key in result and result[key] is not None:
                img = result[key]
                buf = io.BytesIO()
                img.save(buf, format='PNG')
                buf.seek(0)
                images[key] = buf.getvalue().hex()
        
        color_counts = result.get('color_counts', {})
        original_color_counts = result.get('original_color_counts', {})
        dou_data = result.get('dou_data', {})
        
        return jsonify({
            'success': True,
            'images': images,
            'color_counts': color_counts,
            'original_color_counts': original_color_counts,
            'downsampled_size': result.get('downsampled_size', (0, 0)),
            'original_size': result.get('original_size', (0, 0)),
            'ai_processed': ai_processed,
            'dou_data': dou_data
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
            'ai_processed': 'AI优化后的图片.png',
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

@app.route('/download-dou', methods=['POST'])
def download_dou():
    data = request.get_json()
    dou_data = data.get('dou_data')
    
    if not dou_data:
        return jsonify({'error': 'No .dou data'}), 400
    
    try:
        json_str = json.dumps(dou_data, ensure_ascii=False)
        buf = io.BytesIO(json_str.encode('utf-8'))
        
        return send_file(
            buf,
            mimetype='application/json',
            download_name='template.dou',
            as_attachment=True
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/dou-to-image', methods=['POST'])
def dou_to_image():
    data = request.get_json()
    dou_data = data.get('dou_data')
    
    if not dou_data:
        return jsonify({'error': 'No .dou data'}), 400
    
    try:
        processor = PindouProcessor()
        img = processor.dou_to_image(dou_data)
        
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        
        return jsonify({
            'success': True,
            'image_data': buf.getvalue().hex()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/upload-dou', methods=['POST'])
def upload_dou():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith('.dou'):
        return jsonify({'error': 'Only .dou files are allowed'}), 400
    
    try:
        dou_data = json.load(file)
        
        processor = PindouProcessor()
        img = processor.dou_to_image(dou_data)
        
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        
        return jsonify({
            'success': True,
            'image_data': buf.getvalue().hex(),
            'dou_data': dou_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get-colors', methods=['GET'])
def get_colors():
    return jsonify({
        'success': True,
        'colors': MARD_221_COLORS
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)