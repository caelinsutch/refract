import CoreGraphics

func isDesktopIconWindow(bundleIdentifier: String?, layer: Int) -> Bool {
    bundleIdentifier == "com.apple.finder" && layer == Int(CGWindowLevelForKey(.desktopIconWindow))
}
