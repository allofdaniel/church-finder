$env:JAVA_HOME = "C:\Android\jdk-21.0.2"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
Set-Location $PSScriptRoot
.\gradlew.bat bundleRelease
