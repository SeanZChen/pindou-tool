import argparse
import os
from pindou_processor import PindouProcessor

def main():
    parser = argparse.ArgumentParser(description='拼豆图片预处理工具 - 将图片转换为国产221色拼豆色卡映射')
    
    parser.add_argument('-i', '--input', required=True, help='输入图片路径')
    parser.add_argument('-o', '--output', required=True, help='输出文件夹路径（自动创建）')
    parser.add_argument('-s', '--size', type=int, default=52, help='下采样后的长边分辨率 (默认: 52)')
    
    args = parser.parse_args()
    
    os.makedirs(args.output, exist_ok=True)
    
    processor = PindouProcessor()
    result = processor.process(args.input, args.output, args.size)
    
    low_res_path = os.path.join(args.output, "low_res.png")
    mosaic_path = os.path.join(args.output, "mosaic.png")
    color_map_path = os.path.join(args.output, "color_map.png")
    
    result['low_res'].save(low_res_path)
    result['mosaic'].save(mosaic_path)
    result['color_map'].save(color_map_path)
    
    print("\n已保存到文件夹：", args.output)
    print(f"  low_res.png - 低分辨率图")
    print(f"  mosaic.png - 马赛克效果原图")
    print(f"  color_map.png - 国产221色拼豆颜色映射图（带颜色代码）")

if __name__ == "__main__":
    main()