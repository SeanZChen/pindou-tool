import requests
import base64
import io

class AIProcessor:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://maas-api.bytedance.net/api/text2image"
    
    def optimize_image(self, image_path, output_path=None):
        """
        使用火山引擎AI模型优化图像
        :param image_path: 输入图片路径
        :param output_path: 输出图片路径（可选）
        :return: 优化后的图片对象
        """
        try:
            with open(image_path, 'rb') as f:
                image_bytes = f.read()
            
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            prompt = "首先选出图像中的主体，若主体存在遮挡，则尝试对前景进行补全。将补全后的主体转化为卡通简洁画风，居中，生成长宽比为1:1的图像"
            
            request_data = {
                "model": "doubao-seedream-4-0-250828",
                "prompt": prompt,
                "image": image_base64,
                "image_mode": "Mask",
                "aspect_ratio": "1:1",
                "negative_prompt": "模糊, 低质量, 水印, 文字, 拉伸, 变形",
                "num_samples": 1,
                "seed": 42,
                "steps": 30,
                "cfg_scale": 7.5
            }
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            response = requests.post(self.base_url, json=request_data, headers=headers, timeout=60)
            response.raise_for_status()
            
            result = response.json()
            
            if result and 'data' in result and len(result['data']) > 0:
                result_base64 = result['data'][0]['image']
                result_bytes = base64.b64decode(result_base64)
                
                from PIL import Image
                result_image = Image.open(io.BytesIO(result_bytes))
                
                if output_path:
                    result_image.save(output_path)
                
                return result_image
            else:
                raise Exception("AI处理返回结果为空")
                
        except requests.exceptions.RequestException as e:
            raise Exception(f"API请求失败: {str(e)}")
        except Exception as e:
            raise Exception(f"图像处理失败: {str(e)}")