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

-- INSERT DATA
INSERT INTO public.run_records(folder_path, run_date, total_videos) 
VALUES 
    ('./input', TIMESTAMP '2025-08-01 09:44:00.000', 17664);

-- CREATE TABLE
CREATE TABLE public.users( 
    id SERIAL PRIMARY KEY
    , username VARCHAR (50) UNIQUE NOT NULL
    , password_hash VARCHAR (128) NOT NULL
    , role VARCHAR (20) NOT NULL DEFAULT 'user'
    , last_login timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL
);

INSERT 
INTO users(username, password_hash, role) 
VALUES ( 
    'admin'
    , '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
    , 'admin'
);
