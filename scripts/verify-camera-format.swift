import Foundation

@main struct VerifyCameraFormat {
    static func main() {
        let formats = [
            CameraFormatChoice(width: 640, height: 480, minFPS: 1, maxFPS: 30),
            CameraFormatChoice(width: 1280, height: 720, minFPS: 1, maxFPS: 30),
            CameraFormatChoice(width: 1920, height: 1080, minFPS: 1, maxFPS: 24),
            CameraFormatChoice(width: 1920, height: 1080, minFPS: 1, maxFPS: 60),
            CameraFormatChoice(width: 3840, height: 2160, minFPS: 1, maxFPS: 30),
            CameraFormatChoice(width: 7680, height: 4320, minFPS: 1, maxFPS: 30),
        ]
        precondition(cameraFormatIndex(formats, limit: 720) == 1)
        precondition(cameraFormatIndex(formats, limit: 1080) == 3)
        precondition(cameraFormatIndex(formats, limit: 2160) == 4)
        precondition(cameraFormatIndex(Array(formats.prefix(2)), limit: 2160) == 1)
        precondition(cameraFormatIndex(formats, limit: -1) == 1)
        precondition(cameraFormatIndex([], limit: 720) == nil)
        precondition(cameraFormatIndex([formats[5]], limit: 2160) == nil)
        precondition(cameraFormatIndex([CameraFormatChoice(width: 1280, height: 720, minFPS: 60, maxFPS: 120)], limit: 720) == nil)
        precondition(cameraFormatIndex([CameraFormatChoice(width: 1280, height: 720, minFPS: 1, maxFPS: 24)], limit: 720) == 0)
        print("Camera format selection passed: limits, fallback, frame rates, unsupported cameras.")
    }
}
