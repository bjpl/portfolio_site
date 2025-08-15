-- Portfolio Site Database Initialization Script

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create additional user if needed (optional, docker-compose already creates the user)
-- This script runs as the postgres user and creates our application database

-- Ensure our database is created (should already exist from docker-compose)
-- CREATE DATABASE portfolio_db OWNER portfolio_user;

-- Connect to our database
\c portfolio_db;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO portfolio_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO portfolio_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO portfolio_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO portfolio_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO portfolio_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO portfolio_user;

-- Create a simple health check function
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Database is healthy at ' || NOW();
END;
$$ LANGUAGE plpgsql;

-- Create some initial indexes for performance
-- These will be created by Sequelize, but we can prepare for them

-- Log that initialization is complete
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING;

COMMENT ON DATABASE portfolio_db IS 'Portfolio Site Main Database';