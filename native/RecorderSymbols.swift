import AppKit

/// Render installed system glyphs at runtime; no proprietary app assets are bundled.
func recorderSymbolAtlas() -> String {
    guard Thread.isMainThread else { return "{}" }
    let symbols = [
        "display": "dock.rectangle", "window": "macwindow",
        "area": "square.dashed", "device": "apps.iphone",
        "camera": "video", "cameraOff": "video.slash",
        "microphone": "microphone.fill", "microphoneOff": "microphone.slash.fill",
        "close": "xmark.circle.fill", "audio": "music.note.tv", "options": "gear", "chevronDown": "chevron.down"
    ]
    var result: [String: String] = [:]
    for (key, name) in symbols {
        let fallback = name.replacingOccurrences(of: "microphone", with: "mic")
        guard let source = NSImage(systemSymbolName: name, accessibilityDescription: nil)
                ?? NSImage(systemSymbolName: fallback, accessibilityDescription: nil),
              let image = source.withSymbolConfiguration(.init(pointSize: 22, weight: .regular)),
              let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 144, pixelsHigh: 144,
                bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
              let context = NSGraphicsContext(bitmapImageRep: bitmap) else { continue }
        // Preserve AppKit's point-size metrics instead of squeezing every symbol
        // into a square: wide glyphs naturally extend beyond the nominal font size.
        let size = NSSize(width: image.size.width * 3, height: image.size.height * 3)
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = context
        image.draw(in: NSRect(x: (144 - size.width) / 2, y: (144 - size.height) / 2,
                              width: size.width, height: size.height),
                   from: .zero, operation: .sourceOver, fraction: 1)
        NSGraphicsContext.restoreGraphicsState()
        if let png = bitmap.representation(using: .png, properties: [:]) {
            result[key] = "data:image/png;base64," + png.base64EncodedString()
        }
    }
    guard let json = try? JSONSerialization.data(withJSONObject: result),
          let text = String(data: json, encoding: .utf8) else { return "{}" }
    return text
}
