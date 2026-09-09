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
    return exports
}
