import argparse
import os
from pindou_processor import PindouProcessor

def main():
    parser = argparse.ArgumentParser(description='拼豆图片预处理工具 - 将图片转换为国产221色拼豆色卡映射')
    
    parser.add_argument('-i', '--input', required=True, help='输入图片路径')
    parser.add_argument('-o', '--output', required=True, help='输出文件夹路径（自动创建）')
    parser.add_argument('-s', '--size', type=int, default=52, help='下采样后的长边分辨率 (默认: 52)')
    parser.add_argument('--simplify', action='store_true', help='启用颜色简化模式')
    parser.add_argument('-k', '--min-count', type=int, default=3, help='最小豆子数量阈值，小于等于此值的颜色将被合并 (默认: 3)')
    parser.add_argument('--ai', action='store_true', help='启用火山引擎AI图像优化')
    parser.add_argument('--api-key', help='火山引擎API Key（启用AI优化时必填）')
    
    args = parser.parse_args()
    
    os.makedirs(args.output, exist_ok=True)
    
    input_path = args.input
    ai_processed_path = None
    
    if args.ai:
        if not args.api_key:
            parser.error('启用AI优化时必须提供 --api-key 参数')
        
        from ai_processor import AIProcessor
        
        print("正在调用火山引擎AI进行图像优化...")
        ai_processor = AIProcessor(args.api_key)
        ai_processed_path = os.path.join(args.output, "ai_processed.png")
        
        try:
            ai_processor.optimize_image(args.input, ai_processed_path)
            input_path = ai_processed_path
            print(f"AI优化完成，结果已保存到: {ai_processed_path}")
        except Exception as e:
            print(f"AI优化失败，将使用原图进行处理: {str(e)}")
            input_path = args.input
    
    processor = PindouProcessor()
    result = processor.process(input_path, args.output, args.size, args.simplify, args.min_count)
    
    low_res_path = os.path.join(args.output, "low_res.png")
    mosaic_path = os.path.join(args.output, "mosaic.png")
    color_map_path = os.path.join(args.output, "color_map.png")
    
    result['low_res'].save(low_res_path)
    result['mosaic'].save(mosaic_path)
    result['color_map'].save(color_map_path)
    
    print("\n已保存到文件夹：", args.output)
    
    if ai_processed_path:
        print(f"  ai_processed.png - AI优化后的图片")
    
    print(f"  low_res.png - 低分辨率图")
    print(f"  mosaic.png - 马赛克效果原图")
    
    if args.simplify:
        original_color_map_path = os.path.join(args.output, "color_map_original.png")
        result['original_color_map'].save(original_color_map_path)
        print(f"  color_map_original.png - 简化前的颜色映射图")
        print(f"  color_map.png - 简化后的颜色映射图（移除数量<= {args.min_count} 的颜色）")
    else:
        print(f"  color_map.png - 国产221色拼豆颜色映射图（带颜色代码）")

if __name__ == "__main__":
    main()