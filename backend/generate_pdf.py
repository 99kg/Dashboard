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

# 数据库配置
DB_CONFIG = DATABASE_CONFIG


def get_db_connection():
    """创建并返回数据库连接"""
    return psycopg2.connect(**DB_CONFIG)


def calculate_net_flow_stats(cameras, date_str):
    """
    计算指定摄像头组合的统计数据
    :param cameras: 摄像头列表
    :param date_str: 日期字符串 (YYYY-MM-DD)
    :return: 包含统计数据的字典
    """
    conn = get_db_connection()
    cur = conn.cursor()
    stats = {
        "total_in": 0,
        "total_out": 0,
        "total_males": 0,
        "total_females": 0,
        "total_children": 0,
        "total_unknowns": 0,
    }

    try:
        total_in = 0
        total_out = 0
        gender_data = {"male": 0.0, "female": 0.0, "unknown": 0.0}
        minor_float = 0.0

        start_time = f"{date_str} 00:00:00"
        end_time = f"{date_str} 23:59:59"

        # 计算每个摄像头的进出流量和性别分布
        for cam in cameras:
            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(in_count), 0),
                    COALESCE(SUM(out_count), 0),
                    COALESCE(SUM(male_count), 0),
                    COALESCE(SUM(female_count), 0),
                    COALESCE(SUM(minor_count), 0),
                    COALESCE(SUM(unknown_gender_count), 0),
                    COALESCE(SUM(total_people), 0)
                FROM video_analysis
                WHERE camera_name = %s 
                AND start_time >= %s AND end_time <= %s
                """,
                (cam, start_time, end_time),
            )
            row = cur.fetchone()
            if row:
                in_cnt, out_cnt, male, female, minor, unknown, total = row
                total_in += in_cnt
                total_out += out_cnt

                # 按进入比例分配性别和儿童
                if total > 0 and in_cnt > 0:
                    in_ratio = in_cnt / total
                    gender_data["male"] += male * in_ratio
                    gender_data["female"] += female * in_ratio
                    gender_data["unknown"] += unknown * in_ratio
                    minor_float += minor * in_ratio

        # 向下取整并分配余数
        male_int = int(gender_data["male"])
        female_int = int(gender_data["female"])
        unknown_int = int(gender_data["unknown"])
        # 儿童单独处理（不参与余数分配）
        minor_int = round(minor_float)

        allocated = male_int + female_int + unknown_int
        remainder = total_in - allocated

        # 按小数部分分配余数
        fractions = {
            "male": gender_data["male"] - male_int,
            "female": gender_data["female"] - female_int,
            "unknown": gender_data["unknown"] - unknown_int,
        }
        sorted_fractions = sorted(fractions.items(), key=lambda x: x[1], reverse=True)

        for i in range(abs(remainder)):
            key = sorted_fractions[i % 3][0]
            if remainder > 0:
                if key == "male":
                    male_int += 1
                elif key == "female":
                    female_int += 1
                else:
                    unknown_int += 1
            else:
                if key == "male" and male_int > 0:
                    male_int -= 1
                elif key == "female" and female_int > 0:
                    female_int -= 1
                elif key == "unknown" and unknown_int > 0:
                    unknown_int -= 1

        stats["total_in"] = total_in
        stats["total_out"] = total_out
        stats["total_males"] = male_int
        stats["total_females"] = female_int
        stats["total_unknowns"] = unknown_int
        stats["total_children"] = min(max(0, minor_int), total_in)  # 确保儿童数有效

    except Exception as e:
        print(f"Error calculating net flow stats: {e}")
    finally:
        cur.close()
        conn.close()

    return stats


def calculate_individual_stats(camera_name, date_str):
    """
    计算单个摄像头的统计数据
    :param camera_name: 摄像头名称
    :param date_str: 日期字符串 (YYYY-MM-DD)
    :return: 包含统计数据的字典
    """
    conn = get_db_connection()
    cur = conn.cursor()
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

    try:
        # 计算累计数据
        query = """
            SELECT 
                COALESCE(SUM(in_count), 0),
                COALESCE(SUM(out_count), 0),
                COALESCE(SUM(male_count), 0),
                COALESCE(SUM(female_count), 0),
                COALESCE(SUM(minor_count), 0),
                COALESCE(SUM(unknown_gender_count), 0),
                COALESCE(SUM(total_people), 0)
            FROM video_analysis
            WHERE camera_name = %s
            AND start_time >= %s AND end_time <= %s
        """
        params = [camera_name, f"{date_str} 00:00:00", f"{date_str} 23:59:59"]
        cur.execute(query, params)
        row = cur.fetchone()

        if row:
            in_cnt, out_cnt, male, female, minor, unknown, total = row
            stats["total_in"] = in_cnt
            stats["total_out"] = out_cnt

            # 计算性别分布（基于进入人数）
            if total > 0 and in_cnt > 0:
                in_ratio = in_cnt / total
                male_float = male * in_ratio
                female_float = female * in_ratio
                unknown_float = unknown * in_ratio
                minor_float = minor * in_ratio

                # 向下取整并分配余数
                male_int = int(male_float)
                female_int = int(female_float)
                unknown_int = int(unknown_float)
                # 儿童单独处理（不参与余数分配）
                minor_int = round(minor_float)

                allocated = male_int + female_int + unknown_int
                remainder = in_cnt - allocated

                fractions = {
                    "male": male_float - male_int,
                    "female": female_float - female_int,
                    "unknown": unknown_float - unknown_int,
                }
                sorted_fractions = sorted(
                    fractions.items(), key=lambda x: x[1], reverse=True
                )

                for i in range(abs(remainder)):
                    key = sorted_fractions[i % 3][0]
                    if remainder > 0:
                        if key == "male":
                            male_int += 1
                        elif key == "female":
                            female_int += 1
                        else:
                            unknown_int += 1
                    else:
                        if key == "male" and male_int > 0:
                            male_int -= 1
                        elif key == "female" and female_int > 0:
                            female_int -= 1
                        elif key == "unknown" and unknown_int > 0:
                            unknown_int -= 1

                stats["total_males"] = male_int
                stats["total_females"] = female_int
                stats["total_unknowns"] = unknown_int
                stats["total_children"] = min(max(0, minor_int), in_cnt)

        # 计算最高/最低密度时段（基于进入人数）
        query = """
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                in_count AS count
            FROM video_analysis
            WHERE camera_name = %s 
            AND start_time >= %s AND end_time <= %s
            ORDER BY in_count DESC
            LIMIT 1
        """
        cur.execute(query, params)
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] > 0:
            stats["highest_period"] = f"{peak_row[0]}, {peak_row[1]} pax"
        else:
            stats["highest_period"] = "N/A"

        query = """
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                in_count AS count
            FROM video_analysis
            WHERE camera_name = %s 
            AND start_time >= %s AND end_time <= %s
            ORDER BY in_count ASC
            LIMIT 1
        """
        cur.execute(query, params)
        low_row = cur.fetchone()
        if low_row:
            stats["lowest_period"] = f"{low_row[0]}, {low_row[1]} pax"
        else:
            stats["lowest_period"] = "N/A"

    except Exception as e:
        print(f"Error calculating stats for {camera_name}: {e}")
    finally:
        cur.close()
        conn.close()

    return stats


def calculate_cold_storage_stats(date_str):
    """
    计算冷库区域统计数据（使用文档1的方法）
    :param date_str: 日期字符串 (YYYY-MM-DD)
    :return: 包含统计数据的字典
    """
    conn = get_db_connection()
    cur = conn.cursor()
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

    try:
        start_time = f"{date_str} 00:00:00"
        end_time = f"{date_str} 23:59:59"

        # 获取A7摄像头的统计数据
        cur.execute(
            """
            SELECT 
                COALESCE(SUM(in_count), 0),
                COALESCE(SUM(out_count), 0),
                COALESCE(SUM(male_count), 0),
                COALESCE(SUM(female_count), 0),
                COALESCE(SUM(minor_count), 0),
                COALESCE(SUM(unknown_gender_count), 0),
                COALESCE(SUM(total_people), 0)
            FROM video_analysis
            WHERE camera_name = 'A7'
            AND start_time >= %s AND end_time <= %s
            """,
            (start_time, end_time),
        )
        a7_row = cur.fetchone()
        
        # 获取A6摄像头的统计数据
        cur.execute(
            """
            SELECT 
                COALESCE(SUM(in_count), 0),
                COALESCE(SUM(out_count), 0),
                COALESCE(SUM(male_count), 0),
                COALESCE(SUM(female_count), 0),
                COALESCE(SUM(minor_count), 0),
                COALESCE(SUM(unknown_gender_count), 0),
                COALESCE(SUM(total_people), 0)
            FROM video_analysis
            WHERE camera_name = 'A6'
            AND start_time >= %s AND end_time <= %s
            """,
            (start_time, end_time),
        )
        a6_row = cur.fetchone()

        # 计算冷库区域的总进出人数
        a7_in = a7_row[0] if a7_row else 0
        a6_out = a6_row[1] if a6_row else 0  # A6的离开人数对应进入冷库
        stats["total_in"] = a7_in + a6_out
        
        # 计算冷库区域的总离开人数
        a7_out = a7_row[1] if a7_row else 0
        a6_in = a6_row[0] if a6_row else 0   # A6的进入人数对应离开冷库
        stats["total_out"] = a7_out + a6_in

        # 计算A7的性别和儿童比例
        a7_total = a7_row[6] if a7_row and a7_row[6] > 0 else 1
        a7_male_ratio = a7_row[2] / a7_total
        a7_female_ratio = a7_row[3] / a7_total
        a7_minor_ratio = a7_row[4] / a7_total
        a7_unknown_ratio = a7_row[5] / a7_total

        # 计算A6的性别和儿童比例
        a6_total = a6_row[6] if a6_row and a6_row[6] > 0 else 1
        a6_male_ratio = a6_row[2] / a6_total
        a6_female_ratio = a6_row[3] / a6_total
        a6_minor_ratio = a6_row[4] / a6_total
        a6_unknown_ratio = a6_row[5] / a6_total

        # 计算A7的性别和儿童数量（使用文档1的方法）
        a7_male_float = a7_in * a7_male_ratio
        a7_female_float = a7_in * a7_female_ratio
        a7_minor_float = a7_in * a7_minor_ratio
        a7_unknown_float = a7_in * a7_unknown_ratio
        
        a7_male_int = int(a7_male_float)
        a7_female_int = int(a7_female_float)
        a7_unknown_int = int(a7_unknown_float)
        a7_minor_int = int(a7_minor_float)
        
        allocated = a7_male_int + a7_female_int + a7_unknown_int
        remainder = a7_in - allocated
        
        fractions = {
            "male": a7_male_float - a7_male_int,
            "female": a7_female_float - a7_female_int,
            "unknown": a7_unknown_float - a7_unknown_int,
        }
        sorted_fractions = sorted(fractions.items(), key=lambda x: x[1], reverse=True)
        
        for i in range(remainder):
            key = sorted_fractions[i % 3][0]
            if key == "male":
                a7_male_int += 1
            elif key == "female":
                a7_female_int += 1
            else:
                a7_unknown_int += 1

        # 计算A6的性别和儿童数量（使用文档1的方法）
        a6_male_float = a6_out * a6_male_ratio
        a6_female_float = a6_out * a6_female_ratio
        a6_minor_float = a6_out * a6_minor_ratio
        a6_unknown_float = a6_out * a6_unknown_ratio
        
        a6_male_int = int(a6_male_float)
        a6_female_int = int(a6_female_float)
        a6_unknown_int = int(a6_unknown_float)
        a6_minor_int = int(a6_minor_float)
        
        allocated = a6_male_int + a6_female_int + a6_unknown_int
        remainder = a6_out - allocated
        
        fractions = {
            "male": a6_male_float - a6_male_int,
            "female": a6_female_float - a6_female_int,
            "unknown": a6_unknown_float - a6_unknown_int,
        }
        sorted_fractions = sorted(fractions.items(), key=lambda x: x[1], reverse=True)
        
        for i in range(remainder):
            key = sorted_fractions[i % 3][0]
            if key == "male":
                a6_male_int += 1
            elif key == "female":
                a6_female_int += 1
            else:
                a6_unknown_int += 1

        # 合并A7和A6的数据
        stats["total_males"] = a7_male_int + a6_male_int
        stats["total_females"] = a7_female_int + a6_female_int
        stats["total_children"] = a7_minor_int + a6_minor_int
        stats["total_unknowns"] = a7_unknown_int + a6_unknown_int

        # 计算最高密度时段（基于进入人数）
        cur.execute(
            """
            SELECT 
                TO_CHAR(A7.start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(A7.end_time, 'HH24:MI:SS') AS period,
                (A7.in_count + A6.out_count) AS count
            FROM video_analysis A7
            JOIN video_analysis A6 
                ON A7.start_time = A6.start_time AND A7.end_time = A6.end_time
            WHERE A7.camera_name = 'A7'
            AND A6.camera_name = 'A6'
            AND A7.start_time >= %s AND A7.end_time <= %s
            ORDER BY (A7.in_count + A6.out_count) DESC
            LIMIT 1
            """,
            (start_time, end_time),
        )
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] >= 0:
            stats["highest_period"] = f"{peak_row[0]}, {peak_row[1]} pax"
        else:
            stats["highest_period"] = "N/A"

        # 计算最低密度时段
        cur.execute(
            """
            SELECT 
                TO_CHAR(A7.start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(A7.end_time, 'HH24:MI:SS') AS period,
                (A7.in_count + A6.out_count) AS count
            FROM video_analysis A7
            JOIN video_analysis A6 
                ON A7.start_time = A6.start_time AND A7.end_time = A6.end_time
            WHERE A7.camera_name = 'A7'
            AND A6.camera_name = 'A6'
            AND A7.start_time >= %s AND A7.end_time <= %s
            ORDER BY (A7.in_count + A6.out_count) ASC
            LIMIT 1
            """,
            (start_time, end_time),
        )
        low_row = cur.fetchone()
        if low_row and low_row[1] >= 0:
            stats["lowest_period"] = f"{low_row[0]}, {low_row[1]} pax"
        else:
            stats["lowest_period"] = "N/A"

    except Exception as e:
        print(f"Error calculating cold storage stats: {e}")
    finally:
        cur.close()
        conn.close()

    return stats


def calculate_area_stats(area_name, cameras, date_str):
    """
    计算指定区域的统计数据
    :param area_name: 区域名称
    :param cameras: 摄像头列表
    :param date_str: 日期字符串 (YYYY-MM-DD)
    :return: 包含统计数据的字典
    """
    # 使用修改后的计算函数
    stats = calculate_net_flow_stats(cameras, date_str)
    stats["name"] = area_name
    stats["highest_period"] = "N/A"
    stats["lowest_period"] = "N/A"

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        start_time = f"{date_str} 00:00:00"
        end_time = f"{date_str} 23:59:59"
        placeholders = ",".join(["%s"] * len(cameras))
        params = cameras + [start_time, end_time]

        # 使用进入人数计算最高密度时段
        query = f"""
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                SUM(in_count) AS count
            FROM video_analysis
            WHERE camera_name IN ({placeholders})
            AND start_time >= %s AND end_time <= %s
            GROUP BY start_time, end_time
            ORDER BY SUM(in_count) DESC
            LIMIT 1
        """
        cur.execute(query, params)
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] >= 0:
            stats["highest_period"] = f"{peak_row[0]}, {peak_row[1]} pax"

        # 使用进入人数计算最低密度时段
        query = f"""
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                SUM(in_count) AS count
            FROM video_analysis
            WHERE camera_name IN ({placeholders})
            AND start_time >= %s AND end_time <= %s
            GROUP BY start_time, end_time
            ORDER BY SUM(in_count) ASC
            LIMIT 1
        """
        cur.execute(query, params)
        low_row = cur.fetchone()
        if low_row and low_row[1] >= 0:
            stats["lowest_period"] = f"{low_row[0]}, {low_row[1]} pax"

    except Exception as e:
        print(f"Error calculating periods for {area_name}: {e}")
    finally:
        cur.close()
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
                alignment=1,
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
                alignment=1,
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

            table = Table(data)
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