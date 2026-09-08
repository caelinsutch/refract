import AppKit

/// Convert AppKit's nonprinting key characters into readable recording labels.
func keyboardLabel(keyCode: UInt16, characters: String?) -> String? {
    let special: [UInt16: String] = [36:"Return",76:"Enter",48:"Tab",49:"Space",53:"Esc",51:"⌫",117:"⌦",123:"←",124:"→",125:"↓",126:"↑",115:"Home",119:"End",116:"Page Up",121:"Page Down",114:"Help"]
    if let label = special[keyCode] { return label }
    let characters = characters ?? ""
    if characters.unicodeScalars.count == 1, let scalar = characters.unicodeScalars.first {
        let value = Int(scalar.value)
        if value >= NSF1FunctionKey && value <= NSF35FunctionKey {
            return "F\(value - NSF1FunctionKey + 1)"
        }
    }
    let label = characters.uppercased()
    guard !label.isEmpty, label.count <= 16,
          !label.unicodeScalars.contains(where: {
              CharacterSet.controlCharacters.contains($0) ||
              $0.properties.generalCategory == .privateUse
          }) else { return nil }
    return label
}
