@echo off
rem Mở ClinPharmAI Hub trên máy: chạy máy chủ tĩnh cục bộ rồi mở trình duyệt.
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Can cai Node.js: https://nodejs.org & pause & exit /b 1)
start "" http://localhost:8080
node tools\serve.mjs 8080
