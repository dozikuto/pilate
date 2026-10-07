-- PostgreSQL Initialization Script for PilatesMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure database exists
SELECT 'CREATE DATABASE pilatesms'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pilatesms')\gexec
