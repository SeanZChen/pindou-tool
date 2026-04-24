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
    
    # TODO: [Smart Mode] 添加 smart 模式参数
    # parser.add_argument('--smart', action='store_true', help='启用 AI 智能处理模式')
    # parser.add_argument('--token', help='AI 模型接口的 API Token')
    
    args = parser.parse_args()
    
    os.makedirs(args.output, exist_ok=True)
    
    processor = PindouProcessor()
    
    # TODO: [Smart Mode] 如果启用 smart 模式，先调用 AI 处理图片
    # if args.smart:
    #     ai_processed_path = os.path.join(args.output, "ai_processed.png")
    #     processor.ai_process(args.input, ai_processed_path, args.token)
    #     input_path = ai_processed_path
    # else:
    #     input_path = args.input
    
    input_path = args.input  # TODO: [Smart Mode] 移除此行，使用上面的逻辑
    result = processor.process(input_path, args.output, args.size, args.simplify, args.min_count)
    
    low_res_path = os.path.join(args.output, "low_res.png")
    mosaic_path = os.path.join(args.output, "mosaic.png")
    color_map_path = os.path.join(args.output, "color_map.png")
    
    result['low_res'].save(low_res_path)
    result['mosaic'].save(mosaic_path)
    result['color_map'].save(color_map_path)
    
    print("\n已保存到文件夹：", args.output)
    print(f"  low_res.png - 低分辨率图")
    print(f"  mosaic.png - 马赛克效果原图")
    
    if args.simplify:
        original_color_map_path = os.path.join(args.output, "color_map_original.png")
        result['original_color_map'].save(original_color_map_path)
        print(f"  color_map_original.png - 简化前的颜色映射图")
        print(f"  color_map.png - 简化后的颜色映射图（移除数量<= {args.min_count} 的颜色）")
    else:
        print(f"  color_map.png - 国产221色拼豆颜色映射图（带颜色代码）")
    # TODO: [Smart Mode] 如果启用 smart 模式，打印 AI 处理相关信息
    # if args.smart:
    #     print(f"  ai_processed.png - AI 处理后的图片")

if __name__ == "__main__":
    main()