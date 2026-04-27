from PIL import Image, ImageDraw, ImageFont
import math
import json
from mard_colors import MARD_221_COLORS

# TODO: [Smart Mode] 添加 AI 接口所需的依赖
# import requests
# import base64

class PindouProcessor:
    def __init__(self):
        self.colors = MARD_221_COLORS
        # TODO: [Smart Mode] 初始化 AI 相关配置
        # self.ai_api_url = "https://api.example.com/process"  # AI 模型接口地址
    
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
            if code == 'H1':
                continue
            
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
    
    def create_color_mapped_image(self, img_low, color_map, scale_factor=20, color_counts=None, high_res_short_edge=4096):
        w, h = img_low.size
        
        if high_res_short_edge > 0:
            min_dim = min(w, h)
            cell_size = high_res_short_edge // min_dim
        else:
            cell_size = scale_factor
        
        stats_height = 0
        if color_counts:
            stats_height = (len(color_counts) // 8 + 1) * 25 + 20
        
        img_out = Image.new('RGB', (w * cell_size, h * cell_size + stats_height), color=(255, 255, 255))
        draw = ImageDraw.Draw(img_out)
        
        font_size = max(8, min(12, cell_size // 3))
        try:
            font = ImageFont.truetype('Arial.ttf', font_size)
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
        
        if color_counts:
            draw.text((10, h * cell_size + 5), "色块统计：", fill=(0, 0, 0), font=font)
            
            sorted_colors = sorted(color_counts.items(), key=lambda x: (-x[1], x[0]))
            row = 0
            col = 0
            
            for code, count in sorted_colors:
                x_pos = 10 + col * 100
                y_pos = h * cell_size + 20 + row * 20
                
                color_rgb = self.colors.get(code, (255, 255, 255))
                draw.rectangle([x_pos, y_pos, x_pos + 16, y_pos + 16], fill=color_rgb, outline=(128, 128, 128), width=1)
                
                text = f"{code}: {count}"
                draw.text((x_pos + 20, y_pos), text, fill=(0, 0, 0), font=font)
                
                col += 1
                if col >= 8:
                    col = 0
                    row += 1
        
        return img_out

    def simplify_colors(self, color_map, color_counts, min_count=3):
        w = max(k[0] for k in color_map.keys()) + 1
        h = max(k[1] for k in color_map.keys()) + 1
        
        colors_to_remove = {code for code, count in color_counts.items() if count <= min_count}
        if not colors_to_remove:
            return color_map, color_counts
        
        print(f"\n正在简化颜色：移除数量小于等于 {min_count} 的 {len(colors_to_remove)} 种颜色")
        
        simplified_map = color_map.copy()
        
        for (x, y), info in list(simplified_map.items()):
            if info['code'] in colors_to_remove:
                neighbors = []
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) in simplified_map:
                        neighbors.append(simplified_map[(nx, ny)]['code'])
                
                if neighbors:
                    neighbor_counts = {}
                    for n in neighbors:
                        neighbor_counts[n] = neighbor_counts.get(n, 0) + 1
                    new_code = max(neighbor_counts, key=neighbor_counts.get)
                    simplified_map[(x, y)] = {
                        'code': new_code,
                        'original': info['original'],
                        'mapped': self.colors.get(new_code, (255, 255, 255))
                    }
        
        new_color_counts = {}
        for info in simplified_map.values():
            code = info['code']
            new_color_counts[code] = new_color_counts.get(code, 0) + 1
        
        print("简化后颜色统计：")
        for code, count in sorted(new_color_counts.items()):
            print(f"  {code}: {count} 颗")
        
        return simplified_map, new_color_counts
    
    def process(self, input_path, output_folder, size=52, simplify=False, min_count=3, high_res_short_edge=4096):
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
        
        original_color_map_img = None
        original_color_counts = color_counts.copy()
        if simplify:
            original_color_map_img = self.create_color_mapped_image(img_low_scale, color_map, color_counts=color_counts, high_res_short_edge=high_res_short_edge)
            color_map, color_counts = self.simplify_colors(color_map, color_counts, min_count)
        
        img_result = self.restore_mosaic(img_low_scale, ori_w, ori_h)
        img_labeled = self.create_color_mapped_image(img_low_scale, color_map, color_counts=color_counts, high_res_short_edge=high_res_short_edge)
        
        dou_data = self.create_dou_data(color_map, img_low_scale.size)
        
        return {
            'low_res': img_low_scale,
            'mosaic': img_result,
            'color_map': img_labeled,
            'color_counts': color_counts,
            'original_size': (ori_w, ori_h),
            'downsampled_size': img_low_scale.size,
            'original_color_map': original_color_map_img,
            'original_color_counts': original_color_counts,
            'dou_data': dou_data
        }
    
    def create_dou_data(self, color_map, size):
        w, h = size
        grid = [[None for _ in range(w)] for _ in range(h)]
        
        for (x, y), info in color_map.items():
            grid[y][x] = info['code']
        
        used_colors = {}
        for (x, y), info in color_map.items():
            code = info['code']
            if code not in used_colors:
                used_colors[code] = list(info['mapped'])
        
        return {
            'width': w,
            'height': h,
            'grid': grid,
            'color_map': used_colors
        }
    
    def save_dou_file(self, dou_data, file_path):
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(dou_data, f, ensure_ascii=False, indent=2)
    
    def load_dou_file(self, file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def dou_to_image(self, dou_data, high_res_short_edge=4096):
        w = dou_data['width']
        h = dou_data['height']
        grid = dou_data['grid']
        color_map = dou_data.get('color_map', {})
        
        if high_res_short_edge > 0:
            min_dim = min(w, h)
            cell_size = high_res_short_edge // min_dim
        else:
            cell_size = 20
        
        stats_height = 0
        color_counts = {}
        for row in grid:
            for code in row:
                if code:
                    color_counts[code] = color_counts.get(code, 0) + 1
        
        if color_counts:
            stats_height = (len(color_counts) // 8 + 1) * 25 + 20
        
        img_out = Image.new('RGBA', (w * cell_size, h * cell_size + stats_height), color=(255, 255, 255, 255))
        draw = ImageDraw.Draw(img_out)
        
        font_size = max(8, min(12, cell_size // 3))
        try:
            font = ImageFont.truetype('Arial.ttf', font_size)
        except:
            font = ImageFont.load_default()
        
        for y in range(h):
            for x in range(w):
                code = grid[y][x]
                if code:
                    mapped_rgb = color_map.get(code, (255, 255, 255))
                    if isinstance(mapped_rgb, list):
                        mapped_rgb = tuple(mapped_rgb)
                    
                    x_start = x * cell_size
                    y_start = y * cell_size
                    
                    draw.rectangle([x_start, y_start, x_start + cell_size - 1, y_start + cell_size - 1], 
                                  fill=mapped_rgb + (255,) if len(mapped_rgb) == 3 else mapped_rgb, 
                                  outline=(128, 128, 128), width=1)
                    
                    text_bbox = draw.textbbox((0, 0), code, font=font)
                    text_w = text_bbox[2] - text_bbox[0]
                    text_h = text_bbox[3] - text_bbox[1]
                    text_x = x_start + (cell_size - text_w) // 2
                    text_y = y_start + (cell_size - text_h) // 2
                    
                    if len(mapped_rgb) >= 3:
                        fill_color = (0, 0, 0) if sum(mapped_rgb[:3]) > 382 else (255, 255, 255)
                    else:
                        fill_color = (0, 0, 0)
                    draw.text((text_x, text_y), code, fill=fill_color, font=font)
        
        if color_counts:
            draw.text((10, h * cell_size + 5), "色块统计：", fill=(0, 0, 0), font=font)
            
            sorted_colors = sorted(color_counts.items(), key=lambda x: (-x[1], x[0]))
            row = 0
            col = 0
            
            for code, count in sorted_colors:
                x_pos = 10 + col * 100
                y_pos = h * cell_size + 20 + row * 20
                
                color_rgb = color_map.get(code, (255, 255, 255))
                if isinstance(color_rgb, list):
                    color_rgb = tuple(color_rgb)
                
                draw.rectangle([x_pos, y_pos, x_pos + 16, y_pos + 16], 
                              fill=color_rgb + (255,) if len(color_rgb) == 3 else color_rgb, 
                              outline=(128, 128, 128), width=1)
                
                text = f"{code}: {count}"
                draw.text((x_pos + 20, y_pos), text, fill=(0, 0, 0), font=font)
                
                col += 1
                if col >= 8:
                    col = 0
                    row += 1
        
        return img_out