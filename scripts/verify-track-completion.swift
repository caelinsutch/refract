import Foundation
import AVFoundation
@main struct Verify {
    static func main() async throws {
        for name in ["Microphone", "Camera"] {
            let dir = URL(fileURLWithPath: "work/track-completion-" + name)
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            let file = dir.appendingPathComponent("incomplete.mov")
            try? FileManager.default.removeItem(at: file)
            let incomplete = try AVAssetWriter(outputURL: file, fileType: .mov)
            let recorder = Recorder()
            recorder.output = dir.path
            if name == "Microphone" { recorder.micWriter = incomplete } else { recorder.cameraWriter = incomplete }
            await recorder.stop()
            precondition(FileManager.default.fileExists(atPath: dir.appendingPathComponent("cursor.json").path))
            precondition(FileManager.default.fileExists(atPath: dir.appendingPathComponent("keyboard.json").path))
        }
    }
}
