
# PowerShell script to clean up legacy folders
$legacy = @("backend", "scraper", "api", "vercel.json")
New-Item -ItemType Directory -Force -Path "_legacy_backup"
foreach ($item in $legacy) {
    if (Test-Path $item) {
        Move-Item -Path $item -Destination "_legacy_backup" -Force
        Write-Host "Moved $item to backup"
    }
}
if (Test-Path "temp_analysis_repo") {
    Remove-Item -Path "temp_analysis_repo" -Recurse -Force
    Write-Host "Removed temp repo"
}
