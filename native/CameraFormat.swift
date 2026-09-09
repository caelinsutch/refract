import Foundation

struct CameraFormatChoice {
    let width: Int32
    let height: Int32
    let minFPS: Double
    let maxFPS: Double
}

/// Select the largest supported format within the requested ceiling, up to 30 fps.
func cameraFormatIndex(_ formats: [CameraFormatChoice], limit: Int) -> Int? {
    let height = [720, 1080, 2160].contains(limit) ? limit : 720
    let width = height * 16 / 9
    return formats.indices.filter { index in
        let format = formats[index]
        return format.width > 0 && format.height > 0 &&
            format.width <= width && format.height <= height &&
            format.minFPS > 0 && format.minFPS <= 30 &&
            format.maxFPS >= format.minFPS
    }.max { a, b in
        let left = formats[a], right = formats[b]
        let leftPixels = Int64(left.width) * Int64(left.height)
        let rightPixels = Int64(right.width) * Int64(right.height)
        if leftPixels != rightPixels { return leftPixels < rightPixels }
        return min(30, left.maxFPS) < min(30, right.maxFPS)
    }
}
