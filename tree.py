import os
import argparse

def generate_file_tree(start_path, output_file=None, ignore_list=[], indent=0, is_last=True, prefix=''):
    """
    生成文件树结构
    :param start_path: 起始目录路径
    :param output_file: 输出文件对象(可选)
    :param ignore_list: 要忽略的文件夹列表
    :param indent: 缩进层级
    :param is_last: 当前项是否是父级最后一项
    :param prefix: 当前前缀符号
    """
    # 获取排序后的目录内容 (文件夹优先)
    items = []
    try:
        dir_contents = os.listdir(start_path)
    except PermissionError:
        return
        
    # 分离文件和文件夹
    dirs = []
    files = []
    for name in dir_contents:
        full_path = os.path.join(start_path, name)
        if os.path.isdir(full_path) and name not in ignore_list:
            dirs.append(name)
        elif os.path.isfile(full_path) and name not in ignore_list:
            files.append(name)
    
    # 按名称排序 (不区分大小写)
    dirs.sort(key=lambda s: s.lower())
    files.sort(key=lambda s: s.lower())
    items = dirs + files
    total_items = len(items)
    
    # 打印当前目录
    current_line = f"{prefix}{'└── ' if is_last else '├── '}{os.path.basename(start_path)}/"
    print_and_save(current_line, output_file, indent)
    
    # 更新缩进前缀
    new_prefix = prefix + ('    ' if is_last else '│   ')
    
    # 处理每个子项
    for i, name in enumerate(items):
        full_path = os.path.join(start_path, name)
        is_last_item = (i == total_items - 1)
        
        if os.path.isdir(full_path):
            # 递归处理子目录
            generate_file_tree(
                full_path, 
                output_file, 
                ignore_list, 
                indent + 1,
                is_last_item, 
                new_prefix
            )
        else:
            # 处理文件
            file_line = f"{new_prefix}{'└── ' if is_last_item else '├── '}{name}"
            print_and_save(file_line, output_file, indent + 1)

def print_and_save(text, output_file, indent=0):
    """打印并可选地保存到文件"""
    formatted_text = '    ' * indent + text
    print(formatted_text)
    if output_file:
        output_file.write(formatted_text + '\n')

if __name__ == "__main__":
    # 设置命令行参数
    parser = argparse.ArgumentParser(description='生成目录树')
    parser.add_argument('directory', nargs='?', default=os.getcwd(), 
                        help='目标目录 (默认为当前目录)')
    parser.add_argument('-o', '--output', metavar='FILE', 
                        help='输出到文件 (如: file_tree.txt)')
    parser.add_argument('-i', '--ignore', nargs='*', default=['.git', '__pycache__', 'node_modules'], 
                        help='忽略的文件夹 (空格分隔)')
    parser.add_argument('-a', '--all', action='store_true', 
                        help='包含隐藏文件和系统文件')
    
    args = parser.parse_args()
    
    # 准备忽略列表
    ignore_list = args.ignore if args.ignore else []
    if not args.all:
        ignore_list.extend(['.git', 'venv', '__pycache__', 'node_modules', '.idea', '.vscode'])
    
    # 检查目录是否存在
    if not os.path.exists(args.directory):
        print(f"错误: 目录 '{args.directory}' 不存在")
        exit(1)
    
    # 设置输出文件
    output_file = None
    if args.output:
        try:
            output_file = open(args.output, 'w', encoding='utf-8')
            print(f"文件树已保存至: {os.path.abspath(args.output)}")
        except IOError:
            print(f"无法写入文件: {args.output}")
            exit(1)
    
    # 生成文件树
    print(f"生成目录树: {os.path.abspath(args.directory)}")
    generate_file_tree(args.directory, output_file, ignore_list)
    
    # 关闭文件
    if output_file:
        output_file.close()