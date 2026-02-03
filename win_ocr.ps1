param(
    [string]$ImagePath
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

    # Verify file exists
    if (-not (Test-Path $ImagePath)) {
        Write-Error "File not found: $ImagePath"
        exit 1
    }

    # Get file path in a format WinRT likes (absolute)
    $AbsPath = (Resolve-Path $ImagePath).Path

    $File = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($AbsPath)) ([Windows.Storage.StorageFile])
    $Stream = Await ($File.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $Decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($Stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $SoftwareBitmap = Await ($Decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    
    $Engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if ($null -eq $Engine) {
        Write-Error "Could not create OcrEngine. Check language packs."
        exit 1
    }

    $Result = Await ($Engine.RecognizeAsync($SoftwareBitmap)) ([Windows.Media.Ocr.OcrResult])
    
    $Output = $Result.Lines | ForEach-Object {
        $Line = $_
        $FirstWordRect = $Line.Words[0].BoundingRect
        [PSCustomObject]@{
            Text   = $Line.Text
            Top    = $FirstWordRect.Y
            Left   = $FirstWordRect.X
            Height = $FirstWordRect.Height
        }
    }
    $Output | ConvertTo-Json -Compress

}
catch {
    Write-Error $_
}
