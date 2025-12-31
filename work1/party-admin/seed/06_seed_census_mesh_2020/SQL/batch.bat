@echo off
REM Execute delete then run all parts 0001..0935
REM Uses zero-padding to build filenames; adjust end number if needed
rem call wrangler d1 execute party-admin-db --command "delete from census_mesh_2020"

setlocal enabledelayedexpansion
for /L %%i in (1,1,468) do (
	set "n=0000%%i"
	set "f=seed_census_mesh_2020_part_!n:~-4!.sql"
	echo === Processing !f! ===
	call wrangler d1 execute party-admin-db --file=!f! --remote -y
)

endlocal