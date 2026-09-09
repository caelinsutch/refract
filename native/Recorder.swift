import Foundation
import AppKit
import ScreenCaptureKit
import AVFoundation
import CoreMedia

func emit(_ object: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: object), let line = String(data: data, encoding: .utf8) {
        print(line); fflush(stdout)
    }
}
struct CaptureConfig: Decodable {
    let mode: String
    let displayId: UInt32?
    let windowId: UInt32?
    let area: Rect?
    let systemAudio: Bool
    let hideDesktopIcons: Bool?
    let cameraId: String?
    let cameraResolution: Int?
    let microphoneId: String?
    let output: String
    struct Rect: Decodable { let x: Double; let y: Double; let width: Double; let height: Double }
}
// Capture callbacks and mutable event state are serialized on queue. Start runs before
// callbacks begin; finalization runs only after the queue marks stopped and SCStream stops.
final class Recorder: NSObject, SCStreamOutput, SCStreamDelegate, AVCaptureVideoDataOutputSampleBufferDelegate, @unchecked Sendable {
    var stream: SCStream?
    var writer: AVAssetWriter?
    var videoInput: AVAssetWriterInput?
    var audioInput: AVAssetWriterInput?
    var micWriter: AVAssetWriter?
    var micInput: AVAssetWriterInput?
    var origin: CMTime?
    var pausedAt: CMTime?
    var pauseOffset: CMTime = .zero
    var stopped = false
    var stoppedAt: CMTime?
    var lastVideo: CMSampleBuffer?
    var lastVideoTime: CMTime = .invalid
    var cursor: [[String: Any]] = [["time": 0.0, "x": 0.0, "y": 0.0, "visible": false]]
    var cursorInside = false
    var keyboard: [[String: Any]] = []
    var keyboardCapture: KeyboardCapture?
    var keyboardStatus = "unavailable"
    var keyboardAfter: Double = 0
    var cursorTimer: DispatchSourceTimer?
    var cursorButtons = CursorButtons()
    var bounds: CGRect = .zero
    var capturesWindow = false
    var output = ""
    var cameraSession: AVCaptureSession?
    var cameraWriter: AVAssetWriter?
    var cameraInput: AVAssetWriterInput?
    let queue = DispatchQueue(label: "com.caelinsutch.refract.capture")
    func hostTime() -> CMTime { CMClockGetTime(CMClockGetHostTimeClock()) }
    func normalizedTime() -> Double { guard let origin else { return 0 }; return CMTimeGetSeconds(CMTimeSubtract(CMTimeSubtract(pausedAt ?? stoppedAt ?? hostTime(), origin), pauseOffset)) * 1000 }
    @MainActor func start(_ config: CaptureConfig) async throws {
        // Window filters consult WindowServer through AppKit. Initialize that
        // connection on the main thread before creating capture filters.
        _ = NSApplication.shared
        NSApp.setActivationPolicy(.prohibited)
        output = config.output
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        let filter: SCContentFilter
        if config.mode == "window" {
            capturesWindow = true
            guard let window = content.windows.first(where: { $0.windowID == config.windowId }) else { throw NSError(domain: "Refract", code: 1, userInfo: [NSLocalizedDescriptionKey: "The selected window is no longer available."]) }
            filter = SCContentFilter(desktopIndependentWindow: window); bounds = window.frame
        } else {
            guard let display = content.displays.first(where: { $0.displayID == config.displayId }) else { throw NSError(domain: "Refract", code: 2, userInfo: [NSLocalizedDescriptionKey: "The selected display is no longer available. Choose a display again."]) }
            if config.mode == "area" {
                guard let area = config.area,
                      validCaptureArea(CGRect(x: area.x, y: area.y, width: area.width, height: area.height), displaySize: display.frame.size) else {
                    throw NSError(domain: "Refract", code: 3, userInfo: [NSLocalizedDescriptionKey: "The recording area no longer fits this display. Choose an area again."])
                }
            }
            let excluded = content.applications.filter { $0.bundleIdentifier == "com.github.Electron" || $0.bundleIdentifier == "com.caelinsutch.refract" }
            let desktopIcons = config.hideDesktopIcons == true ? content.windows.filter {
                isDesktopIconWindow(bundleIdentifier: $0.owningApplication?.bundleIdentifier, layer: $0.windowLayer)
            } : []
            filter = SCContentFilter(display: display, excludingApplications: excluded, exceptingWindows: desktopIcons)
            bounds = display.frame
            if let area = config.area { bounds = CGRect(x: display.frame.minX + area.x, y: display.frame.minY + area.y, width: area.width, height: area.height) }
        }
        let settings = SCStreamConfiguration()
        let backingScale = min(2.0, 3840 / max(bounds.width, bounds.height))
        settings.width = max(2, Int(bounds.width * backingScale) / 2 * 2)
        settings.height = max(2, Int(bounds.height * backingScale) / 2 * 2)
        settings.minimumFrameInterval = CMTime(value: 1, timescale: 60)
        settings.queueDepth = 5
        settings.showsCursor = false
        settings.capturesAudio = config.systemAudio
        settings.excludesCurrentProcessAudio = true
        settings.sampleRate = 48000
        settings.channelCount = 2
        if let area = config.area { settings.sourceRect = CGRect(x: area.x, y: area.y, width: area.width, height: area.height) }
        if #available(macOS 15.0, *), let mic = config.microphoneId {
            settings.captureMicrophone = true
            settings.microphoneCaptureDeviceID = mic
        }
        try FileManager.default.createDirectory(atPath: output, withIntermediateDirectories: true)
        let writer = try AVAssetWriter(outputURL: URL(fileURLWithPath: output).appendingPathComponent("screen.mp4"), fileType: .mp4)
        let video = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: settings.width, AVVideoHeightKey: settings.height, AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 20_000_000, AVVideoMaxKeyFrameIntervalKey: 60]])
        video.expectsMediaDataInRealTime = true
        writer.add(video); self.writer = writer; videoInput = video
        let audioSettings: [String: Any] = [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 192000]
        if config.systemAudio { let audio = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings); audio.expectsMediaDataInRealTime = true; writer.add(audio); audioInput = audio }
        if config.microphoneId != nil {
            let mic = try AVAssetWriter(outputURL: URL(fileURLWithPath: output).appendingPathComponent("microphone.mov"), fileType: .mov)
            let input = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings); input.expectsMediaDataInRealTime = true; mic.add(input); micWriter = mic; micInput = input
        }
        if let cameraId = config.cameraId {
            let devices = AVCaptureDevice.DiscoverySession(deviceTypes: [.builtInWideAngleCamera, .external, .continuityCamera], mediaType: .video, position: .unspecified).devices
            guard let device = devices.first(where: { $0.uniqueID == cameraId }) else { throw NSError(domain: "Refract", code: 4, userInfo: [NSLocalizedDescriptionKey: "The selected camera is no longer available."]) }
            let session = AVCaptureSession(); session.beginConfiguration()
            let input = try AVCaptureDeviceInput(device: device)
            guard session.canAddInput(input) else { throw NSError(domain: "Refract", code: 5, userInfo: [NSLocalizedDescriptionKey: "The camera could not be connected."]) }
            session.addInput(input)
            let candidates = device.formats.flatMap { format in
                format.videoSupportedFrameRateRanges.map { range in (format, range) }
            }
            let choices = candidates.map { format, range in
                let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
                return CameraFormatChoice(width: dimensions.width, height: dimensions.height, minFPS: range.minFrameRate, maxFPS: range.maxFrameRate)
            }
            guard let selectedIndex = cameraFormatIndex(choices, limit: config.cameraResolution ?? 720) else {
                throw NSError(domain: "Refract", code: 6, userInfo: [NSLocalizedDescriptionKey: "This camera has no supported format within the selected resolution. Choose a higher camera resolution or another camera."])
            }
            let selected = candidates[selectedIndex]
            let dimensions = choices[selectedIndex]
            let videoOutput = AVCaptureVideoDataOutput(); videoOutput.alwaysDiscardsLateVideoFrames = true
            videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
            videoOutput.setSampleBufferDelegate(self, queue: queue)
            guard session.canAddOutput(videoOutput) else { throw NSError(domain: "Refract", code: 7, userInfo: [NSLocalizedDescriptionKey: "The camera video output could not be connected."]) }
            session.addOutput(videoOutput)
            try device.lockForConfiguration()
            device.activeFormat = selected.0
            let frameDuration = selected.1.maxFrameRate >= 30 ? CMTime(value: 1, timescale: 30) : selected.1.minFrameDuration
            device.activeVideoMinFrameDuration = frameDuration
            device.activeVideoMaxFrameDuration = frameDuration
            device.unlockForConfiguration()
            session.commitConfiguration()
            let camera = try AVAssetWriter(outputURL: URL(fileURLWithPath: output).appendingPathComponent("camera.mp4"), fileType: .mp4)
            let cameraVideo = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: Int(dimensions.width), AVVideoHeightKey: Int(dimensions.height), AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: max(2000000, Int(dimensions.width) * Int(dimensions.height) * 6)]])
            guard camera.canAdd(cameraVideo) else { throw NSError(domain: "Refract", code: 8, userInfo: [NSLocalizedDescriptionKey: "The selected camera format could not be encoded."]) }
            cameraVideo.expectsMediaDataInRealTime = true; camera.add(cameraVideo)
            cameraWriter = camera; cameraInput = cameraVideo; cameraSession = session
            session.startRunning()
        }
        let stream = SCStream(filter: filter, configuration: settings, delegate: self)
        self.stream = stream
        try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: queue)
        if config.systemAudio { try stream.addStreamOutput(self, type: .audio, sampleHandlerQueue: queue) }
        if #available(macOS 15.0, *), config.microphoneId != nil { try stream.addStreamOutput(self, type: .microphone, sampleHandlerQueue: queue) }
        try await stream.startCapture()
        let keyboardCapture = KeyboardCapture(receive: { [weak self] event, timestamp in
            guard let self else { return }
            self.queue.async {
                guard let origin = self.origin, self.pausedAt == nil, !self.stopped, timestamp >= self.keyboardAfter else { return }
                let time = (timestamp - CMTimeGetSeconds(origin) - CMTimeGetSeconds(self.pauseOffset)) * 1000
                guard time >= 0 else { return }
                var sample = event; sample["time"] = time; self.keyboard.append(sample)
            }
        }, receiveClick: { [weak self] location, timestamp, button, pressed in
            guard let self else { return }
            self.queue.async {
                self.recordClick(location, timestamp: timestamp, button: button, pressed: pressed)
            }
        })
        self.keyboardCapture = keyboardCapture
        keyboardStatus = keyboardCapture.start()
        emit(["event": "started", "width": settings.width, "height": settings.height, "keyboardStatus": keyboardStatus])
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now(), repeating: .milliseconds(16))
        timer.setEventHandler { [weak self] in self?.sampleCursor() }
        cursorTimer = timer; timer.resume()
    }
    // Called only on the capture queue, like the periodic pointer samples.
    func recordClick(_ location: CGPoint, timestamp: Double, button: Int = 0, pressed: Bool = true) {
        guard let origin, pausedAt == nil, !stopped, timestamp >= keyboardAfter,
              let point = normalizedQuartzCursorPosition(location, bounds: bounds) else { return }
        let time = (timestamp - CMTimeGetSeconds(origin) - CMTimeGetSeconds(pauseOffset)) * 1000
        guard time >= 0 else { return }
        cursor.append(["time": time, "x": point.x, "y": point.y, "click": pressed, "visible": true, "button": button, "pressed": pressed])
        cursorInside = true
    }
    func sampleCursor() {
        let recording = origin != nil && pausedAt == nil && !stopped
        let click = cursorButtons.sample(NSEvent.pressedMouseButtons, recording: recording && keyboardStatus != "available")
        guard recording else { return }
        let location = NSEvent.mouseLocation
        let mainHeight = CGDisplayBounds(CGMainDisplayID()).height
        if let point = normalizedCursorPosition(location, mainDisplayHeight: mainHeight, bounds: bounds) {
            cursor.append(["time": max(0, normalizedTime()), "x": point.x, "y": point.y, "click": click, "visible": true])
            cursorInside = true
        } else if cursorInside {
            cursor.append(["time": max(0, normalizedTime()), "x": cursor.last?["x"] ?? 0.0, "y": cursor.last?["y"] ?? 0.0, "visible": false])
            cursorInside = false
        }
    }
    func retime(_ sample: CMSampleBuffer, to time: CMTime? = nil) -> CMSampleBuffer? {
        guard let origin else { return nil }
        var timing = CMSampleTimingInfo(duration: CMSampleBufferGetDuration(sample), presentationTimeStamp: time ?? CMTimeSubtract(CMTimeSubtract(CMSampleBufferGetPresentationTimeStamp(sample), origin), pauseOffset), decodeTimeStamp: .invalid)
        guard CMTimeCompare(timing.presentationTimeStamp, .zero) >= 0 else { return nil }
        var copy: CMSampleBuffer?
        guard CMSampleBufferCreateCopyWithNewTiming(allocator: kCFAllocatorDefault, sampleBuffer: sample, sampleTimingEntryCount: 1, sampleTimingArray: &timing, sampleBufferOut: &copy) == noErr else { return nil }
        return copy
    }
    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard sampleBuffer.isValid, !stopped, pausedAt == nil else { return }
        if type == .screen {
            guard let attachments = CMSampleBufferGetSampleAttachmentsArray(sampleBuffer, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]], let status = attachments.first?[.status] as? Int, status == SCFrameStatus.complete.rawValue else { return }
            if capturesWindow,
               let rectangle = attachments.first?[.screenRect] as? [String: Any],
               let currentBounds = CGRect(dictionaryRepresentation: rectangle as CFDictionary),
               validCaptureRect(currentBounds) {
                bounds = currentBounds
            }
            if origin == nil { origin = CMSampleBufferGetPresentationTimeStamp(sampleBuffer); writer?.startWriting(); writer?.startSession(atSourceTime: .zero); micWriter?.startWriting(); micWriter?.startSession(atSourceTime: .zero); cameraWriter?.startWriting(); cameraWriter?.startSession(atSourceTime: .zero) }
            if let sample = retime(sampleBuffer), let input = videoInput, input.isReadyForMoreMediaData {
                if input.append(sample) { lastVideo = sampleBuffer; lastVideoTime = CMSampleBufferGetPresentationTimeStamp(sample) }
            }
        } else if type == .audio {
            if let sample = retime(sampleBuffer), let input = audioInput, input.isReadyForMoreMediaData { input.append(sample) }
        } else if #available(macOS 15.0, *), type == .microphone {
            if let sample = retime(sampleBuffer), let input = micInput, input.isReadyForMoreMediaData { input.append(sample) }
        }
    }
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard !stopped, pausedAt == nil, let sample = retime(sampleBuffer), let input = cameraInput, input.isReadyForMoreMediaData else { return }
        input.append(sample)
    }
    func stream(_ stream: SCStream, didStopWithError error: Error) { emit(["event": "error", "message": error.localizedDescription]) }
    func pause() { queue.async { guard self.pausedAt == nil else { return }; self.pausedAt = self.hostTime(); emit(["event": "paused"]) } }
    func resume() { queue.async { guard let paused = self.pausedAt else { return }; self.pauseOffset = CMTimeAdd(self.pauseOffset, CMTimeSubtract(self.hostTime(), paused)); _ = self.cursorButtons.sample(NSEvent.pressedMouseButtons, recording: false); self.keyboardAfter = CMTimeGetSeconds(self.hostTime()); self.pausedAt = nil; emit(["event": "resumed"]) } }
    func stop() async {
        keyboardCapture?.stop()
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in queue.async { self.stoppedAt = self.pausedAt ?? self.hostTime(); self.stopped = true; self.cursorTimer?.cancel(); continuation.resume() } }
        try? await stream?.stopCapture()
        cameraSession?.stopRunning()
        let length = max(0, normalizedTime())
        if let final = lastVideo, let input = videoInput, input.isReadyForMoreMediaData, let sample = retime(final, to: CMTime(seconds: length / 1000, preferredTimescale: 60000)), CMTimeCompare(CMSampleBufferGetPresentationTimeStamp(sample), lastVideoTime) > 0 { input.append(sample) }
        videoInput?.markAsFinished(); audioInput?.markAsFinished(); micInput?.markAsFinished(); cameraInput?.markAsFinished()
        if let writer, writer.status == .writing { await writer.finishWriting() }
        if let micWriter, micWriter.status == .writing { await micWriter.finishWriting() }
        if let cameraWriter, cameraWriter.status == .writing { await cameraWriter.finishWriting() }
        do {
            let data = try JSONSerialization.data(withJSONObject: cursor)
            try data.write(to: URL(fileURLWithPath: output).appendingPathComponent("cursor.json"), options: .atomic)
            let keyData = try JSONSerialization.data(withJSONObject: keyboard)
            try keyData.write(to: URL(fileURLWithPath: output).appendingPathComponent("keyboard.json"), options: .atomic)
        } catch {
            emit(["event": "error", "message": error.localizedDescription])
            return
        }
        let tracks: [(String, AVAssetWriter?)] = [("Screen", writer), ("Microphone", micWriter), ("Camera", cameraWriter)]
        for (name, track) in tracks {
            guard let track else { continue }
            guard track.status == .completed else {
                let detail = track.error?.localizedDescription ?? "No complete media track was produced."
                emit(["event": "error", "message": "\(name) recording could not be saved. \(detail) Original recording files remain in the project folder."])
                return
            }
        }
        emit(["event": "finished", "duration": length, "output": output])
    }
}
@main struct CaptureMain {
    static func main() async {
        if CommandLine.arguments.contains("--keyboard-permission") {
            emit(["keyboardPermission": CGPreflightListenEventAccess() ? "granted" : "required"])
            return
        }
        if CommandLine.arguments.contains("--request-keyboard-permission") {
            emit(["keyboardPermission": (CGPreflightListenEventAccess() || CGRequestListenEventAccess()) ? "granted" : "required"])
            return
        }
        if CommandLine.arguments.contains("--request-permission") {
            let granted = CGPreflightScreenCaptureAccess() || CGRequestScreenCaptureAccess()
            emit(["permission": granted ? "granted" : "required"])
            return
        }
        if CommandLine.arguments.contains("--list") {
            guard CGPreflightScreenCaptureAccess() else { emit(["keyboardPermission": CGPreflightListenEventAccess() ? "granted" : "required", "permission": "required", "displays": [], "windows": [], "microphones": [], "cameras": []]); return }
            do { let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)
                let displays = content.displays.map { display in
                    let name = NSScreen.screens.first {
                        ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == display.displayID
                    }?.localizedName ?? "Display \(display.displayID)"
                    return ["id": display.displayID, "name": name, "width": display.width, "height": display.height] as [String: Any]
                }
                let windows = content.windows.filter { window in
                    // The chooser lists app windows, not desktop surfaces or overlays.
                    guard let app = window.owningApplication,
                          NSRunningApplication(processIdentifier: app.processID)?.activationPolicy == .regular else { return false }
                    return window.windowLayer == 0 && window.frame.width > 100 && window.frame.height > 60
                        && app.processID != getppid() && app.bundleIdentifier != "com.caelinsutch.refract"
                }.map { window in
                    let app = window.owningApplication?.applicationName ?? ""
                    let title = window.title?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    return ["id": window.windowID, "name": title.isEmpty ? app : title, "app": app,
                            "appPath": window.owningApplication.flatMap { NSRunningApplication(processIdentifier: $0.processID)?.bundleURL?.path } ?? "",
                            "width": window.frame.width, "height": window.frame.height] as [String: Any]
                }
                let microphones = AVCaptureDevice.DiscoverySession(deviceTypes: [.microphone], mediaType: .audio, position: .unspecified).devices.map { ["id": $0.uniqueID, "name": $0.localizedName] }
                let cameras = AVCaptureDevice.DiscoverySession(deviceTypes: [.builtInWideAngleCamera, .external, .continuityCamera], mediaType: .video, position: .unspecified).devices.map { ["id": $0.uniqueID, "name": $0.localizedName] }
                emit(["keyboardPermission": CGPreflightListenEventAccess() ? "granted" : "required", "permission": "granted", "displays": displays, "windows": windows, "microphones": microphones, "cameras": cameras])
            } catch { emit(["event": "error", "message": error.localizedDescription]) }
            return
        }
        guard CommandLine.arguments.count >= 3, CommandLine.arguments[1] == "--record" else { emit(["usage": "refract-capture --list | --record config.json"]); return }
        let recorder = Recorder()
        do { let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[2])); let config = try JSONDecoder().decode(CaptureConfig.self, from: data); try await recorder.start(config)
            await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in DispatchQueue.global().async { while let line = readLine() { if line == "pause" { recorder.pause() } else if line == "resume" { recorder.resume() } else if line == "stop" { Task { await recorder.stop(); continuation.resume() }; return } }; Task { await recorder.stop(); continuation.resume() } } }
        } catch { emit(["event": "error", "message": error.localizedDescription]) }
    }
}
