import psycopg2
from datetime import datetime, timedelta
import random
import time

# 数据库配置
DATABASE_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
    "dbname": "postgres"
}

def setup_database():
    """创建表和索引"""
    create_table_sql = """
    -- DROP TABLE
    DROP TABLE IF EXISTS public.run_records CASCADE;
    DROP TABLE IF EXISTS public.video_analysis CASCADE;
    DROP TABLE IF EXISTS public.users CASCADE;

    -- CREATE TABLE
    CREATE TABLE public.run_records(
        run_id serial NOT NULL,
        folder_path character varying(255) NOT NULL,
        run_date timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
        total_videos integer NOT NULL,
        PRIMARY KEY (run_id)
    );

    -- CREATE TABLE
    CREATE TABLE public.video_analysis (
        analysis_id serial NOT NULL,
        run_id integer,
        video_name character varying(50) NOT NULL,
        camera_name character varying(20),
        start_time timestamp(0) without time zone,
        end_time timestamp(0) without time zone,
        total_people integer NOT NULL,
        in_count integer NOT NULL,
        out_count integer NOT NULL,
        male_count integer NOT NULL,
        female_count integer NOT NULL,
        unknown_gender_count integer NOT NULL,
        adult_count integer NOT NULL,
        minor_count integer NOT NULL,
        unknown_age_count integer NOT NULL,
        detection_method character varying(50) DEFAULT 'horizontal_a' NOT NULL,
        line_position numeric(3, 2) DEFAULT 0.5 NOT NULL,
        analysis_time timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
        PRIMARY KEY (analysis_id)
    );

    -- CREATE INDEX
    CREATE INDEX idx_run_records_date ON run_records(run_date);
    CREATE INDEX idx_video_analysis_run ON video_analysis(run_id);
    CREATE INDEX idx_video_analysis_start_time ON video_analysis(start_time);
    CREATE INDEX idx_video_analysis_end_time ON video_analysis(end_time);
    CREATE INDEX idx_video_analysis_camera ON video_analysis(camera_name);
    CREATE INDEX idx_video_analysis_start_time_gender ON video_analysis (start_time, male_count, female_count, minor_count, unknown_gender_count);
    CREATE INDEX idx_video_analysis_start_date ON video_analysis ((start_time::date));
    CREATE INDEX idx_video_analysis_end_date ON video_analysis ((end_time::date));
    CREATE INDEX idx_video_analysis_start_time_camera ON video_analysis (start_time, camera_name);
    CREATE INDEX idx_video_analysis_year_month ON video_analysis (EXTRACT(YEAR FROM start_time), EXTRACT(MONTH FROM start_time));
    CREATE INDEX idx_video_analysis_year_quarter ON video_analysis (EXTRACT(YEAR FROM start_time), EXTRACT(QUARTER FROM start_time));
    CREATE INDEX idx_video_analysis_year ON video_analysis (EXTRACT(YEAR FROM start_time));

    -- CREATE TABLE
    CREATE TABLE public.users( 
        id SERIAL PRIMARY KEY,
        username VARCHAR (50) UNIQUE NOT NULL,
        password_hash VARCHAR (128) NOT NULL,
        role VARCHAR (20) NOT NULL DEFAULT 'user',
        last_login timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL
    );

    -- INSERT DATA
    INSERT INTO users(username, password_hash, role) 
    VALUES ( 
        'admin',
        '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        'admin'
    );
    """
    try:
        conn = psycopg2.connect(**DATABASE_CONFIG)
        cur = conn.cursor()
        cur.execute(create_table_sql)
        conn.commit()
        print("数据库表和索引创建完成")
        cur.close()
    except Exception as e:
        print(f"数据库初始化出错: {e}")
    finally:
        if conn is not None:
            conn.close()

def generate_video_analysis_data():
    """生成并插入video_analysis表的数据"""
    try:
        conn = psycopg2.connect(**DATABASE_CONFIG)
        cur = conn.cursor()
        
        start_date = datetime(2020, 1, 1)
        end_date = datetime(2025, 8, 31)
        current_date = start_date
        total_records = 0
        
        print(f"开始生成数据: {start_date} 到 {end_date}")
        
        while current_date <= end_date:
            # 每天生成24小时 * 8个摄像头的数据
            for hour in range(24):
                for camera_num in range(1, 9):
                    camera_name = f"A{camera_num}"
                    
                    # 基本计数
                    base_count = 5 + (camera_num - 1) * 2 + (hour / 2)
                    base_count = max(5, min(50, base_count))
                    base_count += random.uniform(-5, 5)
                    base_count = max(5, base_count)
                    
                    # 进出人数
                    in_count = int(base_count * 0.6 + random.uniform(0, 5))
                    out_count = int(base_count * 0.4 + random.uniform(0, 5))
                    total_people = in_count + out_count + random.randint(0, 5)
                    
                    # 性别分布
                    male_count = int(total_people * 0.5 + random.uniform(-2.5, 2.5))
                    female_count = int(total_people * 0.3 + random.uniform(-2.5, 2.5))
                    unknown_gender_count = total_people - male_count - female_count
                    
                    # 确保未知性别至少为1
                    if unknown_gender_count <= 0:
                        unknown_gender_count = 1
                        female_count -= 1
                    
                    # 年龄分布
                    adult_count = int(total_people * 0.6 + random.uniform(-2.5, 2.5))
                    minor_count = int(total_people * 0.2 + random.uniform(-2.5, 2.5))
                    unknown_age_count = total_people - adult_count - minor_count
                    
                    # 确保未知年龄至少为1
                    if unknown_age_count <= 0:
                        unknown_age_count = 1
                        minor_count -= 1
                    
                    # 创建视频文件名
                    video_name = (
                        f"{camera_name}-{current_date.strftime('%Y%m%d')}-"
                        f"{hour:02d}0000-{hour:02d}5959.mp4"
                    )
                    
                    # 计算时间范围
                    start_time = current_date + timedelta(hours=hour)
                    end_time = start_time + timedelta(hours=1) - timedelta(seconds=1)
                    
                    # 分析时间 (当天9:44:00基础上随机偏移)
                    analysis_time = datetime(
                        current_date.year, current_date.month, current_date.day,
                        9, 44, 0
                    ) + timedelta(seconds=random.randint(0, 12 * 3600))
                    
                    # 插入数据
                    cur.execute(
                        """
                        INSERT INTO public.video_analysis (
                            run_id, video_name, camera_name, start_time, end_time,
                            total_people, in_count, out_count, male_count, female_count,
                            unknown_gender_count, adult_count, minor_count, unknown_age_count,
                            detection_method, line_position, analysis_time
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        """,
                        (
                            1, video_name, camera_name, start_time, end_time,
                            total_people, in_count, out_count, male_count, female_count,
                            unknown_gender_count, adult_count, minor_count, unknown_age_count,
                            'horizontal_a', 0.50, analysis_time
                        )
                    )
            
            # 每天结束后提交一次
            if current_date.day % 10 == 0:  # 每10天提交一次
                conn.commit()
                print(f"已提交数据到 {current_date.strftime('%Y-%m-%d')}")
            
            current_date += timedelta(days=1)
            total_records += 192  # 每天192条记录
            
        conn.commit()
        print(f"数据生成完成! 共生成 {total_records} 条记录")
        cur.close()
        
    except Exception as e:
        print(f"数据生成出错: {e}")
    finally:
        if conn is not None:
            conn.close()

if __name__ == "__main__":
    # 初始化数据库
    setup_database()
    
    # 生成动态数据
    start_time = time.time()
    generate_video_analysis_data()
    end_time = time.time()
    
    print(f"总耗时: {end_time - start_time:.2f} 秒")