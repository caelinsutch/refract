import CoreGraphics

@main struct VerifyCaptureGeometry {
    static func main() {
        let initial = CGRect(x: 200, y: 100, width: 800, height: 600)
        let moved = CGRect(x: 400, y: 200, width: 800, height: 600)
        let before = normalizedCursorPosition(CGPoint(x: 400, y: 700), mainDisplayHeight: 1000, bounds: initial)
        let after = normalizedCursorPosition(CGPoint(x: 600, y: 600), mainDisplayHeight: 1000, bounds: moved)
        precondition(before == after, "Moving the window and pointer together must preserve cursor alignment")
        precondition(before == CGPoint(x: 0.25, y: 1.0 / 3.0))
        let secondary = CGRect(x: -1600, y: -200, width: 1200, height: 800)
        precondition(normalizedCursorPosition(CGPoint(x: -1000, y: 800), mainDisplayHeight: 1000, bounds: secondary) == CGPoint(x: 0.5, y: 0.5))
        precondition(normalizedCursorPosition(CGPoint(x: 100, y: 700), mainDisplayHeight: 1000, bounds: initial) == nil)
        precondition(normalizedCursorPosition(CGPoint(x: 200, y: 900), mainDisplayHeight: 1000, bounds: initial) == .zero)
        precondition(!validCaptureRect(.zero))
        precondition(!validCaptureRect(.infinite))
        precondition(normalizedCursorPosition(CGPoint(x: CGFloat.nan, y: 10), mainDisplayHeight: 1000, bounds: initial) == nil)
        let decoded = CGRect(dictionaryRepresentation: moved.dictionaryRepresentation)!
        precondition(decoded == moved && validCaptureRect(decoded))
        print("Capture geometry: moving windows, secondary displays, bounds and invalid coordinates passed")
    }
}
