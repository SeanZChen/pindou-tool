import base64
import io
import requests
from volcenginesdkarkruntime import Ark

class AIProcessor:
    def __init__(self, api_key):
        self.api_key = api_key
        self.client = None
    
    def _init_client(self):
        if self.client is None:
            self.client = Ark(
                base_url="https://ark.cn-beijing.volces.com/api/v3",
                api_key=self.api_key
            )
    
    def optimize_image(self, image_path, output_path=None):
        """
        使用火山引擎AI模型优化图像
        :param image_path: 输入图片路径
        :param output_path: 输出图片路径（可选）
        :return: 优化后的图片对象
        """
        self._init_client()
        
        try:
            with open(image_path, 'rb') as f:
                image_bytes = f.read()
            
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            image_data_uri = f"data:image/png;base64,{image_base64}"
            
            prompt = "首先选出图像中的主体，若主体存在遮挡，则尝试对前景进行补全。将补全后的主体转化为卡通简洁画风，居中，大色块，8-bit 画风，生成长宽比为1:1的图像"
            
            response = self.client.images.generate(
                model="doubao-seedream-4-0-250828",
                prompt=prompt,
                image=image_data_uri,
                sequential_image_generation="disabled",
                response_format="url",
                size="256x256",
                stream=False,
                watermark=False
            )
            
            if response and response.data and len(response.data) > 0:
                image_url = response.data[0].url
                
                image_response = requests.get(image_url, timeout=60)
                image_response.raise_for_status()
                
                from PIL import Image
                result_image = Image.open(io.BytesIO(image_response.content))
                
                if output_path:
                    result_image.save(output_path)
                
                return result_image
            else:
                raise Exception("AI处理返回结果为空")
                
        except Exception as e:
            raise Exception(f"图像处理失败: {str(e)}")