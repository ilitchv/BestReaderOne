param(
    [string]$Directory
)

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime

    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

    Function Await($WinRtTask, $ResultType) {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        $netTask.Wait(-1) | Out-Null
        $netTask.Result
    }

    [Windows.Globalization.Language, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
    [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
    [Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
    [Windows.Storage.StorageFile, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null

    if (-not (Test-Path $Directory)) {
        Write-Error "Directory not found: $Directory"
        exit 1
    }

    $Engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if ($null -eq $Engine) {
        Write-Error "Could not create OcrEngine. Check language packs."
        exit 1
    }

    $Files = Get-ChildItem -Path $Directory -Filter "*.jpg"
    $AllResults = @()

    foreach ($FileItem in $Files) {
        try {
            # WinRT needs absolute path
            $AbsPath = $FileItem.FullName
            
            $StorageFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($AbsPath)) ([Windows.Storage.StorageFile])
            $Stream = Await ($StorageFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
            $Decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($Stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
            $SoftwareBitmap = Await ($Decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
            
            $OcrResult = Await ($Engine.RecognizeAsync($SoftwareBitmap)) ([Windows.Media.Ocr.OcrResult])
            
            $Words = $OcrResult.Lines | ForEach-Object {
                $Line = $_
                $FirstWordRect = $Line.Words[0].BoundingRect
                # Make sure we get scalar values
                $Y = $FirstWordRect.Y
                if ($Y -is [array]) { $Y = $Y[0] }
                $X = $FirstWordRect.X
                if ($X -is [array]) { $X = $X[0] }
                $H = $FirstWordRect.Height
                if ($H -is [array]) { $H = $H[0] }

                @{
                    Text   = $Line.Text
                    Top    = $Y
                    Left   = $X
                    Height = $H
                }
            }

            $AllResults += @{
                FileName = $FileItem.Name
                Data     = $Words
            }
        }
        catch {
            Write-Warning "Failed to process $($FileItem.Name): $_"
        }
    }

    $Json = $AllResults | ConvertTo-Json -Depth 4 -Compress
    $Json | Out-File -FilePath "$Directory\ocr_results.json" -Encoding UTF8
    Write-Host "Saved JSON to $Directory\ocr_results.json"
}
catch {
    Write-Error $_
}
