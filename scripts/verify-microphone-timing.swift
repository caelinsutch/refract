import AVFoundation
import Foundation
import AppKit

@main struct Verify {
    @MainActor static func main() async throws {
        _ = NSApplication.shared
        let input = URL(fileURLWithPath: CommandLine.arguments[1])
        let output = URL(fileURLWithPath: CommandLine.arguments[2])
        try? FileManager.default.removeItem(at: output)
        let asset = AVURLAsset(url: input)
        let tracks = try await asset.loadTracks(withMediaType: .audio)
        let reader = try AVAssetReader(asset: asset)
        let read = AVAssetReaderTrackOutput(track: tracks[0], outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
        reader.add(read)
        let writer = try AVAssetWriter(outputURL: output, fileType: output.pathExtension == "mov" ? .mov : .m4a)
        let write = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 192000])
        writer.add(write)
        writer.startWriting()
        writer.startSession(atSourceTime: .zero)
        reader.startReading()
        while let sample = read.copyNextSampleBuffer() {
            while !write.isReadyForMoreMediaData { try await Task.sleep(for: .milliseconds(1)) }
            var timing = CMSampleTimingInfo(duration: CMSampleBufferGetDuration(sample), presentationTimeStamp: CMTimeAdd(CMSampleBufferGetPresentationTimeStamp(sample), CMTime(seconds: Double(CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : "0.6")!, preferredTimescale: 48000)), decodeTimeStamp: .invalid)
            var copy: CMSampleBuffer?
            let status = CMSampleBufferCreateCopyWithNewTiming(allocator: kCFAllocatorDefault, sampleBuffer: sample, sampleTimingEntryCount: 1, sampleTimingArray: &timing, sampleBufferOut: &copy)
            guard status == noErr, let copy, write.append(copy) else { throw writer.error ?? NSError(domain: "verification", code: Int(status)) }
        }
        write.markAsFinished()
        await writer.finishWriting()
        if let error = writer.error { throw error }
        print(output.path)
    }
}
