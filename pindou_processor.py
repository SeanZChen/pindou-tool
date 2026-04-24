from PIL import Image, ImageDraw, ImageFont
import math
from mard_colors import MARD_221_COLORS

class PindouProcessor:
    def __init__(self):
        self.colors = MARD_221_COLORS
    
    def rgb_to_hex(self, rgb):
        return '#{:02x}{:02x}{:02x}'.format(*rgb)
    
    def color_distance(self, c1, c2):
        r1, g1, b1 = c1
        r2, g2, b2 = c2
        return math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
    
    def find_closest_color(self, pixel_rgb):
        min_distance = float('inf')
        closest_code = 'H2'
        closest_rgb = (255, 255, 255)
        
        for code, rgb in self.colors.items():
            dist = self.color_distance(pixel_rgb, rgb)
            if dist < min_distance:
                min_distance = dist
                closest_code = code
                closest_rgb = rgb
        
        return closest_code, closest_rgb
    
    def downsample(self, img, target_size=52):
        w, h = img.size
        long_side = max(w, h)
        scale = target_size / long_side
        new_w = round(w * scale)
        new_h = round(h * scale)
        img_low = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        return img_low
    
    def restore_mosaic(self, img_low, origin_w, origin_h):
        img_mosaic = img_low.resize((origin_w, origin_h), Image.Resampling.NEAREST)
        return img_mosaic
    
    def map_colors(self, img_low):
        color_map = {}
        pixels = img_low.load()
        w, h = img_low.size
        
        for y in range(h):
            for x in range(w):
                original_rgb = pixels[x, y]
                code, mapped_rgb = self.find_closest_color(original_rgb)
                color_map[(x, y)] = {'code': code, 'original': original_rgb, 'mapped': mapped_rgb}
        
        return color_map
    
    def create_color_mapped_image(self, img_low, color_map, scale_factor=20):
        w, h = img_low.size
        cell_size = scale_factor
        img_out = Image.new('RGB', (w * cell_size, h * cell_size), color=(255, 255, 255))
        draw = ImageDraw.Draw(img_out)
        
        try:
            font = ImageFont.truetype('Arial.ttf', 8)
        except:
            font = ImageFont.load_default()
        
        for (x, y), info in color_map.items():
            mapped_rgb = info['mapped']
            code = info['code']
            
            x_start = x * cell_size
            y_start = y * cell_size
            
            draw.rectangle([x_start, y_start, x_start + cell_size - 1, y_start + cell_size - 1], 
                          fill=mapped_rgb, outline=(128, 128, 128), width=1)
            
            text_bbox = draw.textbbox((0, 0), code, font=font)
            text_w = text_bbox[2] - text_bbox[0]
            text_h = text_bbox[3] - text_bbox[1]
            text_x = x_start + (cell_size - text_w) // 2
            text_y = y_start + (cell_size - text_h) // 2
            
            draw.text((text_x, text_y), code, fill=(0, 0, 0) if sum(mapped_rgb) > 382 else (255, 255, 255), font=font)
        
        return img_out
    
    def process(self, input_path, output_folder, size=52):
        img_origin = Image.open(input_path).convert("RGB")
        ori_w, ori_h = img_origin.size
        
        print(f"原图尺寸：{ori_w} × {ori_h}")
        
        img_low_scale = self.downsample(img_origin, size)
        print(f"降采样尺寸：{img_low_scale.size}")
        
        color_map = self.map_colors(img_low_scale)
        print(f"已映射 {len(color_map)} 个像素点到国产221色拼豆色卡")
        
        color_counts = {}
        for info in color_map.values():
            code = info['code']
            color_counts[code] = color_counts.get(code, 0) + 1
        
        print("\n国产221色拼豆颜色统计：")
        for code, count in sorted(color_counts.items()):
            print(f"  {code}: {count} 颗")
        
        img_result = self.restore_mosaic(img_low_scale, ori_w, ori_h)
        
        scale_factor = max(20, min(40, 1000 // max(img_low_scale.size)))
        img_labeled = self.create_color_mapped_image(img_low_scale, color_map, scale_factor)
        
        return {
            'low_res': img_low_scale,
            'mosaic': img_result,
            'color_map': img_labeled,
            'color_counts': color_counts,
            'original_size': (ori_w, ori_h),
            'downsampled_size': img_low_scale.size
        }