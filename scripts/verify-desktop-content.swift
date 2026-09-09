import CoreGraphics

@main struct VerifyDesktopContent {
    static func main() {
        let iconLayer = Int(CGWindowLevelForKey(.desktopIconWindow))
        precondition(isDesktopIconWindow(bundleIdentifier: "com.apple.finder", layer: iconLayer))
        precondition(!isDesktopIconWindow(bundleIdentifier: "com.apple.finder", layer: Int(CGWindowLevelForKey(.normalWindow))))
        precondition(!isDesktopIconWindow(bundleIdentifier: "com.apple.finder", layer: Int(CGWindowLevelForKey(.desktopWindow))))
        precondition(!isDesktopIconWindow(bundleIdentifier: "com.apple.dock", layer: iconLayer))
        precondition(!isDesktopIconWindow(bundleIdentifier: nil, layer: iconLayer))
        print("Desktop icon classification passed; normal Finder windows, wallpaper, and other apps are retained.")
    }
}
