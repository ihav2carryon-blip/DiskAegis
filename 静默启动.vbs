Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "启动应用.bat" & Chr(34), 0
Set WshShell = Nothing
