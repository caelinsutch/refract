import CoreGraphics
import CoreMedia
@main struct VerifyRecordedClicks {
    static func main() {
        let r = Recorder()
        r.origin = CMTime(seconds: 10, preferredTimescale: 1000)
        r.bounds = CGRect(x: -1000, y: 200, width: 800, height: 600)
        let point = CGPoint(x: -600, y: 500)
        r.recordClick(point, timestamp: 10.001)
        r.recordClick(point, timestamp: 10.002)
        precondition(r.cursor.count == 3, "Both clicks within one polling interval must survive")
        precondition(r.cursor[1]["x"] as? CGFloat == 0.5 && r.cursor[1]["y"] as? CGFloat == 0.5)
        precondition(abs((r.cursor[2]["time"] as! Double) - 2) < 0.001)
        r.recordClick(.zero, timestamp: 10.003)
        r.pausedAt = CMTime(seconds: 10.004, preferredTimescale: 1000)
        r.recordClick(point, timestamp: 10.005)
        precondition(r.cursor.count == 3)
        r.pausedAt = nil
        r.pauseOffset = CMTime(seconds: 2, preferredTimescale: 1000)
        r.keyboardAfter = 12.004
        r.recordClick(point, timestamp: 11)
        r.recordClick(point, timestamp: 12.010)
        precondition(r.cursor.count == 4)
        precondition(abs((r.cursor[3]["time"] as! Double) - 10) < 0.001)
        r.stopped = true
        r.recordClick(point, timestamp: 12.020)
        precondition(r.cursor.count == 4)
        let buttons = Recorder()
        buttons.origin = r.origin
        buttons.bounds = r.bounds
        buttons.recordClick(point, timestamp: 10.1, button: 1, pressed: true)
        buttons.recordClick(point, timestamp: 10.2, button: 1, pressed: false)
        precondition(buttons.cursor.count == 3)
        precondition(buttons.cursor[1]["button"] as? Int == 1)
        precondition(buttons.cursor[1]["click"] as? Bool == true)
        precondition(buttons.cursor[2]["pressed"] as? Bool == false)
        precondition(buttons.cursor[2]["click"] as? Bool == false)
        print("Recorded clicks: fast presses, Quartz geometry, pause/resume and stop passed")
    }
}
