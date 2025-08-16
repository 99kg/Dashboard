from flask import Flask, jsonify, request, send_from_directory
import psycopg2
from datetime import datetime
import os
from dotenv import load_dotenv
import json

load_dotenv()

# 获取项目根目录
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
frontend_path = os.path.join(project_root, 'frontend')

app = Flask(__name__, static_folder=frontend_path, static_url_path='')

# 数据库配置
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
    "dbname": os.getenv("DB_NAME", "postgres")
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'dashboard.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/cameras', methods=['GET'])
def get_cameras():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT DISTINCT camera_name FROM video_analysis ORDER BY camera_name")
        cameras = [row[0] for row in cur.fetchall()]
        return jsonify(cameras)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/last_run_date', methods=['GET'])
def get_last_run_date():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT MAX(run_date) FROM run_records")
        last_run_date = cur.fetchone()[0]
        return jsonify({"last_run_date": last_run_date.strftime("%Y-%m-%d") if last_run_date else None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/dashboard', methods=['POST'])
def get_dashboard_data():
    data = request.json
    camera_name = data.get('camera_name')  # Not used in this version per requirements
    date_start = data.get('date_start')
    date_end = data.get('date_end')
    ref_date_start = data.get('ref_date_start')
    ref_date_end = data.get('ref_date_end')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Helper function to calculate percentage change
        def calc_percent_change(current, previous):
            if previous == 0:
                return 0
            return int(round(((current - previous) / previous) * 100))
        
        # Part 1: Total visitors and comparison
        cur.execute("""
            SELECT COALESCE(SUM(total_people), 0) 
            FROM video_analysis
            WHERE start_time >= %s AND end_time <= %s
        """, (date_start, date_end))
        total_visitors = cur.fetchone()[0]
        
        cur.execute("""
            SELECT COALESCE(SUM(total_people), 0) 
            FROM video_analysis
            WHERE start_time >= %s AND end_time <= %s
        """, (ref_date_start, ref_date_end))
        reference_visitors = cur.fetchone()[0]
        
        total_percent_change = calc_percent_change(total_visitors, reference_visitors)
        
        # Part 2: Peak and Low periods
        cur.execute("""
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                total_people || ' pax' AS count_str
            FROM video_analysis
            WHERE start_time >= %s AND end_time <= %s
            ORDER BY total_people DESC
            LIMIT 1
        """, (date_start, date_end))
        peak_row = cur.fetchone()
        peak_period = peak_row[0] + ", " + peak_row[1] if peak_row else "N/A"
        
        cur.execute("""
            SELECT 
                TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                total_people || ' pax' AS count_str
            FROM video_analysis
            WHERE start_time >= %s AND end_time <= %s
            ORDER BY total_people ASC
            LIMIT 1
        """, (date_start, date_end))
        low_row = cur.fetchone()
        low_period = low_row[0] + ", " + low_row[1] if low_row else "N/A"
        
        # Helper function to get camera stats
        def get_camera_stats(cam_name, date_start, date_end):
            # 获取摄像头基本统计数据
            cur.execute("""
                SELECT 
                    COALESCE(SUM(total_people), 0) AS total,
                    COALESCE(SUM(male_count), 0) AS male,
                    COALESCE(SUM(female_count), 0) AS female,
                    COALESCE(SUM(minor_count), 0) AS minor,
                    COALESCE(SUM(unknown_gender_count), 0) AS unknown_gender
                FROM video_analysis
                WHERE camera_name = %s AND start_time >= %s AND end_time <= %s
            """, (cam_name, date_start, date_end))
            row = cur.fetchone()
            
            total = row[0]
            male_percent = int(round((row[1] / total) * 100)) if total > 0 else 0
            female_percent = int(round((row[2] / total) * 100)) if total > 0 else 0
            minor_percent = int(round((row[3] / total) * 100)) if total > 0 else 0
            unknown_percent = int(round((row[4] / total) * 100)) if total > 0 else 0
            
            # 获取Peak Period（最高人流时段）
            cur.execute("""
                SELECT 
                    TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                    TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                    total_people || ' pax' AS count_str
                FROM video_analysis
                WHERE camera_name = %s 
                    AND start_time >= %s 
                    AND end_time <= %s
                ORDER BY total_people DESC
                LIMIT 1
            """, (cam_name, date_start, date_end))
            peak_row = cur.fetchone()
            peak_period = peak_row[0] + ", " + peak_row[1] if peak_row else "N/A"
            
            # 获取Low Period（最低人流时段）
            cur.execute("""
                SELECT 
                    TO_CHAR(start_time, 'YYYY/MM/DD HH24:MI:SS') || '~' || 
                    TO_CHAR(end_time, 'HH24:MI:SS') AS period,
                    total_people || ' pax' AS count_str
                FROM video_analysis
                WHERE camera_name = %s 
                    AND start_time >= %s 
                    AND end_time <= %s
                ORDER BY total_people ASC
                LIMIT 1
            """, (cam_name, date_start, date_end))
            low_row = cur.fetchone()
            low_period = low_row[0] + ", " + low_row[1] if low_row else "N/A"
            
            return {
                'total': total,
                'male_percent': male_percent,
                'female_percent': female_percent,
                'minor_percent': minor_percent,
                'unknown_percent': unknown_percent,
                'peak_period': peak_period,
                'low_period': low_period
            }
        
        # Parts 3-6: Camera specific stats
        a6_stats = get_camera_stats('A6', date_start, date_end)
        a2_stats = get_camera_stats('A2', date_start, date_end)
        a3_stats = get_camera_stats('A3', date_start, date_end)
        a4_stats = get_camera_stats('A4', date_start, date_end)
        
        # Helper function to get area net count
        def get_net_count(cameras, date_start, date_end):
            placeholders = ','.join(['%s'] * len(cameras))
            query = f"""
                SELECT 
                    COALESCE(SUM(in_count), 0) - COALESCE(SUM(out_count), 0) AS net_count
                FROM video_analysis
                WHERE camera_name IN ({placeholders}) 
                AND start_time >= %s AND end_time <= %s
            """
            params = cameras + [date_start, date_end]
            cur.execute(query, params)
            row = cur.fetchone()
            return row[0] if row else 0
        
        # Part 7: Cold Storage (A7 and A6)
        cold_storage = get_net_count(['A7', 'A6'], date_start, date_end)
        cold_storage_ref = get_net_count(['A7', 'A6'], ref_date_start, ref_date_end)
        cold_storage_percent = calc_percent_change(cold_storage, cold_storage_ref)
        
        # Part 8: A8
        a8_value = get_net_count(['A8'], date_start, date_end)
        a8_ref = get_net_count(['A8'], ref_date_start, ref_date_end)
        a8_percent = calc_percent_change(a8_value, a8_ref)
        
        # Part 9: Canteen (A4 and A5)
        canteen_value = get_net_count(['A4', 'A5'], date_start, date_end)
        canteen_ref = get_net_count(['A4', 'A5'], ref_date_start, ref_date_end)
        canteen_percent = calc_percent_change(canteen_value, canteen_ref)
        
        # Part 10: 2nd Floor (A2, A3, A1, A6)
        second_floor_value = get_net_count(['A2', 'A3', 'A1', 'A6'], date_start, date_end)
        second_floor_ref = get_net_count(['A2', 'A3', 'A1', 'A6'], ref_date_start, ref_date_end)
        second_floor_percent = calc_percent_change(second_floor_value, second_floor_ref)
        
        # Part 11: Gender breakdown
        cur.execute("""
            SELECT 
                COALESCE(SUM(male_count), 0),
                COALESCE(SUM(female_count), 0),
                COALESCE(SUM(minor_count), 0)
            FROM video_analysis
            WHERE start_time >= %s AND end_time <= %s
        """, (date_start, date_end))
        gender_row = cur.fetchone()
        male_total = gender_row[0]
        female_total = gender_row[1]
        minor_total = gender_row[2]

        # 参考时间段的性别统计
        cur.execute("""
            SELECT 
                COALESCE(SUM(male_count), 0),
                COALESCE(SUM(female_count), 0),
                COALESCE(SUM(minor_count), 0)
            FROM video_analysis
            WHERE start_time >= %s AND end_time <= %s
        """, (ref_date_start, ref_date_end))
        ref_gender_row = cur.fetchone()
        male_ref = ref_gender_row[0]
        female_ref = ref_gender_row[1]
        minor_ref = ref_gender_row[2]

        # 计算百分比变化
        male_percent_change = calc_percent_change(male_total, male_ref)
        female_percent_change = calc_percent_change(female_total, female_ref)
        minor_percent_change = calc_percent_change(minor_total, minor_ref)
        
        return jsonify({
            'part1': {
                'total': total_visitors,
                'compare': reference_visitors,
                'percent_change': total_percent_change
            },
            'part2': {
                'peak_period': peak_period,
                'low_period': low_period
            },
            'part3': a6_stats,
            'part4': a2_stats,
            'part5': a3_stats,
            'part6': a4_stats,
            'part7': {
                'value': cold_storage,
                'comparison': cold_storage_ref,
                'percent_change': cold_storage_percent
            },
            'part8': {
                'value': a8_value,
                'comparison': a8_ref,
                'percent_change': a8_percent
            },
            'part9': {
                'value': canteen_value,
                'comparison': canteen_ref,
                'percent_change': canteen_percent
            },
            'part10': {
                'value': second_floor_value,
                'comparison': second_floor_ref,
                'percent_change': second_floor_percent
            },
            'part11': {
                'male': {
                    'current': male_total,
                    'ref': male_ref,
                    'percent_change': male_percent_change
                },
                'female': {
                    'current': female_total,
                    'ref': female_ref,
                    'percent_change': female_percent_change
                },
                'children': {
                    'current': minor_total,
                    'ref': minor_ref,
                    'percent_change': minor_percent_change
                }
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)