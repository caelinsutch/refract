import AppKit

/// Decorative material must never intercept the HTML controls or drag regions.
private final class RecorderMaterialHost: NSView {
    override func hitTest(_ point: NSPoint) -> NSView? { nil }
}

private func installMaterial(_ view: NSView) -> Bool {
    guard Thread.isMainThread, let window = view.window else { return false }
    let identifier = NSUserInterfaceItemIdentifier("refract.recorder.glass")
    if view.subviews.contains(where: { $0.identifier == identifier }) { return true }
    window.isOpaque = false
    window.backgroundColor = .clear
    let host = RecorderMaterialHost()
    host.identifier = identifier
    host.translatesAutoresizingMaskIntoConstraints = false
    let material: NSView
    if #available(macOS 26.0, *) {
        let glass = NSGlassEffectView()
        glass.style = .regular
        glass.cornerRadius = 19
        glass.contentView = NSView()
        material = glass
    } else {
        let frost = NSVisualEffectView()
        frost.material = .hudWindow
        frost.blendingMode = .behindWindow
        frost.state = .active
        frost.wantsLayer = true
        frost.layer?.cornerRadius = 19
        frost.layer?.masksToBounds = true
        material = frost
    }
    material.translatesAutoresizingMaskIntoConstraints = false
    host.addSubview(material)
    view.addSubview(host, positioned: .below, relativeTo: nil)
    NSLayoutConstraint.activate([
        host.leadingAnchor.constraint(equalTo: view.leadingAnchor),
        host.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        host.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        host.heightAnchor.constraint(equalToConstant: 64),
        material.leadingAnchor.constraint(equalTo: host.leadingAnchor),
        material.trailingAnchor.constraint(equalTo: host.trailingAnchor),
        material.topAnchor.constraint(equalTo: host.topAnchor),
        material.bottomAnchor.constraint(equalTo: host.bottomAnchor),
    ])
    return true
}

private let install: napi_callback = { env, info in
    var result: napi_value?
    var arg: napi_value?
    var count = 1
    var buffer = false
    var bytes: UnsafeMutableRawPointer?
    var length = 0
    var installed = false
    if napi_get_cb_info(env, info, &count, &arg, nil, nil) == 0,
       count == 1, napi_is_buffer(env, arg, &buffer) == 0, buffer,
       napi_get_buffer_info(env, arg, &bytes, &length) == 0,
       length == MemoryLayout<UnsafeRawPointer>.size, let bytes,
       let pointer = UnsafeRawPointer(bitPattern: bytes.loadUnaligned(as: UInt.self)) {
        installed = installMaterial(Unmanaged<NSView>.fromOpaque(pointer).takeUnretainedValue())
    }
    _ = napi_get_boolean(env, installed, &result)
    return result
}

// Panel geometry comes from the shared renderer surface, in CSS screen points.
private let panel: napi_callback = { env, info in
    var args: [napi_value?] = [nil, nil]
    var count = 2
    var result: napi_value?
    var bytes: UnsafeMutableRawPointer?
    var length = 0
    var ok = false
    if Thread.isMainThread,
       napi_get_cb_info(env, info, &count, &args, nil, nil) == 0, count == 2,
       napi_get_buffer_info(env, args[0], &bytes, &length) == 0,
       length == MemoryLayout<UnsafeRawPointer>.size, let bytes,
       let pointer = UnsafeRawPointer(bitPattern: bytes.loadUnaligned(as: UInt.self)) {
        var size = 0
        _ = napi_get_value_string_utf8(env, args[1], nil, 0, &size)
        var text = [CChar](repeating: 0, count: size + 1)
        _ = napi_get_value_string_utf8(env, args[1], &text, text.count, &size)
        let view = Unmanaged<NSView>.fromOpaque(pointer).takeUnretainedValue()
        let id = NSUserInterfaceItemIdentifier("refract.recorder.panel")
        let existing = view.subviews.first { $0.identifier == id }
        if let data = String(cString: text).data(using: .utf8),
           let rect = try? JSONSerialization.jsonObject(with: data) as? [String: Double],
           let x = rect["x"], let y = rect["y"], let width = rect["width"], let height = rect["height"] {
            let host = existing ?? RecorderMaterialHost()
            if existing == nil {
                host.identifier = id
                let material: NSView
                if #available(macOS 26.0, *) {
                    let glass = NSGlassEffectView()
                    glass.style = .regular
                    glass.cornerRadius = 19
                    glass.contentView = NSView()
                    material = glass
                } else {
                    let frost = NSVisualEffectView()
                    frost.material = .hudWindow
                    frost.blendingMode = .behindWindow
                    frost.state = .active
                    frost.wantsLayer = true
                    frost.layer?.cornerRadius = 19
                    frost.layer?.masksToBounds = true
                    material = frost
                }
                material.autoresizingMask = [.width, .height]
                host.addSubview(material)
                view.addSubview(host, positioned: .below, relativeTo: nil)
            }
            host.frame = NSRect(x: x, y: view.isFlipped ? y : view.bounds.height - y - height, width: width, height: height)
            host.subviews.first?.frame = host.bounds
            ok = true
        } else {
            existing?.removeFromSuperview()
            ok = true
        }
    }
    _ = napi_get_boolean(env, ok, &result)
    return result
}

/// Render the system application icon at 3x its 96-point picker size.
private let applicationIcon: napi_callback = { env, info in
    var argument: napi_value?
    var count = 1
    var result: napi_value?
    var output = ""
    if Thread.isMainThread, napi_get_cb_info(env, info, &count, &argument, nil, nil) == 0, count == 1 {
        var length = 0
        if napi_get_value_string_utf8(env, argument, nil, 0, &length) == 0, length > 0, length < 8192 {
            var text = [CChar](repeating: 0, count: length + 1)
            if napi_get_value_string_utf8(env, argument, &text, text.count, &length) == 0,
               let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 288, pixelsHigh: 288, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
               let context = NSGraphicsContext(bitmapImageRep: bitmap) {
                let icon = NSWorkspace.shared.icon(forFile: String(cString: text))
                NSGraphicsContext.saveGraphicsState()
                NSGraphicsContext.current = context
                context.imageInterpolation = .high
                icon.draw(in: NSRect(x: 0, y: 0, width: 288, height: 288), from: .zero, operation: .copy, fraction: 1)
                NSGraphicsContext.restoreGraphicsState()
                if let png = bitmap.representation(using: .png, properties: [:]) {
                    output = "data:image/png;base64," + png.base64EncodedString()
                }
            }
        }
    }
    output.withCString { text in _ = napi_create_string_utf8(env, text, output.utf8.count, &result) }
    return result
}

private let symbolAtlas: napi_callback = { env, _ in
    var result: napi_value?
    let atlas = recorderSymbolAtlas()
    atlas.withCString { text in
        _ = napi_create_string_utf8(env, text, atlas.utf8.count, &result)
    }
    return result
}

@_cdecl("napi_register_module_v1")
public func registerRecorderGlass(_ env: napi_env?, _ exports: napi_value?) -> napi_value? {
    var function: napi_value?
    _ = napi_create_function(env, "install", 7, install, nil, &function)
    _ = napi_set_named_property(env, exports, "install", function)
    _ = napi_create_function(env, "symbolAtlas", 11, symbolAtlas, nil, &function)
    _ = napi_set_named_property(env, exports, "symbolAtlas", function)
    _ = napi_create_function(env, "panel", 5, panel, nil, &function)
    _ = napi_set_named_property(env, exports, "panel", function)
    _ = napi_create_function(env, "applicationIcon", 15, applicationIcon, nil, &function)
    _ = napi_set_named_property(env, exports, "applicationIcon", function)
    return exports
}
