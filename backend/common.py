import psycopg2
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
    按比例计算整数性别分布
    :param total_count: 总人数
    :param male_percent_str: 男性百分比（字符串，如"12.3"）
    :param female_percent_str: 女性百分比
    :param unknown_percent_str: 未知性别百分比
    :return: {"male": 男性人数, "female": 女性人数, "unknown": 未知人数}
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
        "unknown": unknown_float - unknown_int,
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

    # 返回字典格式
    return {"male": male_int, "female": female_int, "unknown": unknown_int}


def get_camera_stats(conn, cam_name, date_start, date_end):
    """
    获取摄像头基本统计数据
    :param conn: 数据库连接
    :param cam_name: 摄像头名称
    :param date_start: 开始日期
    :param date_end: 结束日期
    :return: 包含统计数据的字典
    """
    cur = conn.cursor()

    try:
        if cam_name is None:
            # 获取整体基本统计数据
            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(total_people), 0) AS total_people,
                    COALESCE(SUM(in_count), 0) AS total_in,
                    COALESCE(SUM(out_count), 0) AS total_out,
                    COALESCE(SUM(male_count), 0) AS male,
                    COALESCE(SUM(female_count), 0) AS female,
                    COALESCE(SUM(minor_count), 0) AS minor,
                    COALESCE(SUM(unknown_gender_count), 0) AS unknown_gender
                FROM video_analysis
                WHERE start_time >= %s AND end_time <= %s
            """,
                (date_start, date_end),
            )
            row = cur.fetchone()

            total = row[0]
            total_in = row[1]
            total_out = row[2]

        else:
            # 获取摄像头基本统计数据
            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(total_people), 0) AS total_people,
                    COALESCE(SUM(in_count), 0) AS total_in,
                    COALESCE(SUM(out_count), 0) AS total_out,
                    COALESCE(SUM(male_count), 0) AS male,
                    COALESCE(SUM(female_count), 0) AS female,
                    COALESCE(SUM(minor_count), 0) AS minor,
                    COALESCE(SUM(unknown_gender_count), 0) AS unknown_gender
                FROM video_analysis
                WHERE camera_name = %s AND start_time >= %s AND end_time <= %s
            """,
                (cam_name, date_start, date_end),
            )
            row = cur.fetchone()

            total = row[0]
            total_in = row[1]
            total_out = row[2]

        male_percent = (
            "{:.1f}".format((row[3] / total) * 100, 1) if total > 0 else "0.0"
        )
        female_percent = (
            "{:.1f}".format((row[4] / total) * 100, 1) if total > 0 else "0.0"
        )
        minor_percent = (
            "{:.1f}".format((row[5] / total) * 100, 1) if total > 0 else "0.0"
        )
        unknown_percent = (
            "{:.1f}".format((row[6] / total) * 100, 1) if total > 0 else "0.0"
        )

        # 获取Peak Period（最高in_count人流时段）
        cur.execute(
            """
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                in_count || ' pax' AS count_str
            FROM video_analysis
            WHERE camera_name = %s 
                AND start_time >= %s 
                AND end_time <= %s
            ORDER BY in_count DESC
            LIMIT 1
            """,
            (cam_name, date_start, date_end),
        )
        peak_row = cur.fetchone()
        peak_period = peak_row[0] + ", " + peak_row[1] if peak_row else "N/A"

        # 获取Low Period（最低in_count人流时段）
        cur.execute(
            """
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                in_count || ' pax' AS count_str
            FROM video_analysis
            WHERE camera_name = %s 
                AND start_time >= %s 
                AND end_time <= %s
            ORDER BY in_count ASC
            LIMIT 1
            """,
            (cam_name, date_start, date_end),
        )
        low_row = cur.fetchone()
        low_period = low_row[0] + ", " + low_row[1] if low_row else "N/A"

        return {
            "total_in": total_in,
            "total_out": total_out,
            "male_percent": male_percent,
            "female_percent": female_percent,
            "minor_percent": minor_percent,
            "unknown_percent": unknown_percent,
            "peak_period": peak_period,
            "low_period": low_period,
        }
    finally:
        cur.close()


def calculate_percentage_change(current, previous):
    """
    计算百分比变化
    :param current: 当前值
    :param previous: 参考值
    :return: 百分比变化值
    """
    if previous == 0:
        return 0
    return "{:.1f}".format(((current - previous) / previous) * 100, 1)


def get_peak_and_low_periods(conn, date_start, date_end):
    """
    获取指定日期范围内的最高和最低人流时段
    :param conn: 数据库连接
    :param date_start: 开始日期
    :param date_end: 结束日期
    :return: (高峰时段, 低峰时段)
    """
    cur = conn.cursor()

    try:
        # 获取高峰时段
        cur.execute(
            """
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                in_count || ' pax' AS count_str
            FROM video_analysis
            WHERE start_time >= %s AND end_time <= %s
            ORDER BY in_count DESC
            LIMIT 1
            """,
            (date_start, date_end),
        )
        peak_row = cur.fetchone()
        peak_period = peak_row[0] + ", " + peak_row[1] if peak_row else "N/A"

        # 获取低峰时段
        cur.execute(
            """
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                in_count || ' pax' AS count_str
            FROM video_analysis
            WHERE start_time >= %s AND end_time <= %s
            ORDER BY in_count ASC
            LIMIT 1
            """,
            (date_start, date_end),
        )
        low_row = cur.fetchone()
        low_period = low_row[0] + ", " + low_row[1] if low_row else "N/A"

        return peak_period, low_period
    finally:
        cur.close()


def get_total_visitors(conn, date_start, date_end):
    """
    获取指定日期范围内的总访客数
    :param conn: 数据库连接
    :param date_start: 开始日期
    :param date_end: 结束日期
    :return: (进入人数, 离开人数)
    """
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT COALESCE(SUM(in_count), 0) ,
            COALESCE(SUM(out_count), 0) 
            FROM video_analysis
            WHERE start_time >= %s AND end_time <= %s
        """,
            (date_start, date_end),
        )
        return cur.fetchone()
    finally:
        cur.close()


def get_reference_visitors(conn, date_start, date_end):
    """
    获取参考时间段的访客数
    :param conn: 数据库连接
    :param date_start: 开始日期
    :param date_end: 结束日期
    :return: 进入人数
    """
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT COALESCE(SUM(in_count), 0)
            FROM video_analysis
            WHERE start_time >= %s AND end_time <= %s
        """,
            (date_start, date_end),
        )
        return cur.fetchone()[0]
    finally:
        cur.close()


def get_cold_storage_peak_and_low_periods(conn, date_start, date_end):
    """
    获取冷库区域的最高和最低密度时段（基于A7进+A6出）
    :param conn: 数据库连接
    :param date_start: 开始日期
    :param date_end: 结束日期
    :return: (高峰时段, 低峰时段)
    """
    cur = conn.cursor()

    try:
        # 计算最高密度时段（基于进入人数，即A7.in_count + A6.out_count）
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
            (date_start, date_end),
        )
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] is not None:
            peak_period = f"{peak_row[0]}, {int(peak_row[1])} pax"
        else:
            peak_period = "N/A"

        # 计算最低密度时段（基于进入人数，即A7.in_count + A6.out_count）
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
            (date_start, date_end),
        )
        low_row = cur.fetchone()
        if low_row and low_row[1] is not None:
            low_period = f"{low_row[0]}, {int(low_row[1])} pax"
        else:
            low_period = "N/A"

        return peak_period, low_period
    finally:
        cur.close()


def get_area_peak_and_low_periods(conn, cameras, date_start, date_end):
    """
    获取指定区域的最高和最低密度时段（基于区域内所有摄像头的进入人数之和）
    :param conn: 数据库连接
    :param cameras: 摄像头列表
    :param date_start: 开始日期
    :param date_end: 结束日期
    :return: (高峰时段, 低峰时段)
    """
    cur = conn.cursor()

    try:
        # 计算最高密度时段（基于区域内所有摄像头的进入人数之和）
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
        params = cameras + [date_start, date_end]
        cur.execute(query, params)
        peak_row = cur.fetchone()
        if peak_row and peak_row[1] is not None:
            peak_period = f"{peak_row[0]}, {int(peak_row[1])} pax"
        else:
            peak_period = "N/A"

        # 计算最低密度时段（基于区域内所有摄像头的进入人数之和）
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
            low_period = f"{low_row[0]}, {int(low_row[1])} pax"
        else:
            low_period = "N/A"

        return peak_period, low_period
    finally:
        cur.close()
