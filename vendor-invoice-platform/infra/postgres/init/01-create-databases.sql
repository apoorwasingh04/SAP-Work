-- Each microservice owns its OWN database (data isolation, 12-factor backing services).
-- Runs automatically (as superuser) on FIRST start of the postgres data volume.

-- 1. App role first (databases below are owned by it)
CREATE ROLE vip_app LOGIN PASSWORD 'vip_app_pw';

-- 2. One database per service, owned by the app role
CREATE DATABASE vendordb      OWNER vip_app;
CREATE DATABASE invoicedb     OWNER vip_app;
CREATE DATABASE approvaldb    OWNER vip_app;
CREATE DATABASE integrationdb OWNER vip_app;

-- 3. Postgres 15+ locks down the public schema: a non-owner cannot CREATE tables
--    in it. Give the app role ownership of each database's public schema so cds
--    deploy can create its tables. (\connect switches DB inside the psql script.)
\connect vendordb
ALTER SCHEMA public OWNER TO vip_app;
GRANT ALL ON SCHEMA public TO vip_app;

\connect invoicedb
ALTER SCHEMA public OWNER TO vip_app;
GRANT ALL ON SCHEMA public TO vip_app;

\connect approvaldb
ALTER SCHEMA public OWNER TO vip_app;
GRANT ALL ON SCHEMA public TO vip_app;

\connect integrationdb
ALTER SCHEMA public OWNER TO vip_app;
GRANT ALL ON SCHEMA public TO vip_app;
