from flask import (
    Flask,
    jsonify,
    request,
    send_from_directory,
    session,
    redirect,
    url_for,
)
from functools import wraps
import psycopg2
from datetime import datetime
import os
from dotenv import load_dotenv
from datetime import date, timedelta
import hashlib
import secrets
from config import DATABASE_CONFIG
from common import (
    get_db_connection,
    get_gender_count,
    get_camera_stats,
    calculate_percentage_change,
    get_peak_and_low_periods,
    get_total_visitors,
    get_reference_visitors,
)

# 加载环境变量
load_dotenv()

# 获取项目根目录
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
frontend_path = os.path.join(project_root, "frontend")

#  创建Flask应用
app = Flask(__name__, static_folder=frontend_path, static_url_path="")

# 设置安全密钥（在生产环境中，建议在 .env 文件中设置 SECRET_KEY 环境变量，以确保密钥在服务器重启后保持一致。如果每次服务器重启都生成新的密钥，那么所有用户的会话都会失效。）
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(32))

# 数据库配置
DB_CONFIG = DATABASE_CONFIG


# 登录保护装饰器
def login_required(f):
    @wraps(f)
    # 检查用户是否已登录
    def decorated_function(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)

    return decorated_function


@app.route("/")
def index():
    if session.get("logged_in"):
        return redirect(url_for("dashboard"))
    return redirect(url_for("login_page"))


@app.route("/login", methods=["GET"])
def login_page():
    return send_from_directory(app.static_folder, "login.html")


@app.route("/register", methods=["GET"])
def register_page():
    return send_from_directory(app.static_folder, "register.html")


@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT id, password_hash, role, last_login FROM users WHERE username = %s",
            (username,),
        )
        user = cur.fetchone()

        if not user:
            return jsonify({"error": "Username does not exist."}), 401

        user_id, password_hash, role, last_login = user

        # 使用SHA-256哈希验证密码
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        if hashed_password != password_hash:
            return jsonify({"error": "Incorrect password."}), 401

        # 更新最后登录时间
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cur.execute(
            """
            UPDATE users 
            SET last_login = %s 
            WHERE id = %s
        """,
            (current_time, user_id),
        )
        conn.commit()

        # 创建会话
        session["user_id"] = user_id
        session["username"] = username
        session["role"] = role
        session["last_login"] = last_login
        session["logged_in"] = True

        return jsonify({"message": "Login successful", "last_login": last_login}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))


@app.route("/dashboard")
def dashboard():
    if not session.get("logged_in"):
        return redirect(url_for("login_page"))
    return send_from_directory(app.static_folder, "dashboard.html")


@app.route("/api/check-session")
def check_session():
    if session.get("logged_in"):
        # 从会话中获取最后登录时间
        last_login = session.get("last_login", "Never")
        if isinstance(last_login, datetime):
            last_login = last_login.strftime("%Y-%m-%d %H:%M:%S")

        return jsonify(
            {
                "authenticated": True,
                "username": session.get("username"),
                "role": session.get("role"),
                "last_login": last_login,
            }
        )
    return jsonify({"authenticated": False}), 401


@app.route("/api/update-last-login", methods=["POST"])
@login_required
def update_last_login():
    if not session.get("logged_in") or "user_id" not in session:
        return jsonify({"error": "Authentication required"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 获取当前时间作为新的最后登录时间
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 更新数据库中的最后登录时间
        cur.execute(
            """
            UPDATE users 
            SET last_login = %s 
            WHERE id = %s
            RETURNING last_login
        """,
            (current_time, session["user_id"]),
        )

        conn.commit()

        return (
            jsonify(
                {
                    "success": True,
                }
            ),
            200,
        )
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/api/alltime", methods=["GET"])
@login_required
def get_all_time():
    # 获取查询参数（日期范围）
    start_date = request.args.get("date_start")
    end_date = request.args.get("date_end")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 构建基础查询
        base_query = """
            SELECT DISTINCT 
                TO_CHAR(start_time, 'HH24:MI:SS') AS start_time_str,
                TO_CHAR(end_time, 'HH24:MI:SS') AS end_time_str
            FROM video_analysis
            WHERE 1=1
        """
        params = []

        # 添加日期范围条件
        if start_date and end_date:
            base_query += " AND start_time::date BETWEEN %s AND %s"
            params.extend([start_date, end_date])

        # 添加排序
        base_query += " ORDER BY start_time_str, end_time_str"

        cur.execute(base_query, params)
        time_slots = cur.fetchall()

        # 转换为前端需要的格式: [{start: "00:00:00", end: "00:59:59"}, ...]
        formatted_slots = [{"start": slot[0], "end": slot[1]} for slot in time_slots]

        return jsonify(formatted_slots)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/api/dashboard", methods=["POST"])
@login_required
def get_dashboard_data():
    data = request.json
    date_start = data.get("date_start")
    date_end = data.get("date_end")
    ref_date_start = data.get("ref_date_start")
    ref_date_end = data.get("ref_date_end")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Part 1: Total visitors and comparison
        total_visitors_in, total_visitors_out = get_total_visitors(
            conn, date_start, date_end
        )
        reference_visitors_in = get_reference_visitors(
            conn, ref_date_start, ref_date_end
        )

        # 确保流量不为负数
        if total_visitors_in < 0:
            total_visitors_in = 0
        # 确保ref流量不为负数
        if reference_visitors_in < 0:
            reference_visitors_in = 0

        total_percent_change = calculate_percentage_change(
            total_visitors_in, reference_visitors_in
        )

        # Part 2: Peak and Low periods(by in_count)
        peak_period, low_period = get_peak_and_low_periods(conn, date_start, date_end)

        # Parts 3-6: Camera specific stats
        a6_stats = get_camera_stats(conn, "A6", date_start, date_end)
        a2_stats = get_camera_stats(conn, "A2", date_start, date_end)
        a3_stats = get_camera_stats(conn, "A3", date_start, date_end)
        a4_stats = get_camera_stats(conn, "A4", date_start, date_end)

        # Part 7: Cold Storage (A7 and A6, 专用方法)
        cold_storage_a7_stats = get_camera_stats(conn, "A7", date_start, date_end)
        cold_storage_a6_stats = get_camera_stats(conn, "A6", date_start, date_end)
        cold_storage_in = (
            cold_storage_a7_stats["total_in"] + cold_storage_a6_stats["total_out"]
        )
        cold_storage_out = (
            cold_storage_a7_stats["total_out"] + cold_storage_a6_stats["total_in"]
        )

        cold_storage_a7_ref_stats = get_camera_stats(
            conn, "A7", ref_date_start, ref_date_end
        )
        cold_storage_a6_ref_stats = get_camera_stats(
            conn, "A6", ref_date_start, ref_date_end
        )
        cold_storage_ref_in = (
            cold_storage_a7_ref_stats["total_in"]
            + cold_storage_a6_ref_stats["total_out"]
        )

        # 确保流量不为负数
        if cold_storage_in < 0:
            cold_storage_in = 0
        # 确保ref流量不为负数
        if cold_storage_ref_in < 0:
            cold_storage_ref_in = 0

        cold_storage_percent = calculate_percentage_change(
            cold_storage_in, cold_storage_ref_in
        )

        if cold_storage_in == 0:
            cold_storage_gender = {"male": 0, "female": 0, "unknown": 0}
        else:
            cold_storage_a7_gender = get_gender_count(
                cold_storage_a7_stats["total_in"],
                cold_storage_a7_stats["male_percent"],
                cold_storage_a7_stats["female_percent"],
                cold_storage_a7_stats["unknown_percent"],
            )
            cold_storage_a6_gender = get_gender_count(
                cold_storage_a6_stats["total_out"],
                cold_storage_a6_stats["male_percent"],
                cold_storage_a6_stats["female_percent"],
                cold_storage_a6_stats["unknown_percent"],
            )

            cold_storage_gender = {
                "male": cold_storage_a7_gender["male"] + cold_storage_a6_gender["male"],
                "female": cold_storage_a7_gender["female"]
                + cold_storage_a6_gender["female"],
                "unknown": cold_storage_a7_gender["unknown"]
                + cold_storage_a6_gender["unknown"],
            }

        # part 8:A8
        a8_stats = get_camera_stats(conn, "A8", date_start, date_end)
        a8_value_in = a8_stats["total_in"]
        a8_value_out = a8_stats["total_out"]

        a8_ref_stats = get_camera_stats(conn, "A8", ref_date_start, ref_date_end)
        a8_ref_in = a8_ref_stats["total_in"]

        # 确保流量不为负数
        if a8_value_in < 0:
            a8_value_in = 0
        # 确保ref流量不为负数
        if a8_ref_in < 0:
            a8_ref_in = 0

        a8_percent = calculate_percentage_change(a8_value_in, a8_ref_in)

        if a8_value_in == 0:
            a8_gender = {"male": 0, "female": 0, "unknown": 0}
        else:
            a8_male_percent = a8_stats["male_percent"]
            a8_female_percent = a8_stats["female_percent"]
            a8_unknown_percent = a8_stats["unknown_percent"]
            a8_gender = get_gender_count(
                a8_value_in, a8_male_percent, a8_female_percent, a8_unknown_percent
            )

        # Part 10: 2nd Floor (A2, A3, A1, A6)
        a1_stats = get_camera_stats(conn, "A1", date_start, date_end)
        second_floor_in = (
            a1_stats["total_in"]
            + a2_stats["total_in"]
            + a3_stats["total_in"]
            + a6_stats["total_in"]
        )
        second_floor_out = (
            a1_stats["total_out"]
            + a2_stats["total_out"]
            + a3_stats["total_out"]
            + a6_stats["total_out"]
        )

        a1_ref_stats = get_camera_stats(conn, "A1", ref_date_start, ref_date_end)
        a2_ref_stats = get_camera_stats(conn, "A2", ref_date_start, ref_date_end)
        a3_ref_stats = get_camera_stats(conn, "A3", ref_date_start, ref_date_end)
        a6_ref_stats = get_camera_stats(conn, "A6", ref_date_start, ref_date_end)

        second_floor_ref_in = (
            a1_ref_stats["total_in"]
            + a2_ref_stats["total_in"]
            + a3_ref_stats["total_in"]
            + a6_ref_stats["total_in"]
        )

        # 确保流量不为负数
        if second_floor_in < 0:
            second_floor_in = 0
        # 确保ref流量不为负数
        if second_floor_ref_in < 0:
            second_floor_ref_in = 0

        second_floor_percent = calculate_percentage_change(
            second_floor_in, second_floor_ref_in
        )

        if second_floor_in == 0:
            second_floor_gender = {"male": 0, "female": 0, "unknown": 0}
        else:
            a1_gender = get_gender_count(
                a1_stats["total_in"],
                a1_stats["male_percent"],
                a1_stats["female_percent"],
                a1_stats["unknown_percent"],
            )
            a2_gender = get_gender_count(
                a2_stats["total_in"],
                a2_stats["male_percent"],
                a2_stats["female_percent"],
                a2_stats["unknown_percent"],
            )
            a3_gender = get_gender_count(
                a3_stats["total_in"],
                a3_stats["male_percent"],
                a3_stats["female_percent"],
                a3_stats["unknown_percent"],
            )
            a6_gender = get_gender_count(
                a6_stats["total_in"],
                a6_stats["male_percent"],
                a6_stats["female_percent"],
                a6_stats["unknown_percent"],
            )

            second_floor_gender = {
                "male": a1_gender["male"]
                + a2_gender["male"]
                + a3_gender["male"]
                + a6_gender["male"],
                "female": a1_gender["female"]
                + a2_gender["female"]
                + a3_gender["female"]
                + a6_gender["female"],
                "unknown": a1_gender["unknown"]
                + a2_gender["unknown"]
                + a3_gender["unknown"]
                + a6_gender["unknown"],
            }

        # Part 9: Canteen (A4 and A5)
        a5_stats = get_camera_stats(conn, "A5", date_start, date_end)
        canteen_value_in = a4_stats["total_in"] + a5_stats["total_in"]
        canteen_value_out = a4_stats["total_out"] + a5_stats["total_out"]

        a4_ref_stats = get_camera_stats(conn, "A4", ref_date_start, ref_date_end)
        a5_ref_stats = get_camera_stats(conn, "A5", ref_date_start, ref_date_end)

        canteen_value_ref_in = a4_ref_stats["total_in"] + a5_ref_stats["total_in"]

        # 确保流量不为负数
        if canteen_value_in < 0:
            canteen_value_in = 0
        # 确保ref流量不为负数
        if canteen_value_ref_in < 0:
            canteen_value_ref_in = 0
        # 确保canteen区域人数不超过2nd Floor区域人数，防止数据错误
        if canteen_value_in > second_floor_in:
            canteen_value_in = second_floor_in

        if canteen_value_ref_in > second_floor_ref_in:
            canteen_value_ref_in = second_floor_ref_in

        canteen_percent = calculate_percentage_change(
            canteen_value_in, canteen_value_ref_in
        )

        if canteen_value_in == 0:
            canteen_gender = {"male": 0, "female": 0, "unknown": 0}
        else:
            a4_gender = get_gender_count(
                a4_stats["total_in"],
                a4_stats["male_percent"],
                a4_stats["female_percent"],
                a4_stats["unknown_percent"],
            )
            a5_gender = get_gender_count(
                a5_stats["total_in"],
                a5_stats["male_percent"],
                a5_stats["female_percent"],
                a5_stats["unknown_percent"],
            )

            canteen_gender = {
                "male": a4_gender["male"] + a5_gender["male"],
                "female": a4_gender["female"] + a5_gender["female"],
                "unknown": a4_gender["unknown"] + a5_gender["unknown"],
            }

        # Part 11: Gender breakdown
        total_stats = get_camera_stats(conn, None, date_start, date_end)
        total_value_in = total_stats["total_in"]

        total_ref_stats = get_camera_stats(conn, None, ref_date_start, ref_date_end)
        total_ref_value_in = total_ref_stats["total_in"]

        # 确保流量不为负数
        if total_value_in < 0:
            total_value_in = 0
        # 确保ref流量不为负数
        if total_ref_value_in < 0:
            total_ref_value_in = 0

        if total_value_in == 0:
            total_gender = {"male": 0, "female": 0, "unknown": 0}
            total_minor_in = 0
        else:
            total_male_percent = total_stats["male_percent"]
            total_female_percent = total_stats["female_percent"]
            total_unknown_percent = total_stats["unknown_percent"]
            total_minor_percent = total_stats["minor_percent"]
            total_gender = get_gender_count(
                total_value_in,
                total_male_percent,
                total_female_percent,
                total_unknown_percent,
            )
            # 计算儿童流量
            total_minor_in = int(float(total_minor_percent) / 100.0 * total_value_in)

        if total_ref_value_in == 0:
            total_ref_gender = {"male": 0, "female": 0, "unknown": 0}
            total_ref_minor_in = 0
        else:
            total_ref_male_percent = total_ref_stats["male_percent"]
            total_ref_female_percent = total_ref_stats["female_percent"]
            total_ref_unknown_percent = total_ref_stats["unknown_percent"]
            total_ref_minor_percent = total_ref_stats["minor_percent"]
            total_ref_gender = get_gender_count(
                total_ref_value_in,
                total_ref_male_percent,
                total_ref_female_percent,
                total_ref_unknown_percent,
            )
            # 计算儿童流量
            total_ref_minor_in = int(
                float(total_ref_minor_percent) / 100.0 * total_ref_value_in
            )

        # 计算百分比变化
        male_percent_change = calculate_percentage_change(
            total_gender["male"], total_ref_gender["male"]
        )
        female_percent_change = calculate_percentage_change(
            total_gender["female"], total_ref_gender["female"]
        )
        unknown_percent_change = calculate_percentage_change(
            total_gender["unknown"], total_ref_gender["unknown"]
        )

        # 单独计算儿童百分比变化
        minor_percent_change = calculate_percentage_change(
            total_minor_in, total_ref_minor_in
        )

        # 返回结果
        return jsonify(
            {
                "part1": {
                    "total_in": total_visitors_in,
                    "total_out": total_visitors_out,
                    "compare": reference_visitors_in,
                    "percent_change": total_percent_change,
                },
                "part2": {"peak_period": peak_period, "low_period": low_period},
                "part3": a6_stats,
                "part4": a2_stats,
                "part5": a3_stats,
                "part6": a4_stats,
                "part7": {
                    "value_in": cold_storage_in,
                    "value_out": cold_storage_out,
                    "comparison": cold_storage_ref_in,
                    "percent_change": cold_storage_percent,
                    "male": cold_storage_gender["male"],
                    "female": cold_storage_gender["female"],
                    "unknown": cold_storage_gender["unknown"],
                },
                "part8": {
                    "value_in": a8_value_in,
                    "value_out": a8_value_out,
                    "comparison": a8_ref_in,
                    "percent_change": a8_percent,
                    "male": a8_gender["male"],
                    "female": a8_gender["female"],
                    "unknown": a8_gender["unknown"],
                },
                "part9": {
                    "value_in": canteen_value_in,
                    "value_out": canteen_value_out,
                    "comparison": canteen_value_ref_in,
                    "percent_change": canteen_percent,
                    "male": canteen_gender["male"],
                    "female": canteen_gender["female"],
                    "unknown": canteen_gender["unknown"],
                },
                "part10": {
                    "value_in": second_floor_in,
                    "value_out": second_floor_out,
                    "comparison": second_floor_ref_in,
                    "percent_change": second_floor_percent,
                    "male": second_floor_gender["male"],
                    "female": second_floor_gender["female"],
                    "unknown": second_floor_gender["unknown"],
                },
                "part11": {
                    "male": {
                        "current": total_gender["male"],
                        "ref": total_ref_gender["male"],
                        "percent_change": male_percent_change,
                    },
                    "female": {
                        "current": total_gender["female"],
                        "ref": total_ref_gender["female"],
                        "percent_change": female_percent_change,
                    },
                    "children": {
                        "current": total_minor_in,
                        "ref": total_ref_minor_in,
                        "percent_change": minor_percent_change,
                    },
                    "unknown": {
                        "current": total_gender["unknown"],
                        "ref": total_ref_gender["unknown"],
                        "percent_change": unknown_percent_change,
                    },
                },
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/api/footfall-distribution", methods=["GET"])
@login_required
def get_footfall_distribution():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # part 12
        # ----------- Part 12 统计 -----------
        today = date.today()

        # 1. weekly_current: 本周（含今天）前7天
        weekly_current_days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
        weekly_current = {"male": [], "female": [], "children": [], "unknown": []}
        for d in weekly_current_days:
            cur.execute(
                """
                SELECT
                    COALESCE(SUM(total_people),0),
                    COALESCE(SUM(in_count), 0),
                    COALESCE(SUM(male_count),0),
                    COALESCE(SUM(female_count),0),
                    COALESCE(SUM(minor_count),0),
                    COALESCE(SUM(unknown_gender_count),0)
                FROM video_analysis
                WHERE start_time::date = %s
                """,
                (d,),
            )
            row = cur.fetchone()

            total_people = row[0]
            total_in = row[1]
            if total_people > 0:
                male_percent = float(row[2] / total_people)
                female_percent = float(row[3] / total_people)
                children_percent = float(row[4] / total_people)
                unknown_percent = float(row[5] / total_people)
            else:
                male_percent = 0
                female_percent = 0
                children_percent = 0
                unknown_percent = 0

            weekly_current["male"].append(int(total_in * male_percent))
            weekly_current["female"].append(int(total_in * female_percent))
            weekly_current["children"].append(int(total_in * children_percent))
            weekly_current["unknown"].append(int(total_in * unknown_percent))

        # 2. weekly_historical: 上一周（不含本周），周一到周日
        last_week_start = today - timedelta(days=today.weekday() + 7)
        last_week_days = [(last_week_start + timedelta(days=i)) for i in range(7)]
        weekly_historical = {"male": [], "female": [], "children": [], "unknown": []}
        for d in last_week_days:
            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(total_people),0),
                    COALESCE(SUM(in_count), 0),
                    COALESCE(SUM(male_count),0),
                    COALESCE(SUM(female_count),0),
                    COALESCE(SUM(minor_count),0),
                    COALESCE(SUM(unknown_gender_count),0)
                FROM video_analysis
                WHERE start_time::date = %s
                """,
                (d,),
            )
            row = cur.fetchone()

            total_people = row[0]
            total_in = row[1]
            if total_people > 0:
                male_percent = float(row[2] / total_people)
                female_percent = float(row[3] / total_people)
                children_percent = float(row[4] / total_people)
                unknown_percent = float(row[5] / total_people)
            else:
                male_percent = 0
                female_percent = 0
                children_percent = 0
                unknown_percent = 0

            weekly_historical["male"].append(int(total_in * male_percent))
            weekly_historical["female"].append(int(total_in * female_percent))
            weekly_historical["children"].append(int(total_in * children_percent))
            weekly_historical["unknown"].append(int(total_in * unknown_percent))

        # 3. monthly_current: 包含本周在内的前4周
        monthly_current = {"male": [], "female": [], "children": [], "unknown": []}
        for i in range(3, -1, -1):
            week_start = today - timedelta(days=today.weekday() + (7 * i))
            week_end = week_start + timedelta(days=6)

            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(total_people),0),
                    COALESCE(SUM(in_count), 0),
                    COALESCE(SUM(male_count),0),
                    COALESCE(SUM(female_count),0),
                    COALESCE(SUM(minor_count),0),
                    COALESCE(SUM(unknown_gender_count),0)
                FROM video_analysis
                WHERE start_time::date BETWEEN %s AND %s
                """,
                (week_start, week_end),
            )
            row = cur.fetchone()

            total_people = row[0]
            total_in = row[1]
            if total_people > 0:
                male_percent = float(row[2] / total_people)
                female_percent = float(row[3] / total_people)
                children_percent = float(row[4] / total_people)
                unknown_percent = float(row[5] / total_people)
            else:
                male_percent = 0
                female_percent = 0
                children_percent = 0
                unknown_percent = 0

            monthly_current["male"].append(int(total_in * male_percent))
            monthly_current["female"].append(int(total_in * female_percent))
            monthly_current["children"].append(int(total_in * children_percent))
            monthly_current["unknown"].append(int(total_in * unknown_percent))

        # 4. monthly_historical: 不含本周的前4周
        monthly_historical = {"male": [], "female": [], "children": [], "unknown": []}
        for i in range(4, 0, -1):
            week_start = today - timedelta(days=today.weekday() + (7 * i))
            week_end = week_start + timedelta(days=6)

            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(total_people),0),
                    COALESCE(SUM(in_count), 0),
                    COALESCE(SUM(male_count),0),
                    COALESCE(SUM(female_count),0),
                    COALESCE(SUM(minor_count),0),
                    COALESCE(SUM(unknown_gender_count),0)
                FROM video_analysis
                WHERE start_time::date BETWEEN %s AND %s
                """,
                (week_start, week_end),
            )
            row = cur.fetchone()

            total_people = row[0]
            total_in = row[1]
            if total_people > 0:
                male_percent = float(row[2] / total_people)
                female_percent = float(row[3] / total_people)
                children_percent = float(row[4] / total_people)
                unknown_percent = float(row[5] / total_people)
            else:
                male_percent = 0
                female_percent = 0
                children_percent = 0
                unknown_percent = 0

            monthly_historical["male"].append(int(total_in * male_percent))
            monthly_historical["female"].append(int(total_in * female_percent))
            monthly_historical["children"].append(int(total_in * children_percent))
            monthly_historical["unknown"].append(int(total_in * unknown_percent))

        # 5. quarterly_current: 包含本月在内的前3个月
        quarterly_current = {"male": [], "female": [], "children": [], "unknown": []}
        for i in range(2, -1, -1):
            month_date = today.replace(day=1) - timedelta(days=30 * i)
            year = month_date.year
            mon = month_date.month

            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(total_people),0),
                    COALESCE(SUM(in_count), 0),
                    COALESCE(SUM(male_count),0),
                    COALESCE(SUM(female_count),0),
                    COALESCE(SUM(minor_count),0),
                    COALESCE(SUM(unknown_gender_count),0)
                FROM video_analysis
                WHERE EXTRACT(YEAR FROM start_time) = %s AND EXTRACT(MONTH FROM start_time) = %s
                """,
                (year, mon),
            )
            row = cur.fetchone()

            total_people = row[0]
            total_in = row[1]
            if total_people > 0:
                male_percent = float(row[2] / total_people)
                female_percent = float(row[3] / total_people)
                children_percent = float(row[4] / total_people)
                unknown_percent = float(row[5] / total_people)
            else:
                male_percent = 0
                female_percent = 0
                children_percent = 0
                unknown_percent = 0

            quarterly_current["male"].append(int(total_in * male_percent))
            quarterly_current["female"].append(int(total_in * female_percent))
            quarterly_current["children"].append(int(total_in * children_percent))
            quarterly_current["unknown"].append(int(total_in * unknown_percent))

        # 6. quarterly_historical: 不含本月的前3个月
        quarterly_historical = {"male": [], "female": [], "children": [], "unknown": []}
        for i in range(3, 0, -1):
            month_date = today.replace(day=1) - timedelta(days=30 * i)
            year = month_date.year
            mon = month_date.month

            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(total_people),0),
                    COALESCE(SUM(in_count), 0),
                    COALESCE(SUM(male_count),0),
                    COALESCE(SUM(female_count),0),
                    COALESCE(SUM(minor_count),0),
                    COALESCE(SUM(unknown_gender_count),0)
                FROM video_analysis
                WHERE EXTRACT(YEAR FROM start_time) = %s AND EXTRACT(MONTH FROM start_time) = %s
                """,
                (year, mon),
            )
            row = cur.fetchone()

            total_people = row[0]
            total_in = row[1]
            if total_people > 0:
                male_percent = float(row[2] / total_people)
                female_percent = float(row[3] / total_people)
                children_percent = float(row[4] / total_people)
                unknown_percent = float(row[5] / total_people)
            else:
                male_percent = 0
                female_percent = 0
                children_percent = 0
                unknown_percent = 0

            quarterly_historical["male"].append(int(total_in * male_percent))
            quarterly_historical["female"].append(int(total_in * female_percent))
            quarterly_historical["children"].append(int(total_in * children_percent))
            quarterly_historical["unknown"].append(int(total_in * unknown_percent))

        # 7. yearly_current: 包含本季度在内的前4季度
        yearly_current = {"male": [], "female": [], "children": [], "unknown": []}
        for i in range(3, -1, -1):
            q_year = today.year - ((today.month - 1) // 3 < i)
            q_num = ((today.month - 1) // 3 - i) % 4 + 1

            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(total_people),0),
                    COALESCE(SUM(in_count), 0),
                    COALESCE(SUM(male_count),0),
                    COALESCE(SUM(female_count),0),
                    COALESCE(SUM(minor_count),0),
                    COALESCE(SUM(unknown_gender_count),0)
                FROM video_analysis
                WHERE EXTRACT(YEAR FROM start_time) = %s AND EXTRACT(QUARTER FROM start_time) = %s
                """,
                (q_year, q_num),
            )
            row = cur.fetchone()

            total_people = row[0]
            total_in = row[1]
            if total_people > 0:
                male_percent = float(row[2] / total_people)
                female_percent = float(row[3] / total_people)
                children_percent = float(row[4] / total_people)
                unknown_percent = float(row[5] / total_people)
            else:
                male_percent = 0
                female_percent = 0
                children_percent = 0
                unknown_percent = 0

            yearly_current["male"].append(int(total_in * male_percent))
            yearly_current["female"].append(int(total_in * female_percent))
            yearly_current["children"].append(int(total_in * children_percent))
            yearly_current["unknown"].append(int(total_in * unknown_percent))

        # 8. yearly_historical: 不含本季度的前4季度
        yearly_historical = {"male": [], "female": [], "children": [], "unknown": []}
        for i in range(4, 0, -1):
            q_year = today.year - ((today.month - 1) // 3 < i)
            q_num = ((today.month - 1) // 3 - i) % 4 + 1

            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(total_people),0),
                    COALESCE(SUM(in_count), 0),
                    COALESCE(SUM(male_count),0),
                    COALESCE(SUM(female_count),0),
                    COALESCE(SUM(minor_count),0),
                    COALESCE(SUM(unknown_gender_count),0)
                FROM video_analysis
                WHERE EXTRACT(YEAR FROM start_time) = %s AND EXTRACT(QUARTER FROM start_time) = %s
                """,
                (q_year, q_num),
            )
            row = cur.fetchone()

            total_people = row[0]
            total_in = row[1]
            if total_people > 0:
                male_percent = float(row[2] / total_people)
                female_percent = float(row[3] / total_people)
                children_percent = float(row[4] / total_people)
                unknown_percent = float(row[5] / total_people)
            else:
                male_percent = 0
                female_percent = 0
                children_percent = 0
                unknown_percent = 0

            yearly_historical["male"].append(int(total_in * male_percent))
            yearly_historical["female"].append(int(total_in * female_percent))
            yearly_historical["children"].append(int(total_in * children_percent))
            yearly_historical["unknown"].append(int(total_in * unknown_percent))

        # 整理 Part 12 的数据
        part12 = {
            "weekly_current": weekly_current,
            "weekly_historical": weekly_historical,
            "monthly_current": monthly_current,
            "monthly_historical": monthly_historical,
            "quarterly_current": quarterly_current,
            "quarterly_historical": quarterly_historical,
            "yearly_current": yearly_current,
            "yearly_historical": yearly_historical,
        }
        return jsonify(part12)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    admin_password = data.get("adminPassword")

    if not username or not password or not admin_password:
        return jsonify({"error": "All fields are required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 验证管理员密码
        cur.execute("SELECT password_hash FROM users WHERE role = 'admin' LIMIT 1")
        admin_password_hash = cur.fetchone()

        if not admin_password_hash:
            return jsonify({"error": "Admin password not found."}), 500

        hashed_admin_password = hashlib.sha256(admin_password.encode()).hexdigest()
        if hashed_admin_password != admin_password_hash[0]:
            return jsonify({"error": "Invalid admin password."}), 403

        # 检查用户名是否已存在
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            return jsonify({"error": "User already exists."}), 409

        # 校验用户名长度
        if len(username) < 3 or len(username) > 20:
            return (
                jsonify(
                    {"error": "Username must be between 3 and 20 characters long."}
                ),
                400,
            )

        # 校验密码长度
        if len(password) < 6 or len(password) > 20:
            return (
                jsonify(
                    {"error": "Password must be between 6 and 20 characters long."}
                ),
                400,
            )

        # 创建新用户
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        cur.execute(
            """
            INSERT INTO users (username, password_hash, role)
            VALUES (%s, %s, 'user')
            """,
            (username, hashed_password),
        )
        conn.commit()

        return jsonify({"message": "User registered successfully."}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/api/admin-login", methods=["POST"])
def admin_login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return (
            jsonify(
                {"success": False, "message": "Username and password are required."}
            ),
            400,
        )

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 查询用户信息
        cur.execute(
            "SELECT id, password_hash, role FROM users WHERE username = %s",
            (username,),
        )
        user = cur.fetchone()

        if not user:
            return (
                jsonify({"success": False, "message": "Invalid username or password."}),
                401,
            )

        user_id, password_hash, role = user

        # 验证密码
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        if hashed_password != password_hash:
            return (
                jsonify({"success": False, "message": "Invalid username or password."}),
                401,
            )

        # 检查角色是否为管理员
        if role != "admin":
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Access denied.",
                    }
                ),
                403,
            )

        # 设置会话
        session["user_id"] = user_id
        session["username"] = username
        session["role"] = role
        session["logged_in"] = True

        return jsonify({"success": True, "role": role})
    except Exception as e:
        return jsonify({"success": False, "message": "An error occurred."}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/admin", methods=["GET"])
@login_required
def admin_page():
    if session.get("role") != "admin":
        return jsonify({"error": "Access denied"}), 403
    return send_from_directory(app.static_folder, "admin.html")


@app.route("/api/admin/users", methods=["GET"])
@login_required
def get_users():
    if session.get("role") != "admin":
        return jsonify({"error": "Access denied"}), 403

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT id, username, role, last_login FROM users order by id")
        users = [
            {
                "id": row[0],
                "username": row[1],
                "role": row[2],
                "lastLogin": (
                    row[3].strftime("%Y/%m/%d %H:%M:%S") if row[3] else "Never"
                ),
            }
            for row in cur.fetchall()
        ]
        return jsonify({"users": users}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/api/admin/users/<int:user_id>", methods=["PUT"])
@login_required
def update_user(user_id):
    current_user_id = session.get("user_id")
    if user_id == current_user_id:
        return jsonify({"error": "You cannot modify your own account."}), 403

    data = request.json
    new_username = data.get("username")
    new_role = data.get("role")
    new_password = data.get("password")

    if new_role not in ["admin", "user"]:
        return jsonify({"error": "Invalid role."}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # 校验用户名长度
    if new_username and (len(new_username) < 3 or len(new_username) > 20):
        return (
            jsonify({"error": "Username must be between 3 and 20 characters long."}),
            400,
        )

    # 校验密码长度
    if new_password and (len(new_password) < 6 or len(new_password) > 20):
        return (
            jsonify({"error": "Password must be between 6 and 20 characters long."}),
            400,
        )

    try:
        # 检查用户名是否已存在
        cur.execute(
            "SELECT id FROM users WHERE username = %s AND id != %s",
            (new_username, user_id),
        )
        if cur.fetchone():
            return jsonify({"error": "Username already exists."}), 400

        if new_username:
            cur.execute(
                "UPDATE users SET username = %s WHERE id = %s",
                (new_username, user_id),
            )

        if new_password:
            password_hash = hashlib.sha256(new_password.encode()).hexdigest()
            cur.execute(
                "UPDATE users SET password_hash = %s WHERE id = %s",
                (password_hash, user_id),
            )

        if new_role:
            cur.execute(
                "UPDATE users SET role = %s WHERE id = %s",
                (new_role, user_id),
            )

        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@login_required
def delete_user(user_id):
    current_user_id = session.get("user_id")
    if user_id == current_user_id:
        return jsonify({"error": "You cannot delete your own account."}), 403

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# 处理Chrome DevTools请求
@app.route("/.well-known/appspecific/com.chrome.devtools.json", methods=["GET"])
def handle_chrome_devtools():
    return jsonify({"message": "Not Found"}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
