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

def get_gender_count(
    total_count, male_percent_str, female_percent_str, unknown_percent_str
):
    """
    按比例计算整数性别分布（与app.py保持一致）
    :param total_count: 总人数
    :param male_percent_str: 男性百分比（字符串，如"12.3"）
    :param female_percent_str: 女性百分比
    :param unknown_percent_str: 未知性别百分比
    :return: (男性人数, 女性人数, 未知人数)
    """
    # 将字符串百分比转换为浮点数
    male_percent = float(male_percent_str) / 100.0
    female_percent = float(female_percent_str) / 100.0
    unknown_percent = float(unknown_percent_str) / 100.0

    # 计算浮点数人数
    male_float = total_count * male_percent
    female_float = total_count * female_percent
    unknown_float = total_count * unknown_percent

    # 向下取整得到整数部分
    male_int = int(male_float)
    female_int = int(female_float)
    unknown_int = int(unknown_float)

    # 计算已分配人数和剩余人数
    allocated = male_int + female_int + unknown_int
    remainder = total_count - allocated

    # 创建浮点数小数部分字典
    floats = {
        "male": male_float - male_int,
        "female": female_float - female_int,
        "unknown": unknown_float - unknown_int
    }

    # 分配剩余人数（按照小数部分大小降序分配）
    for _ in range(remainder):
        # 找到最大小数部分
        max_key = max(floats, key=floats.get)
        # 给该性别增加1
        if max_key == "male":
            male_int += 1
        elif max_key == "female":
            female_int += 1
        else:
            unknown_int += 1
        # 已分配，将该值置为0
        floats[max_key] = 0

    # 返回最终结果
    return male_int, female_int, unknown_int

def calculate_individual_stats(camera_name, date_str):
    """
    计算单个摄像头的统计数据（调整为与app.py一致）
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
        start_time = f"{date_str} 00:00:00"
        end_time = f"{date_str} 23:59:59"
        # 获取该摄像头的基本统计数据
        cur.execute(
            """
            SELECT 
                COALESCE(SUM(in_count), 0) AS total_in,
                COALESCE(SUM(out_count), 0) AS total_out,
                COALESCE(SUM(male_count), 0) AS male,
                COALESCE(SUM(female_count), 0) AS female,
                COALESCE(SUM(minor_count), 0) AS minor,
                COALESCE(SUM(unknown_gender_count), 0) AS unknown,
                COALESCE(SUM(total_people), 0) AS total
            FROM video_analysis
            WHERE camera_name = %s 
                AND start_time >= %s 
                AND end_time <= %s
            """,
            (camera_name, start_time, end_time),
        )
        row = cur.fetchone()
        if row:
            total_in, total_out, male, female, minor, unknown, total = row
            stats["total_in"] = total_in if total_in else 0
            stats["total_out"] = total_out if total_out else 0

            # 计算性别分布（基于进入人数）
            if total > 0 and total_in > 0:
                # 计算各性别百分比
                male_percent = "{:.1f}".format((male / total) * 100 if male else 0)
                female_percent = "{:.1f}".format((female / total) * 100 if female else 0)
                unknown_percent = "{:.1f}".format((unknown / total) * 100 if unknown else 0)
                # 计算儿童百分比（儿童不参与性别分配，单独计算）
                minor_percent = (minor / total) * 100 if minor else 0

                # 使用get_gender_count函数计算整数性别分布
                male_int, female_int, unknown_int = get_gender_count(
                    total_in,
                    male_percent,
                    female_percent,
                    unknown_percent,
                )
                stats["total_males"] = male_int
                stats["total_females"] = female_int
                stats["total_unknowns"] = unknown_int

                # 儿童人数单独计算（向下取整）
                stats["total_children"] = int(total_in * minor_percent / 100)
            else:
                stats["total_males"] = 0
                stats["total_females"] = 0
                stats["total_unknowns"] = 0
                stats["total_children"] = 0

        # 计算最高/最低密度时段（基于进入人数）
        cur.execute(
            """
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                in_count
            FROM video_analysis
            WHERE camera_name = %s 
                AND start_time >= %s 
                AND end_time <= %s
            ORDER BY in_count DESC
            LIMIT 1
            """,
            (camera_name, start_time, end_time),
        )
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] is not None:
            stats["highest_period"] = f"{peak_row[0]}, {int(peak_row[1])} pax"
        else:
            stats["highest_period"] = "N/A"

        cur.execute(
            """
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                in_count
            FROM video_analysis
            WHERE camera_name = %s 
                AND start_time >= %s 
                AND end_time <= %s
            ORDER BY in_count ASC
            LIMIT 1
            """,
            (camera_name, start_time, end_time),
        )
        low_row = cur.fetchone()
        if low_row and low_row[1] is not None:
            stats["lowest_period"] = f"{low_row[0]}, {int(low_row[1])} pax"
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
    计算冷库区域统计数据（调整为与app.py一致）
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
                COALESCE(SUM(in_count), 0) AS a7_in,
                COALESCE(SUM(out_count), 0) AS a7_out,
                COALESCE(SUM(male_count), 0) AS a7_male,
                COALESCE(SUM(female_count), 0) AS a7_female,
                COALESCE(SUM(minor_count), 0) AS a7_minor,
                COALESCE(SUM(unknown_gender_count), 0) AS a7_unknown,
                COALESCE(SUM(total_people), 0) AS a7_total
            FROM video_analysis
            WHERE camera_name = 'A7'
                AND start_time >= %s 
                AND end_time <= %s
            """,
            (start_time, end_time),
        )
        a7_row = cur.fetchone()
        a7_in = a7_row[0] if a7_row and a7_row[0] is not None else 0
        a7_out = a7_row[1] if a7_row and a7_row[1] is not None else 0
        a7_male = a7_row[2] if a7_row and a7_row[2] is not None else 0
        a7_female = a7_row[3] if a7_row and a7_row[3] is not None else 0
        a7_minor = a7_row[4] if a7_row and a7_row[4] is not None else 0
        a7_unknown = a7_row[5] if a7_row and a7_row[5] is not None else 0
        a7_total = a7_row[6] if a7_row and a7_row[6] is not None else 0

        # 获取A6摄像头的统计数据
        cur.execute(
            """
            SELECT 
                COALESCE(SUM(in_count), 0) AS a6_in,
                COALESCE(SUM(out_count), 0) AS a6_out,
                COALESCE(SUM(male_count), 0) AS a6_male,
                COALESCE(SUM(female_count), 0) AS a6_female,
                COALESCE(SUM(minor_count), 0) AS a6_minor,
                COALESCE(SUM(unknown_gender_count), 0) AS a6_unknown,
                COALESCE(SUM(total_people), 0) AS a6_total
            FROM video_analysis
            WHERE camera_name = 'A6'
                AND start_time >= %s 
                AND end_time <= %s
            """,
            (start_time, end_time),
        )
        a6_row = cur.fetchone()
        a6_in = a6_row[0] if a6_row and a6_row[0] is not None else 0
        a6_out = a6_row[1] if a6_row and a6_row[1] is not None else 0
        a6_male = a6_row[2] if a6_row and a6_row[2] is not None else 0
        a6_female = a6_row[3] if a6_row and a6_row[3] is not None else 0
        a6_minor = a6_row[4] if a6_row and a6_row[4] is not None else 0
        a6_unknown = a6_row[5] if a6_row and a6_row[5] is not None else 0
        a6_total = a6_row[6] if a6_row and a6_row[6] is not None else 0

        # 计算冷库区域的总进出人数
        stats["total_in"] = a7_in + a6_out  # 进入冷库：A7进入 + A6离开
        stats["total_out"] = a7_out + a6_in  # 离开冷库：A7离开 + A6进入

        # 计算A7部分的性别分布（基于进入冷库的部分，即A7_in）
        if a7_total > 0 and a7_in > 0:
            a7_male_percent = "{:.1f}".format((a7_male / a7_total) * 100)
            a7_female_percent = "{:.1f}".format((a7_female / a7_total) * 100)
            a7_unknown_percent = "{:.1f}".format((a7_unknown / a7_total) * 100)
            a7_males, a7_females, a7_unknowns = get_gender_count(
                a7_in,
                a7_male_percent,
                a7_female_percent,
                a7_unknown_percent,
            )
            # 计算儿童（向下取整）
            a7_minor_percent = (a7_minor / a7_total) * 100
            a7_children = int(a7_in * a7_minor_percent / 100)
        else:
            a7_males = a7_females = a7_unknowns = a7_children = 0

        # 计算A6部分的性别分布（基于离开A6的人数，即a6_out，这部分人进入冷库）
        if a6_total > 0 and a6_out > 0:
            a6_male_percent = "{:.1f}".format((a6_male / a6_total) * 100)
            a6_female_percent = "{:.1f}".format((a6_female / a6_total) * 100)
            a6_unknown_percent = "{:.1f}".format((a6_unknown / a6_total) * 100)
            a6_males, a6_females, a6_unknowns = get_gender_count(
                a6_out,
                a6_male_percent,
                a6_female_percent,
                a6_unknown_percent,
            )
            # 计算儿童（向下取整）
            a6_minor_percent = (a6_minor / a6_total) * 100
            a6_children = int(a6_out * a6_minor_percent / 100)
        else:
            a6_males = a6_females = a6_unknowns = a6_children = 0

        # 合并A7和A6的数据
        stats["total_males"] = a7_males + a6_males
        stats["total_females"] = a7_females + a6_females
        stats["total_unknowns"] = a7_unknowns + a6_unknowns
        stats["total_children"] = a7_children + a6_children

        # 计算最高/最低密度时段（基于进入人数，即A7.in_count + A6.out_count）
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
                AND A7.start_time >= %s 
                AND A7.end_time <= %s
            ORDER BY count DESC
            LIMIT 1
            """,
            (start_time, end_time),
        )
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] is not None:
            stats["highest_period"] = f"{peak_row[0]}, {int(peak_row[1])} pax"
        else:
            stats["highest_period"] = "N/A"

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
                AND A7.start_time >= %s 
                AND A7.end_time <= %s
            ORDER BY count ASC
            LIMIT 1
            """,
            (start_time, end_time),
        )
        low_row = cur.fetchone()
        if low_row and low_row[1] is not None:
            stats["lowest_period"] = f"{low_row[0]}, {int(low_row[1])} pax"
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
    计算指定区域的统计数据（调整为累加各摄像头，并统一计算性别）
    :param area_name: 区域名称
    :param cameras: 摄像头列表
    :param date_str: 日期字符串 (YYYY-MM-DD)
    :return: 包含统计数据的字典
    """
    conn = get_db_connection()
    cur = conn.cursor()
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

    try:
        start_time = f"{date_str} 00:00:00"
        end_time = f"{date_str} 23:59:59"

        # 初始化统计值
        total_in = 0
        total_out = 0
        total_males = 0
        total_females = 0
        total_children = 0
        total_unknowns = 0

        # 遍历每个摄像头
        for cam in cameras:
            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(in_count), 0) AS in_cnt,
                    COALESCE(SUM(out_count), 0) AS out_cnt,
                    COALESCE(SUM(male_count), 0) AS male,
                    COALESCE(SUM(female_count), 0) AS female,
                    COALESCE(SUM(minor_count), 0) AS minor,
                    COALESCE(SUM(unknown_gender_count), 0) AS unknown,
                    COALESCE(SUM(total_people), 0) AS total
                FROM video_analysis
                WHERE camera_name = %s 
                    AND start_time >= %s 
                    AND end_time <= %s
                """,
                (cam, start_time, end_time),
            )
            row = cur.fetchone()
            if row:
                in_cnt, out_cnt, male, female, minor, unknown, total = row
                total_in += in_cnt
                total_out += out_cnt

                if total > 0 and in_cnt > 0:
                    # 计算该摄像头的性别百分比
                    male_percent = "{:.1f}".format((male / total) * 100)
                    female_percent = "{:.1f}".format((female / total) * 100)
                    unknown_percent = "{:.1f}".format((unknown / total) * 100)
                    minor_percent = (minor / total) * 100

                    # 计算该摄像头的性别整数分布
                    cam_males, cam_females, cam_unknowns = get_gender_count(
                        in_cnt,
                        str(male_percent),
                        str(female_percent),
                        str(unknown_percent),
                    )
                    total_males += cam_males
                    total_females += cam_females
                    total_unknowns += cam_unknowns

                    # 计算儿童（向下取整）
                    cam_children = int(in_cnt * minor_percent / 100)
                    total_children += cam_children

        # 设置统计值
        stats["total_in"] = total_in
        stats["total_out"] = total_out
        stats["total_males"] = total_males
        stats["total_females"] = total_females
        stats["total_children"] = total_children
        stats["total_unknowns"] = total_unknowns

        # 计算最高/最低密度时段（基于区域内所有摄像头的进入人数之和）
        placeholders = ",".join(["%s"] * len(cameras))
        query = f"""
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                SUM(in_count) AS count
            FROM video_analysis
            WHERE camera_name IN ({placeholders}) 
                AND start_time >= %s 
                AND end_time <= %s
            GROUP BY start_time, end_time
            ORDER BY count DESC
            LIMIT 1
        """
        params = cameras + [start_time, end_time]
        cur.execute(query, params)
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] is not None:
            stats["highest_period"] = f"{peak_row[0]}, {int(peak_row[1])} pax"

        query = f"""
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                SUM(in_count) AS count
            FROM video_analysis
            WHERE camera_name IN ({placeholders}) 
                AND start_time >= %s 
                AND end_time <= %s
            GROUP BY start_time, end_time
            ORDER BY count ASC
            LIMIT 1
        """
        cur.execute(query, params)
        low_row = cur.fetchone()
        if low_row and low_row[1] is not None:
            stats["lowest_period"] = f"{low_row[0]}, {int(low_row[1])} pax"

    except Exception as e:
        print(f"Error calculating area stats for {area_name}: {e}")
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