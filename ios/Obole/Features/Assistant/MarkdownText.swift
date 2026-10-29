import SwiftUI

/**
 * @type MarkdownBlock
 * @description One block of a text written in Markdown, as the assistant writes its answers
 */
enum MarkdownBlock: Equatable {
    case paragraph(String) /*!< Lines of text, kept together */
    case heading(String) /*!< A heading, of any level */
    case bullet(String, depth: Int) /*!< An item of a list with bullets, and how deep it is nested */
    case numbered(String, marker: String, depth: Int) /*!< An item of a numbered list, with its number */
    case quote(String) /*!< A quotation */
    case code(String) /*!< A block of code */
    case table(header: [String], rows: [[String]]) /*!< A table, with its header */
    case rule /*!< A line between two parts */
}

/**
 * @class MarkdownParser
 * @description Splits a text written in Markdown into its blocks. Within a block, bold, italics, code and links are
 * left to `AttributedString`, which reads them but not the blocks
 */
enum MarkdownParser {
    /**
     * @method blocks
     * @description The blocks of a text, in order
     *
     * @param text The text
     * @returns Its blocks
     */
    static func blocks(_ text: String) -> [MarkdownBlock] {
        var blocks: [MarkdownBlock] = []
        var paragraph: [String] = []
        var table: [[String]] = []
        var code: [String]?

        /**
         * @function closeParagraph
         * @description Ends the paragraph under way, keeping it as a block
         */
        func closeParagraph() {
            if !paragraph.isEmpty {
                blocks.append(.paragraph(paragraph.joined(separator: "\n")))
                paragraph = []
            }
        }

        /**
         * @function closeTable
         * @description Ends the table under way, its first row as its header
         */
        func closeTable() {
            if let header = table.first {
                blocks.append(.table(header: header, rows: Array(table.dropFirst())))
            }
            table = []
        }

        for line in text.components(separatedBy: "\n") {
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            if let lines = code {
                if trimmed.hasPrefix("```") {
                    blocks.append(.code(lines.joined(separator: "\n")))
                    code = nil
                } else {
                    code = lines + [line]
                }
                continue
            }

            if trimmed.hasPrefix("|") {
                closeParagraph()
                let cells = cellsOf(trimmed)
                if !isSeparator(cells) {
                    table.append(cells)
                }
                continue
            }
            closeTable()

            if trimmed.hasPrefix("```") {
                closeParagraph()
                code = []
                continue
            }

            if trimmed.isEmpty {
                closeParagraph()
                continue
            }

            guard let block = blockOf(line, trimmed: trimmed) else {
                paragraph.append(trimmed)
                continue
            }

            closeParagraph()

            if case .quote(let content) = block, case .quote(let previous)? = blocks.last {
                blocks[blocks.count - 1] = .quote(previous + "\n" + content)
            } else {
                blocks.append(block)
            }
        }

        if let lines = code {
            blocks.append(.code(lines.joined(separator: "\n")))
        }
        closeParagraph()
        closeTable()

        return blocks
    }

    /**
     * @method blockOf
     * @description The block a line starts on its own: a heading, an item of a list, a quotation or a rule. A line of
     * plain text gives nil, and joins the paragraph around it
     *
     * @param line The line, as written
     * @param trimmed The line, without the spaces around it
     * @returns Its block, or nil
     */
    private static func blockOf(_ line: String, trimmed: String) -> MarkdownBlock? {
        let depth = line.prefix { $0 == " " }.count / 2
        let hashes = trimmed.prefix { $0 == "#" }.count

        if (1...6).contains(hashes), trimmed.dropFirst(hashes).hasPrefix(" ") {
            return .heading(trimmed.dropFirst(hashes).trimmingCharacters(in: .whitespaces))
        }
        if isRule(trimmed) {
            return .rule
        }
        if trimmed.hasPrefix(">") {
            return .quote(trimmed.dropFirst().trimmingCharacters(in: .whitespaces))
        }
        for marker in ["- ", "* ", "+ "] where trimmed.hasPrefix(marker) {
            return .bullet(String(trimmed.dropFirst(marker.count)), depth: depth)
        }

        let digits = trimmed.prefix { $0.isNumber }
        let rest = trimmed.dropFirst(digits.count)

        if !digits.isEmpty, digits.count <= 3, rest.hasPrefix(". ") || rest.hasPrefix(") ") {
            return .numbered(rest.dropFirst(2).trimmingCharacters(in: .whitespaces), marker: "\(digits).", depth: depth)
        }

        return nil
    }

    /**
     * @method isRule
     * @description Whether a line is a rule: three or more of the same dash, star or underscore, and nothing else
     *
     * @param trimmed The line, without the spaces around it
     * @returns Whether it is a rule
     */
    private static func isRule(_ trimmed: String) -> Bool {
        let marks = trimmed.filter { $0 != " " }

        guard marks.count >= 3, let first = marks.first, "-*_".contains(first) else {
            return false
        }

        return marks.allSatisfy { $0 == first }
    }

    /**
     * @method cellsOf
     * @description The cells of a row of a table
     *
     * @param trimmed The row, without the spaces around it
     * @returns Its cells
     */
    private static func cellsOf(_ trimmed: String) -> [String] {
        var row = trimmed.dropFirst()

        if row.hasSuffix("|") {
            row = row.dropLast()
        }

        return row.components(separatedBy: "|").map { $0.trimmingCharacters(in: .whitespaces) }
    }

    /**
     * @method isSeparator
     * @description Whether a row of a table is the line under its header, made of dashes and colons
     *
     * @param cells The row's cells
     * @returns Whether it is that line
     */
    private static func isSeparator(_ cells: [String]) -> Bool {
        cells.allSatisfy { cell in !cell.isEmpty && cell.allSatisfy { "-: ".contains($0) } }
    }
}

/**
 * @class MarkdownText
 * @description A text written in Markdown: its paragraphs, headings, lists, quotations, code and tables, each drawn
 * in the app's look. It takes the font and color of the view around it
 */
struct MarkdownText: View {
    let text: String /*!< The text */

    /**
     * @method body
     * @description The text, block by block
     */
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(MarkdownParser.blocks(text).enumerated()), id: \.offset) { _, block in
                blockView(block)
            }
        }
    }

    /**
     * @method blockView
     * @description One block
     *
     * @param block The block
     * @returns How it is drawn
     */
    @ViewBuilder
    private func blockView(_ block: MarkdownBlock) -> some View {
        switch block {
        case .paragraph(let content):
            Text(Self.inline(content))
        case .heading(let content):
            Text(Self.inline(content))
                .fontWeight(.semibold)
        case .bullet(let content, let depth):
            listItem(marker: "•", content: content, depth: depth)
        case .numbered(let content, let marker, let depth):
            listItem(marker: marker, content: content, depth: depth)
        case .quote(let content):
            Text(Self.inline(content))
                .foregroundStyle(Theme.muted)
                .padding(.leading, 10)
                .overlay(alignment: .leading) {
                    Rectangle()
                        .fill(Theme.faint)
                        .frame(width: 2)
                }
        case .code(let content):
            Text(verbatim: content)
                .font(.system(size: 12, design: .monospaced))
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.text.opacity(0.06), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        case .table(let header, let rows):
            table(header: header, rows: rows)
        case .rule:
            Divider()
        }
    }

    /**
     * @method listItem
     * @description An item of a list, its marker hanging to the left of its text
     *
     * @param marker Its bullet or number
     * @param content Its text
     * @param depth How deep it is nested
     * @returns The item
     */
    private func listItem(marker: String, content: String, depth: Int) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(verbatim: marker)
                .monospacedDigit()
            Text(Self.inline(content))
        }
        .padding(.leading, CGFloat(depth) * 14)
    }

    /**
     * @method table
     * @description A table, its header in bold and a line under it
     *
     * @param header The header's cells
     * @param rows The rows' cells
     * @returns The table
     */
    private func table(header: [String], rows: [[String]]) -> some View {
        Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 6) {
            GridRow {
                ForEach(header.indices, id: \.self) { column in
                    Text(Self.inline(header[column]))
                        .fontWeight(.semibold)
                }
            }
            Divider()
            ForEach(rows.indices, id: \.self) { index in
                GridRow {
                    ForEach(header.indices, id: \.self) { column in
                        Text(Self.inline(column < rows[index].count ? rows[index][column] : ""))
                            .monospacedDigit()
                    }
                }
            }
        }
    }

    /**
     * @method inline
     * @description A block's text with its bold, italics, code and links applied
     *
     * @param content The text
     * @returns The text to show
     */
    private static func inline(_ content: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: content, options: options)) ?? AttributedString(content)
    }
}
