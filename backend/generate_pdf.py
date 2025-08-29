import os
import psycopg2
from datetime import datetime, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from config import DATABASE_CONFIG
from common import (
    get_db_connection,
    get_gender_count,
    get_camera_stats,
    get_area_peak_and_low_periods,
    get_cold_storage_peak_and_low_periods,
)

# 数据库配置
DB_CONFIG = DATABASE_CONFIG


def calculate_individual_stats(camera_name, date_str):
    """
    计算单个摄像头的统计数据（调整为与app.py一致）
    :param camera_name: 摄像头名称
    :param date_str: 日期字符串 (YYYY-MM-DD)
    :return: 包含统计数据的字典
    """
    conn = get_db_connection()
    start_time = f"{date_str} 00:00:00"
    end_time = f"{date_str} 23:59:59"

    try:
        # 使用共通函数获取摄像头统计数据
        stats = get_camera_stats(conn, camera_name, start_time, end_time)
        stats["name"] = f"Camera {camera_name}"

        # 重新组织数据结构以匹配PDF报告的格式
        total_in = stats["total_in"]

        # 计算性别分布（基于进入人数）
        if total_in > 0:
            # 使用get_gender_count函数计算整数性别分布
            gender_count = get_gender_count(
                total_in,
                stats["male_percent"],
                stats["female_percent"],
                stats["unknown_percent"],
            )
            stats["total_males"] = gender_count["male"]
            stats["total_females"] = gender_count["female"]
            stats["total_unknowns"] = gender_count["unknown"]

            # 儿童人数单独计算（向下取整）
            minor_percent = float(stats["minor_percent"])
            stats["total_children"] = int(total_in * minor_percent / 100)
        else:
            stats["total_males"] = 0
            stats["total_females"] = 0
            stats["total_unknowns"] = 0
            stats["total_children"] = 0

        # 使用峰值和低谷时段数据
        stats["highest_period"] = stats["peak_period"]
        stats["lowest_period"] = stats["low_period"]

        # 移除不需要的字段
        stats.pop("peak_period", None)
        stats.pop("low_period", None)
        stats.pop("male_percent", None)
        stats.pop("female_percent", None)
        stats.pop("unknown_percent", None)
        stats.pop("minor_percent", None)

    except Exception as e:
        print(f"Error calculating stats for {camera_name}: {e}")
        # 返回默认统计数据
        stats = {
            "name": f"Camera {camera_name}",
            "total_in": 0,
            "total_out": 0,
            "total_males": 0,
            "total_females": 0,
            "total_children": 0,
            "total_unknowns": 0,
            "highest_period": "N/A",
            "lowest_period": "N/A",
        }
    finally:
        conn.close()

    return stats


def calculate_cold_storage_stats(date_str):
    """
    计算冷库区域统计数据（调整为与app.py一致）
    :param date_str: 日期字符串 (YYYY-MM-DD)
    :return: 包含统计数据的字典
    """
    conn = get_db_connection()
    start_time = f"{date_str} 00:00:00"
    end_time = f"{date_str} 23:59:59"

    try:
        # 获取A7摄像头的统计数据
        a7_stats = get_camera_stats(conn, "A7", start_time, end_time)
        # 获取A6摄像头的统计数据
        a6_stats = get_camera_stats(conn, "A6", start_time, end_time)

        # 计算冷库区域的总进出人数
        a7_in = a7_stats["total_in"]
        a7_out = a7_stats["total_out"]
        a6_in = a6_stats["total_in"]
        a6_out = a6_stats["total_out"]

        cold_storage_in = a7_in + a6_out  # 进入冷库：A7进入 + A6离开
        cold_storage_out = a7_out + a6_in  # 离开冷库：A7离开 + A6进入

        # 计算A7部分的性别分布（基于进入冷库的部分，即A7_in）
        if a7_in > 0:
            a7_gender_count = get_gender_count(
                a7_in,
                a7_stats["male_percent"],
                a7_stats["female_percent"],
                a7_stats["unknown_percent"],
            )
            a7_males = a7_gender_count["male"]
            a7_females = a7_gender_count["female"]
            a7_unknowns = a7_gender_count["unknown"]
            # 计算儿童（向下取整）
            a7_minor_percent = float(a7_stats["minor_percent"])
            a7_children = int(a7_in * a7_minor_percent / 100)
        else:
            a7_males = a7_females = a7_unknowns = a7_children = 0

        # 计算A6部分的性别分布（基于离开A6的人数，即a6_out，这部分人进入冷库）
        if a6_out > 0:
            a6_gender_count = get_gender_count(
                a6_out,
                a6_stats["male_percent"],
                a6_stats["female_percent"],
                a6_stats["unknown_percent"],
            )
            a6_males = a6_gender_count["male"]
            a6_females = a6_gender_count["female"]
            a6_unknowns = a6_gender_count["unknown"]
            # 计算儿童（向下取整）
            a6_minor_percent = float(a6_stats["minor_percent"])
            a6_children = int(a6_out * a6_minor_percent / 100)
        else:
            a6_males = a6_females = a6_unknowns = a6_children = 0

        # 合并A7和A6的数据
        total_males = a7_males + a6_males
        total_females = a7_females + a6_females
        total_unknowns = a7_unknowns + a6_unknowns
        total_children = a7_children + a6_children

        # 计算最高/最低密度时段（基于进入人数，即A7.in_count + A6.out_count）
        peak_period, low_period = get_cold_storage_peak_and_low_periods(
            conn, start_time, end_time
        )

        stats = {
            "name": "Cold Storage",
            "total_in": cold_storage_in,
            "total_out": cold_storage_out,
            "total_males": total_males,
            "total_females": total_females,
            "total_children": total_children,
            "total_unknowns": total_unknowns,
            "highest_period": peak_period,
            "lowest_period": low_period,
        }

    except Exception as e:
        print(f"Error calculating cold storage stats: {e}")
        # 返回默认统计数据
        stats = {
            "name": "Cold Storage",
            "total_in": 0,
            "total_out": 0,
            "total_males": 0,
            "total_females": 0,
            "total_children": 0,
            "total_unknowns": 0,
            "highest_period": "N/A",
            "lowest_period": "N/A",
        }
    finally:
        conn.close()

    return stats


def calculate_area_stats(area_name, cameras, date_str):
    """
    计算指定区域的统计数据（调整为累加各摄像头，并统一计算性别）
    :param area_name: 区域名称
    :param cameras: 摄像头列表
    :param date_str: 日期字符串 (YYYY-MM-DD)
    :return: 包含统计数据的字典
    """
    conn = get_db_connection()
    start_time = f"{date_str} 00:00:00"
    end_time = f"{date_str} 23:59:59"

    try:
        # 初始化统计值
        total_in = 0
        total_out = 0
        total_males = 0
        total_females = 0
        total_children = 0
        total_unknowns = 0

        # 遍历每个摄像头
        for cam in cameras:
            cam_stats = get_camera_stats(conn, cam, start_time, end_time)

            in_cnt = cam_stats["total_in"]
            out_cnt = cam_stats["total_out"]
            total_in += in_cnt
            total_out += out_cnt

            if in_cnt > 0:
                # 计算该摄像头的性别整数分布
                cam_gender_count = get_gender_count(
                    in_cnt,
                    cam_stats["male_percent"],
                    cam_stats["female_percent"],
                    cam_stats["unknown_percent"],
                )
                total_males += cam_gender_count["male"]
                total_females += cam_gender_count["female"]
                total_unknowns += cam_gender_count["unknown"]

                # 计算儿童（向下取整）
                minor_percent = float(cam_stats["minor_percent"])
                cam_children = int(in_cnt * minor_percent / 100)
                total_children += cam_children

        # 计算最高/最低密度时段
        peak_period, low_period = get_area_peak_and_low_periods(
            conn, cameras, start_time, end_time
        )

        stats = {
            "name": area_name,
            "total_in": total_in,
            "total_out": total_out,
            "total_males": total_males,
            "total_females": total_females,
            "total_children": total_children,
            "total_unknowns": total_unknowns,
            "highest_period": peak_period,
            "lowest_period": low_period,
        }

    except Exception as e:
        print(f"Error calculating area stats for {area_name}: {e}")
        # 返回默认统计数据
        stats = {
            "name": area_name,
            "total_in": 0,
            "total_out": 0,
            "total_males": 0,
            "total_females": 0,
            "total_children": 0,
            "total_unknowns": 0,
            "highest_period": "N/A",
            "lowest_period": "N/A",
        }
    finally:
        conn.close()

    return stats


def generate_pdf_report(stats_data, report_date, output_path):
    """
    生成PDF报告
    :param stats_data: 统计数据列表
    :param report_date: 报告日期
    :param output_path: 输出文件路径
    """

    # 确保输出目录存在
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    # 如果文件已存在，尝试删除
    if os.path.exists(output_path):
        try:
            os.remove(output_path)
            print(f"Deleted existing file: {output_path}")
        except Exception as e:
            # 如果删除失败，生成带时间戳的新文件名
            timestamp = datetime.now().strftime("%H%M%S")
            base, ext = os.path.splitext(output_path)
            output_path = f"{base}_{timestamp}{ext}"
            print(f"Failed to delete existing file, using new name: {output_path}")

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18,
    )

    styles = getSampleStyleSheet()

    # 确保只创建一次样式
    custom_styles = {}

    # 创建自定义样式
    if "Title" not in styles:
        styles.add(
            ParagraphStyle(
                name="Title",
                parent=styles["Heading1"],
                fontSize=16,
                alignment=1,  # 1=居中
                spaceAfter=20,
            )
        )
    custom_styles["Title"] = styles["Title"]

    if "Subtitle" not in styles:
        styles.add(
            ParagraphStyle(
                name="Subtitle",
                parent=styles["Heading2"],
                fontSize=12,
                alignment=1,  # 1=居中
                spaceAfter=12,
            )
        )
    custom_styles["Subtitle"] = styles["Subtitle"]

    if "SectionHeader" not in styles:
        styles.add(
            ParagraphStyle(
                name="SectionHeader",
                parent=styles["Heading2"],
                fontSize=14,
                spaceBefore=20,
                spaceAfter=10,
            )
        )
    custom_styles["SectionHeader"] = styles["SectionHeader"]

    elements = []

    # 按照要求的分组格式组织数据
    # 第一页：Cold Storage + 2nd Floor
    # 第二页：Canteen Area + Camera A1
    # 第三页：Camera A3 + Camera A2
    groups = [
        # 第一页组
        [stats_data[0], stats_data[1]],  # Cold Storage  # 2nd Floor
        # 第二页组
        [stats_data[2], stats_data[3]],  # Canteen Area  # Camera A1
        # 第三页组
        [stats_data[4], stats_data[5]],  # Camera A3  # Camera A2
    ]

    # 为每个分组生成页面内容
    for group_index, group in enumerate(groups):
        # 添加页面标题
        elements.append(
            Paragraph(
                f"Analysis Report - Page{group_index + 1}", custom_styles["Title"]
            )
        )

        # 添加报告日期
        elements.append(
            Paragraph(f"Date of Report: {report_date}", custom_styles["Subtitle"])
        )

        # 添加垂直间隔
        elements.append(Spacer(1, 24))

        # 处理分组内的每个区域
        for area_index, area in enumerate(group):
            # 添加区域名称标题
            elements.append(Paragraph(area["name"], custom_styles["SectionHeader"]))

            # 创建数据表格
            data = [
                ["Metric", "Value"],
                ["IN", area["total_in"]],
                ["OUT", area["total_out"]],
                ["Total number of Males", area["total_males"]],
                ["Total number of Females", area["total_females"]],
                ["Total number of Children", area["total_children"]],
                ["Total number of Unknowns", area["total_unknowns"]],
                ["Highest Density of People", area["highest_period"]],
                ["Lowest Density of People", area["lowest_period"]],
            ]

            # 设置固定列宽
            col_widths = [150, 200] 
            
            table = Table(data, colWidths=col_widths)
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 12),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ]
                )
            )

            elements.append(table)

            # 在同一页内的区域之间添加间隔（最后一个区域后不添加）
            if area_index < len(group) - 1:
                elements.append(Spacer(1, 24))

        # 在分组之间添加分页符（最后一组后不添加）
        if group_index < len(groups) - 1:
            elements.append(PageBreak())

    # 生成PDF
    doc.build(elements)
    print(f"PDF report generated at: {output_path}")

def main():
    # 计算前一天的日期
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    # 计算各区域统计数据
    stats_data = []

    # 冷库区域（特殊计算逻辑）
    cold_storage_stats = calculate_cold_storage_stats(yesterday)
    stats_data.append(cold_storage_stats)

    # 二楼区域
    second_floor_stats = calculate_area_stats(
        "2nd Floor", ["A1", "A2", "A3", "A6"], yesterday
    )
    stats_data.append(second_floor_stats)

    # 餐厅区域
    canteen_stats = calculate_area_stats("Canteen Area", ["A4", "A5"], yesterday)
    stats_data.append(canteen_stats)

    # 各个摄像头区域
    stats_data.append(calculate_individual_stats("A1", yesterday))
    stats_data.append(calculate_individual_stats("A3", yesterday))
    stats_data.append(calculate_individual_stats("A2", yesterday))

    # 生成PDF报告
    output_dir = os.path.join(os.path.expanduser("~"), "Desktop", "reports")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"Date of Report({yesterday}).pdf")

    generate_pdf_report(stats_data, yesterday, output_path)


if __name__ == "__main__":
    main()
