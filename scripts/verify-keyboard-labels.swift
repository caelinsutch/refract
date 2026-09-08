import AppKit

@main struct VerifyKeyboardLabels {
    static func main() {
        for number in 1...35 {
            let character = String(UnicodeScalar(NSF1FunctionKey + number - 1)!)
            precondition(keyboardLabel(keyCode: 0, characters: character) == "F\(number)")
        }
        precondition(keyboardLabel(keyCode: 123, characters: "\u{F702}") == "←")
        precondition(keyboardLabel(keyCode: 36, characters: "\r") == "Return")
        precondition(keyboardLabel(keyCode: 76, characters: nil) == "Enter")
        precondition(keyboardLabel(keyCode: 49, characters: " ") == "Space")
        precondition(keyboardLabel(keyCode: 0, characters: "a") == "A")
        precondition(keyboardLabel(keyCode: 0, characters: "é") == "É")
        precondition(keyboardLabel(keyCode: 0, characters: "界") == "界")
        precondition(keyboardLabel(keyCode: 0, characters: nil) == nil)
        precondition(keyboardLabel(keyCode: 0, characters: "\u{0001}") == nil)
        precondition(keyboardLabel(keyCode: 0, characters: "\u{F8FF}") == nil)
        print("Native keyboard labels passed: F1–F35, navigation, text and unsupported characters")
    }
}
