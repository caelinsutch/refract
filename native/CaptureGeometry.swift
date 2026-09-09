import CoreGraphics

func validCaptureRect(_ rect: CGRect) -> Bool {
    !rect.isNull && !rect.isInfinite
        && [rect.origin.x, rect.origin.y, rect.width, rect.height].allSatisfy { $0.isFinite }
        && rect.size.width > 0 && rect.size.height > 0
}

/// AppKit mouse coordinates use a bottom-left origin; capture rectangles use Quartz screen coordinates.
func normalizedCursorPosition(_ location: CGPoint, mainDisplayHeight: CGFloat, bounds: CGRect) -> CGPoint? {
    guard validCaptureRect(bounds), location.x.isFinite, location.y.isFinite, mainDisplayHeight.isFinite else { return nil }
    return normalizedQuartzCursorPosition(CGPoint(x: location.x, y: mainDisplayHeight - location.y), bounds: bounds)
}

/// Event taps report Quartz coordinates directly.
func normalizedQuartzCursorPosition(_ location: CGPoint, bounds: CGRect) -> CGPoint? {
    guard validCaptureRect(bounds), location.x.isFinite, location.y.isFinite else { return nil }
    let point = CGPoint(x: (location.x - bounds.minX) / bounds.width,
                        y: (location.y - bounds.minY) / bounds.height)
    guard point.x >= 0, point.x <= 1, point.y >= 0, point.y <= 1 else { return nil }
    return point
}

/// Area coordinates are local to the selected display in logical pixels.
func validCaptureArea(_ area: CGRect, displaySize: CGSize) -> Bool {
    validCaptureRect(area) && area.width >= 32 && area.height >= 32
        && area.minX >= 0 && area.minY >= 0
        && area.maxX <= displaySize.width && area.maxY <= displaySize.height
}
