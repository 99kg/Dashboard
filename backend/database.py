import psycopg2
from config import DATABASE_CONFIG
from datetime import datetime

def get_db_connection():
    return psycopg2.connect(**DATABASE_CONFIG)

def get_camera_names():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT camera_name FROM video_analysis ORDER BY camera_name")
    cameras = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return cameras

def get_analysis_data(camera_name, start_date, end_date):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 转换日期格式
    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    query = """
    SELECT 
        DATE(start_time) AS analysis_date,
        SUM(total_people) AS total_people,
        SUM(in_count) AS in_count,
        SUM(out_count) AS out_count,
        SUM(male_count) AS male_count,
        SUM(female_count) AS female_count,
        SUM(unknown_gender_count) AS unknown_gender_count,
        SUM(adult_count) AS adult_count,
        SUM(minor_count) AS minor_count,
        SUM(unknown_age_count) AS unknown_age_count
    FROM video_analysis
    WHERE camera_name = %s
        AND start_time >= %s
        AND end_time <= %s
    GROUP BY analysis_date
    ORDER BY analysis_date
    """
    
    cur.execute(query, (camera_name, start_date, end_date))
    columns = [desc[0] for desc in cur.description]
    results = []
    for row in cur.fetchall():
        results.append(dict(zip(columns, row)))
    
    cur.close()
    conn.close()
    return results