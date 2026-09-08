import Foundation
import Speech
import AVFoundation

struct Word: Codable { let text: String; let start: Double; let end: Double }
func output(_ object: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: object), let text = String(data: data, encoding: .utf8) { print(text) }
}
@main struct LocalTranscriber {
    static func main() async {
        guard #available(macOS 26.0, *) else { output(["error": "Local captions require macOS 26 or later."]); exit(1) }
        do { try await transcribe() }
        catch { output(["error": error.localizedDescription]); exit(1) }
    }
    @available(macOS 26.0, *)
    static func transcribe() async throws {
        let args = CommandLine.arguments
        guard args.count >= 3 else { throw NSError(domain: "Refract", code: 1, userInfo: [NSLocalizedDescriptionKey: "Usage: refract-transcribe <audio-file|--status> <locale>"]) }
        guard SpeechTranscriber.isAvailable, let locale = await SpeechTranscriber.supportedLocale(equivalentTo: Locale(identifier: args[2])) else {
            throw NSError(domain: "Refract", code: 2, userInfo: [NSLocalizedDescriptionKey: "This language or device does not support local transcription."])
        }
        let transcriber = SpeechTranscriber(locale: locale, transcriptionOptions: [], reportingOptions: [], attributeOptions: [.audioTimeRange])
        if args[1] == "--status" {
            let status = await AssetInventory.status(forModules: [transcriber])
            output(["locale": locale.identifier, "installed": status == .installed]); return
        }
        if let request = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) { try await request.downloadAndInstall() }
        let file = try AVAudioFile(forReading: URL(fileURLWithPath: args[1]))
        let analyzer = SpeechAnalyzer(modules: [transcriber])
        let results = Task { () throws -> [Word] in
            var words: [Word] = []
            for try await result in transcriber.results {
                for run in result.text.runs {
                    let text = String(result.text[run.range].characters).trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !text.isEmpty else { continue }
                    let range = run.audioTimeRange ?? result.range
                    let start = CMTimeGetSeconds(range.start) * 1000
                    let end = CMTimeGetSeconds(CMTimeRangeGetEnd(range)) * 1000
                    if start.isFinite && end.isFinite && end > start { words.append(Word(text: text, start: start, end: end)) }
                }
            }
            return words
        }
        do {
            try await analyzer.start(inputAudioFile: file, finishAfterFile: true)
            let words = try await results.value
            let data = try JSONEncoder().encode(words)
            output(["words": try JSONSerialization.jsonObject(with: data), "locale": locale.identifier])
        } catch { results.cancel(); throw error }
    }
}
