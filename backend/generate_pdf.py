import os
import psycopg2
from datetime import datetime, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from config import DATABASE_CONFIG

# 数据库配置
DB_CONFIG = DATABASE_CONFIG


def get_db_connection():
    """创建并返回数据库连接"""
    return psycopg2.connect(**DB_CONFIG)


def calculate_net_flow_stats(cameras, date_str):
    """
    计算指定摄像头组合的净流量统计数据
    :param cameras: 摄像头列表
    :param date_str: 日期字符串 (YYYY-MM-DD)
    :return: 包含统计数据的字典
    """
    conn = get_db_connection()
    cur = conn.cursor()
    stats = {
        "total_people": 0,
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

                # 按进出比例分配性别
                if total > 0:
                    # 进入比例
                    if in_cnt > 0:
                        in_ratio = in_cnt / total
                        gender_data["male"] += male * in_ratio
                        gender_data["female"] += female * in_ratio
                        gender_data["unknown"] += unknown * in_ratio
                        minor_float += minor * in_ratio

                    # 离开比例（负贡献）
                    if out_cnt > 0:
                        out_ratio = out_cnt / total
                        gender_data["male"] -= male * out_ratio
                        gender_data["female"] -= female * out_ratio
                        gender_data["unknown"] -= unknown * out_ratio
                        minor_float -= minor * out_ratio

        # 计算净流量（确保非负）
        net_count = total_in - total_out
        stats["total_people"] = max(0, net_count)

        # 四舍五入并分配余数
        male_int = round(gender_data["male"])
        female_int = round(gender_data["female"])
        unknown_int = round(gender_data["unknown"])
        minor_int = round(minor_float)

        allocated = male_int + female_int + unknown_int
        remainder = stats["total_people"] - allocated

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

        stats["total_males"] = male_int
        stats["total_females"] = female_int
        stats["total_unknowns"] = unknown_int
        stats["total_children"] = min(
            max(0, minor_int), stats["total_people"]
        )  # 确保儿童数有效

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
        "total_people": 0,
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
                COALESCE(SUM(total_people), 0),
                COALESCE(SUM(male_count), 0),
                COALESCE(SUM(female_count), 0),
                COALESCE(SUM(minor_count), 0),
                COALESCE(SUM(unknown_gender_count), 0)
            FROM video_analysis
            WHERE camera_name = %s
            AND start_time >= %s AND end_time <= %s
        """
        params = [camera_name, f"{date_str} 00:00:00", f"{date_str} 23:59:59"]
        cur.execute(query, params)
        row = cur.fetchone()

        if row:
            stats["total_people"] = row[0]
            stats["total_males"] = row[1]
            stats["total_females"] = row[2]
            stats["total_children"] = row[3]
            stats["total_unknowns"] = row[4]

        # 计算最高/最低密度时段
        query = """
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                total_people AS count
            FROM video_analysis
            WHERE camera_name = %s 
            AND start_time >= %s AND end_time <= %s
            ORDER BY total_people DESC
            LIMIT 1
        """
        cur.execute(query, params)
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] > 0:
            stats["highest_period"] = f"{peak_row[0]}, {peak_row[1]} pax"
        else:
            if peak_row and peak_row[1] < 0:
                stats["highest_period"] = f"{peak_row[0]}, 0 pax"
            else:
                stats["highest_period"] = "N/A"

        query = """
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                total_people AS count
            FROM video_analysis
            WHERE camera_name = %s 
            AND start_time >= %s AND end_time <= %s
            ORDER BY total_people ASC
            LIMIT 1
        """
        cur.execute(query, params)
        low_row = cur.fetchone()
        if low_row and low_row[1] > 0:
            stats["lowest_period"] = f"{low_row[0]}, {low_row[1]} pax"
        else:
            if low_row and low_row[1] < 0:
                stats["lowest_period"] = f"{low_row[0]}, 0 pax"
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
    计算冷库区域统计数据（包含性别和年龄分布）
    :param date_str: 日期字符串 (YYYY-MM-DD)
    :return: 包含统计数据的字典
    """
    conn = get_db_connection()
    cur = conn.cursor()
    stats = {
        "name": "Cold Storage",
        "total_people": 0,
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
        
        # 初始化性别和年龄分布计数器
        gender_data = {"male": 0.0, "female": 0.0, "unknown": 0.0}
        minor_float = 0.0
        
        # 获取冷库区域的所有时间段数据
        cur.execute(
            """
            SELECT 
                A7.start_time, A7.end_time,
                A7.in_count, A7.out_count,
                A7.male_count, A7.female_count, A7.unknown_gender_count, A7.minor_count, A7.total_people AS a7_total,
                A6.in_count AS a6_in, A6.out_count AS a6_out,
                A6.male_count AS a6_male, A6.female_count AS a6_female, 
                A6.unknown_gender_count AS a6_unknown, A6.minor_count AS a6_minor, A6.total_people AS a6_total
            FROM video_analysis A7
            JOIN video_analysis A6 
                ON A7.start_time = A6.start_time AND A7.end_time = A6.end_time
            WHERE A7.camera_name = 'A7'
            AND A6.camera_name = 'A6'
            AND A7.start_time >= %s AND A7.end_time <= %s
            """,
            (start_time, end_time),
        )
        rows = cur.fetchall()
        
        # 计算净流量和性别/年龄分布
        for row in rows:
            # 计算该时间段的冷库净流量
            segment_net_flow = (row[2] - row[3]) + (row[10] - row[9])
            
            # 累加净流量
            stats["total_people"] += segment_net_flow
            
            # 计算A7摄像头的性别/年龄贡献
            if row[8] > 0:  # A7_total > 0
                # A7进：正贡献
                if row[2] > 0:
                    in_ratio = row[2] / row[8]
                    gender_data["male"] += row[4] * in_ratio
                    gender_data["female"] += row[5] * in_ratio
                    gender_data["unknown"] += row[6] * in_ratio
                    minor_float += row[7] * in_ratio
                
                # A7出：负贡献
                if row[3] > 0:
                    out_ratio = row[3] / row[8]
                    gender_data["male"] -= row[4] * out_ratio
                    gender_data["female"] -= row[5] * out_ratio
                    gender_data["unknown"] -= row[6] * out_ratio
                    minor_float -= row[7] * out_ratio
            
            # 计算A6摄像头的性别/年龄贡献
            if row[15] > 0:  # A6_total > 0
                # A6出（进入冷库区域）：正贡献
                if row[10] > 0:
                    out_ratio = row[10] / row[15]
                    gender_data["male"] += row[11] * out_ratio
                    gender_data["female"] += row[12] * out_ratio
                    gender_data["unknown"] += row[13] * out_ratio
                    minor_float += row[14] * out_ratio
                
                # A6进（离开冷库区域）：负贡献
                if row[9] > 0:
                    in_ratio = row[9] / row[15]
                    gender_data["male"] -= row[11] * in_ratio
                    gender_data["female"] -= row[12] * in_ratio
                    gender_data["unknown"] -= row[13] * in_ratio
                    minor_float -= row[14] * in_ratio
        
        # 确保净流量非负
        stats["total_people"] = max(0, stats["total_people"])
        
        # 四舍五入并分配余数
        male_int = round(gender_data["male"])
        female_int = round(gender_data["female"])
        unknown_int = round(gender_data["unknown"])
        minor_int = round(minor_float)

        allocated = male_int + female_int + unknown_int
        remainder = stats["total_people"] - allocated

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

        stats["total_males"] = male_int
        stats["total_females"] = female_int
        stats["total_unknowns"] = unknown_int
        stats["total_children"] = min(
            max(0, minor_int), stats["total_people"]
        )

        # 计算最高密度时段
        cur.execute(
            """
            SELECT 
                TO_CHAR(A7.start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(A7.end_time, 'HH24:MI:SS') AS period,
                (A7.in_count - A7.out_count + A6.out_count - A6.in_count) AS count
            FROM video_analysis A7
            JOIN video_analysis A6 
                ON A7.start_time = A6.start_time AND A7.end_time = A6.end_time
            WHERE A7.camera_name = 'A7'
            AND A6.camera_name = 'A6'
            AND A7.start_time >= %s AND A7.end_time <= %s
            ORDER BY (A7.in_count - A7.out_count + A6.out_count - A6.in_count) DESC
            LIMIT 1
            """,
            (start_time, end_time),
        )
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] >= 0:
            stats["highest_period"] = f"{peak_row[0]}, {peak_row[1]} pax"
        else:
            if peak_row and peak_row[1] < 0:
                stats["highest_period"] = f"{peak_row[0]}, 0 pax"
            else:
                stats["highest_period"] = "N/A"

        # 计算最低密度时段
        cur.execute(
            """
            SELECT 
                TO_CHAR(A7.start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(A7.end_time, 'HH24:MI:SS') AS period,
                (A7.in_count - A7.out_count + A6.out_count - A6.in_count) AS count
            FROM video_analysis A7
            JOIN video_analysis A6 
                ON A7.start_time = A6.start_time AND A7.end_time = A6.end_time
            WHERE A7.camera_name = 'A7'
            AND A6.camera_name = 'A6'
            AND A7.start_time >= %s AND A7.end_time <= %s
            ORDER BY (A7.in_count - A7.out_count + A6.out_count - A6.in_count) ASC
            LIMIT 1
            """,
            (start_time, end_time),
        )
        low_row = cur.fetchone()
        if low_row and low_row[1] >= 0:
            stats["lowest_period"] = f"{low_row[0]}, {low_row[1]} pax"
        else:
            if low_row and low_row[1] < 0:
                stats["lowest_period"] = f"{low_row[0]}, 0 pax"
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
    # 使用净流量计算函数（保持原逻辑）
    stats = calculate_net_flow_stats(cameras, date_str)
    stats["name"] = area_name

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        start_time = f"{date_str} 00:00:00"
        end_time = f"{date_str} 23:59:59"
        placeholders = ",".join(["%s"] * len(cameras))
        params = cameras + [start_time, end_time]

        # 使用净流量计算最高密度时段
        query = f"""
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                SUM(in_count - out_count) AS count
            FROM video_analysis
            WHERE camera_name IN ({placeholders})
            AND start_time >= %s AND end_time <= %s
            GROUP BY start_time, end_time
            ORDER BY SUM(in_count - out_count) DESC
            LIMIT 1
        """
        cur.execute(query, params)
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] >= 0:
            stats["highest_period"] = f"{peak_row[0]}, {peak_row[1]} pax"
        else:
            if peak_row and peak_row[1] < 0:
                stats["highest_period"] = f"{peak_row[0]}, 0 pax"
            else:
                stats["highest_period"] = "N/A"

        # 使用净流量计算最低密度时段
        query = f"""
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                SUM(in_count - out_count) AS count
            FROM video_analysis
            WHERE camera_name IN ({placeholders})
            AND start_time >= %s AND end_time <= %s
            GROUP BY start_time, end_time
            ORDER BY SUM(in_count - out_count) ASC
            LIMIT 1
        """
        cur.execute(query, params)
        low_row = cur.fetchone()
        if low_row and low_row[1] >= 0:
            stats["lowest_period"] = f"{low_row[0]}, {low_row[1]} pax"
        else:
            if low_row and low_row[1] < 0:
                stats["lowest_period"] = f"{low_row[0]}, 0 pax"
            else:
                stats["lowest_period"] = "N/A"

    except Exception as e:
        print(f"Error calculating periods for {area_name}: {e}")
        stats["highest_period"] = "N/A"
        stats["lowest_period"] = "N/A"
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
        [
            stats_data[0],  # Cold Storage
            stats_data[1]   # 2nd Floor
        ],
        # 第二页组
        [
            stats_data[2],  # Canteen Area
            stats_data[3]   # Camera A1
        ],
        # 第三页组
        [
            stats_data[4],  # Camera A3
            stats_data[5]   # Camera A2
        ]
    ]

    # 为每个分组生成页面内容
    for group_index, group in enumerate(groups):

        elements.append(Paragraph(f"Analysis Report - Page{group_index + 1}", custom_styles["Title"]))
        elements.append(
            Paragraph(f"Date of Report: {report_date}", custom_styles["Subtitle"])
        )
        elements.append(Spacer(1, 24))
        
        # 处理分组内的每个区域
        for area_index, area in enumerate(group):
            elements.append(Paragraph(area["name"], custom_styles["SectionHeader"]))
            
            # 创建数据表格
            data = [
                ["Metric", "Value"],
                ["Total number of People", area["total_people"]],
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
