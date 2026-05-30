#!/usr/bin/env python3
"""
拼接多张图片为一张长图
用于游戏更新可视化长图生成
"""

from PIL import Image
import os
import sys
from pathlib import Path


def concat_images(image_paths, output_path, background_color=(255, 255, 255)):
    """
    将多张图片垂直拼接为一张长图
    
    Args:
        image_paths: 图片路径列表
        output_path: 输出路径
        background_color: 背景颜色，默认白色
    """
    # 加载所有图片
    images = []
    for path in image_paths:
        img = Image.open(path)
        images.append(img)
        print(f"Loaded: {os.path.basename(path)} - Size: {img.size}")
    
    # 计算总高度和最大宽度
    total_height = sum(img.height for img in images)
    max_width = max(img.width for img in images)
    
    print(f"\nTotal height: {total_height}, Max width: {max_width}")
    
    # 创建新图片
    result = Image.new('RGB', (max_width, total_height), background_color)
    
    # 拼接图片（居中）
    y_offset = 0
    for img in images:
        x_offset = (max_width - img.width) // 2
        result.paste(img, (x_offset, y_offset))
        y_offset += img.height
    
    # 保存
    result.save(output_path, 'PNG', quality=95)
    print(f"\nSaved to: {output_path}")
    print(f"Final size: {result.size}")
    
    return output_path


def main():
    """命令行入口"""
    if len(sys.argv) < 3:
        print("Usage: python concat_images.py <output.png> <image1.png> [image2.png ...]")
        print("\nExample:")
        print("  python concat_images.py update-full.png 01.png 02.png 03.png")
        sys.exit(1)
    
    output_path = sys.argv[1]
    image_paths = sys.argv[2:]
    
    # 检查文件是否存在
    for path in image_paths:
        if not os.path.exists(path):
            print(f"Error: File not found: {path}")
            sys.exit(1)
    
    concat_images(image_paths, output_path)


if __name__ == "__main__":
    main()
