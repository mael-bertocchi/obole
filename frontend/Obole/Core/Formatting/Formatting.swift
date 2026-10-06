import Foundation

enum Formatting {

    /// How the interface's language writes a number. The rules are spelled out rather than read off a locale's
    /// formatter so the web, which mirrors them, prints the very same characters. English groups with commas and
    /// puts the symbol first; French groups with a no-break space, uses a decimal comma and puts the symbol last,
    /// after another no-break space: `€1,234.50` against `1 234,50 €`. The narrow space French typography prefers
    /// for thousands vanishes under the ring's tight tracking, so the full-width one is used throughout.
    private struct NumberStyle {
        let decimal: String
        let grouping: String
        let unitSeparator: String?

        static let english = NumberStyle(decimal: ".", grouping: ",", unitSeparator: nil)
        static let french = NumberStyle(decimal: ",", grouping: "\u{00A0}", unitSeparator: "\u{00A0}")
    }

    private struct Formatters {
        let style: NumberStyle
        let compact: NumberFormatter
        let precise: NumberFormatter

        /// Rates span orders of magnitude (a euro buys about one dollar but over fifteen hundred won), so they
        /// carry a fixed count of significant digits rather than of decimals. At five decimals every recent won
        /// rate collapsed onto the same 0.00064, hiding the difference between one date and the next.
        let rate: NumberFormatter

        init(style: NumberStyle) {
            self.style = style
            compact = Self.decimal(style, fractionDigits: 0)
            precise = Self.decimal(style, fractionDigits: 2)

            let rate = NumberFormatter()
            rate.locale = Locale(identifier: "en_US_POSIX")
            rate.numberStyle = .decimal
            rate.usesGroupingSeparator = false
            rate.decimalSeparator = style.decimal
            rate.usesSignificantDigits = true
            rate.minimumSignificantDigits = 5
            rate.maximumSignificantDigits = 5
            self.rate = rate
        }

        private static func decimal(_ style: NumberStyle, fractionDigits: Int) -> NumberFormatter {
            let formatter = NumberFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.numberStyle = .decimal
            formatter.usesGroupingSeparator = true
            formatter.groupingSeparator = style.grouping
            formatter.decimalSeparator = style.decimal
            formatter.groupingSize = 3
            formatter.minimumFractionDigits = fractionDigits
            formatter.maximumFractionDigits = fractionDigits
            return formatter
        }
    }

    private static let englishFormatters = Formatters(style: .english)

    private static let frenchFormatters = Formatters(style: .french)

    /// The formatters of the language the interface is in. Both sets are kept, since the language can change while
    /// the app runs.
    private static var formatters: Formatters {
        Localization.isFrench ? frenchFormatters : englishFormatters
    }

    private static var style: NumberStyle {
        formatters.style
    }

    private static func withSymbol(_ number: String, _ symbol: String) -> String {
        guard let separator = style.unitSeparator else { return symbol + number }
        return number + separator + symbol
    }

    static func euro(_ amount: Double) -> String {
        withSymbol(formatters.compact.string(from: NSNumber(value: amount.rounded())) ?? "0", Currency.euro.symbol)
    }

    static func euroPrecise(_ amount: Double) -> String {
        withSymbol(formatters.precise.string(from: NSNumber(value: amount)) ?? "0", Currency.euro.symbol)
    }

    static func amount(_ amount: Double, currency: Currency = .euro) -> String {
        withSymbol(formatters.precise.string(from: NSNumber(value: abs(amount))) ?? "0", currency.symbol)
    }

    static func rate(_ value: Double) -> String {
        formatters.rate.string(from: NSNumber(value: value)) ?? "0"
    }

    /// An amount the way the code reads it back: a dot before the cents, no grouping.
    static func decimalInput(_ amount: Double) -> String {
        amount == amount.rounded() ? String(format: "%.0f", amount) : String(format: "%.2f", amount)
    }

    /// An amount the way a field shows it, grouped and in the interface's notation: 1,234.50 or 1 234,50.
    static func amountInput(_ amount: Double) -> String {
        groupedAmountInput(decimalInput(amount))
    }

    /// Writes a sanitized amount the way the interface's language does while it is being typed.
    static func groupedAmountInput(_ raw: String) -> String {
        guard let separator = raw.firstIndex(of: ".") else { return grouped(raw) }
        return grouped(String(raw[raw.startIndex..<separator])) + style.decimal + String(raw[raw.index(after: separator)...])
    }

    /// Reduces whatever is in an amount field to digits and a dot before at most two decimals. In English a comma is
    /// grouping, unless it was just typed with no dot yet (the decimal key of a French keypad). In French both a comma
    /// and a dot are the decimal separator, and the spaces grouping the thousands are dropped with anything else.
    static func sanitizeAmountInput(_ text: String, maximumDigits: Int = 8) -> String {
        var working = text
        if style.decimal == "," {
            working = working.replacingOccurrences(of: ",", with: ".")
        } else {
            if working.hasSuffix(","), !working.contains(".") {
                working = working.dropLast() + "."
            }
            working = working.replacingOccurrences(of: ",", with: "")
        }

        var integer = ""
        var fraction = ""
        var hasSeparator = false
        var digits = 0
        for character in working {
            if character.isNumber {
                guard digits < maximumDigits else { continue }
                if hasSeparator {
                    guard fraction.count < 2 else { continue }
                    fraction.append(character)
                } else {
                    integer.append(character)
                }
                digits += 1
            } else if character == ".", !hasSeparator {
                hasSeparator = true
            }
        }

        while integer.count > 1, integer.hasPrefix("0") {
            integer.removeFirst()
        }
        if integer.isEmpty {
            guard hasSeparator else { return "" }
            integer = "0"
        }
        guard hasSeparator, !(fraction.isEmpty && digits >= maximumDigits) else { return integer }
        return integer + "." + fraction
    }

    private static func grouped(_ digits: String) -> String {
        guard digits.count > 3 else { return digits }
        var result = ""
        for (offset, character) in digits.reversed().enumerated() {
            if offset > 0, offset.isMultiple(of: 3) { result.append(contentsOf: style.grouping) }
            result.append(character)
        }
        return String(result.reversed())
    }

    static func parseAmount(_ text: String) -> Double? {
        let normalized = text
            .trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: ",", with: ".")
        guard !normalized.isEmpty, let value = Double(normalized), value.isFinite else { return nil }
        return value
    }

    /// Reads an amount field back, in whichever notation it was typed.
    static func parseAmountInput(_ text: String) -> Double? {
        parseAmount(sanitizeAmountInput(text))
    }

    static func percent(_ fraction: Double) -> String {
        "\(Int((fraction * 100).rounded()))" + (style.unitSeparator ?? "") + "%"
    }

    private static func date(_ date: Date, format: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Localization.locale
        formatter.dateFormat = format
        return formatter.string(from: date)
    }

    /// French writes month names in lowercase, which reads as a typo once the month stands alone as a title.
    private static func capitalizedFirst(_ text: String) -> String {
        text.prefix(1).uppercased(with: Localization.locale) + text.dropFirst()
    }

    static func monthTitle(_ date: Date) -> String {
        capitalizedFirst(self.date(date, format: "LLLL"))
    }

    static func monthWithYear(_ date: Date) -> String {
        capitalizedFirst(self.date(date, format: "LLLL yyyy"))
    }

    static func dayShort(_ date: Date) -> String {
        self.date(date, format: "d MMM")
    }

    static func weekdayDay(_ date: Date) -> String {
        self.date(date, format: "EEE d MMM")
    }

    /// A day the way the History date filter names it: 5 Oct, with the year once it isn't the current one.
    private static func filterDay(_ date: Date) -> String {
        if Calendar.current.isDate(date, equalTo: .now, toGranularity: .year) { return dayShort(date) }
        return self.date(date, format: "d MMM yyyy")
    }

    /// A range of days the way the History date filter names it: 5 Oct for a single day, 1 Sep → 30 Sep for a period.
    static func rangeTitle(_ range: DayRange) -> String {
        if range.isSingleDay { return filterDay(range.start) }
        return "\(filterDay(range.start)) → \(filterDay(range.end))"
    }

    static func relativeDay(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) { return String(appLocalized: "Today") }
        if Calendar.current.isDateInYesterday(date) { return String(appLocalized: "Yesterday") }
        return weekdayDay(date)
    }

    static func fieldDate(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) { return String(appLocalized: "Today, \(dayShort(date))") }
        if Calendar.current.isDateInYesterday(date) { return String(appLocalized: "Yesterday, \(dayShort(date))") }
        return weekdayDay(date)
    }
}
