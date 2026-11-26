@echo off
cd /d "%~dp0"
python -B service\server.py
if errorlevel 1 pause
