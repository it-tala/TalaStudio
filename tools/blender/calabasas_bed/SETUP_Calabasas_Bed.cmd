@echo off
rem Ganti rangka Calabasas Bed sesuai calabasus_bed_rev_1.dwg
rem Letakkan file ini di Studio_Furniture\ dan ganti_rangka_calabasas_bed.py di Studio_Furniture\99_SISTEM\
setlocal
set "ROOT=%~dp0"
set "BLEND=%ROOT%03_PROYEK\Calabasas_Bed_Plester.blend"
set "SKRIP=%ROOT%99_SISTEM\ganti_rangka_calabasas_bed.py"
set "BLENDER=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
if not exist "%BLENDER%" (echo Blender 5.2 tidak ditemukan: %BLENDER% & pause & exit /b 1)
if not exist "%BLEND%" (echo File tidak ada: %BLEND% & pause & exit /b 1)
copy /y "%BLEND%" "%ROOT%03_PROYEK\Calabasas_Bed_Plester_SEBELUM_REV1.blend" >nul
"%BLENDER%" -b "%BLEND%" --python "%SKRIP%" -- --save
echo.
echo Selesai. Buka dengan BUKA_Calabasas_Bed.cmd
pause
