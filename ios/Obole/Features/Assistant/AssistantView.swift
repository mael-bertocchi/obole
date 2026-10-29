import SwiftUI
import UIKit

/**
 * @class ProposalEntry
 * @description A change the assistant suggested, and where it stands with the person
 */
struct ProposalEntry: Identifiable {
    /**
     * @type Status
     * @description Where the suggestion stands
     */
    enum Status: Equatable {
        case pending /*!< Waiting for the person */
        case applying /*!< Being carried out */
        case applied /*!< Carried out */
        case dismissed /*!< Ignored */
        case failed(String) /*!< Couldn't be carried out, with why */
    }

    let id = UUID() /*!< Its identifier, for the list */
    let proposal: AssistantProposal /*!< The suggestion */
    var status: Status = .pending /*!< Where it stands */
}

/**
 * @class ConversationItem
 * @description One message of the conversation, with the changes the assistant suggested in it
 */
struct ConversationItem: Identifiable {
    let id = UUID() /*!< Its identifier, for the list */
    let role: AssistantMessage.Role /*!< Who said it */
    let text: String /*!< What was said */
    var proposals: [ProposalEntry] = [] /*!< The changes suggested in it */
}

/**
 * @class AssistantView
 * @description The Assistant tab: a conversation about the budget and the watchlist, kept on the device for the run
 * only. The changes the assistant suggests show as cards and happen only once confirmed
 */
struct AssistantView: View {
    @Environment(LocalStore.self) private var store /*!< The budget */
    @Environment(ExchangeRates.self) private var rates /*!< The exchange rates */
    @Environment(Preferences.self) private var preferences /*!< The device's settings, for the haptics */
    @Environment(ApplicationSession.self) private var session /*!< The session with the server */

    @State private var items: [ConversationItem] = [] /*!< The conversation */
    @State private var draft = "" /*!< The question being typed */
    @State private var isSending = false /*!< Whether a question is waiting for its answer */
    @State private var failure: String? /*!< Why the last question went unanswered */
    @State private var copiedId: UUID? /*!< The answer just copied, whose button shows a tick for a moment */

    @FocusState private var isComposing: Bool /*!< Whether the question field has the keyboard */

    /**
     * @constant bottomAnchor
     * @description The id the conversation scrolls to, under its last message
     */
    private static let bottomAnchor = "assistant.bottom"
    /**
     * @constant historyLimit
     * @description How many messages a question may carry, as the server allows
     */
    private static let historyLimit = 40
    /**
     * @constant copiedFor
     * @description How long the copy button shows its tick
     */
    private static let copiedFor: Duration = .seconds(2)

    /**
     * @method body
     * @description The tab
     */
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header
                        .padding(.bottom, 18)

                    if let unavailableReason = session.assistantUnavailableReason {
                        Label(unavailableReason, systemImage: "exclamationmark.triangle")
                            .font(Theme.font(13))
                            .foregroundStyle(Theme.warning)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(14)
                            .glassCard()
                            .padding(.bottom, 12)
                    }

                    if items.isEmpty {
                        introduction
                            .opacity(isAvailable ? 1 : 0.4)
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(items) { item in
                            messageView(item)
                        }
                        if isSending {
                            thinking
                        }
                        if isAvailable, let failure {
                            Text(failure)
                                .font(Theme.font(12))
                                .foregroundStyle(Theme.negative)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }

                    Text("Your messages and the data the assistant looks up are sent to Google Gemini.")
                        .font(Theme.font(11))
                        .foregroundStyle(Theme.faint)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, 20)

                    Color.clear
                        .frame(height: 1)
                        .id(Self.bottomAnchor)
                }
                .padding(.top, 8)
                .padding(.horizontal, Theme.screenPadding)
                .padding(.bottom, 12)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .scrollTopBlur()
            .safeAreaInset(edge: .bottom) {
                composer
            }
            .onChange(of: items.count) {
                scrollToBottom(proxy)
            }
            .onChange(of: isSending) {
                scrollToBottom(proxy)
            }
        }
    }

    /**
     * @method header
     * @description The tab's title, with the button starting over once there is a conversation
     */
    private var header: some View {
        HStack(alignment: .center) {
            ScreenTitle(String(appLocalized: "Assistant"))
            Spacer(minLength: 12)
            if !items.isEmpty {
                Button(action: startOver) {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 17, weight: .regular))
                        .foregroundStyle(Theme.muted)
                        .expandedTapTarget(vertical: 12, horizontal: 12)
                }
                .buttonStyle(.plain)
                .disabled(isSending)
                .accessibilityLabel("New conversation")
            }
        }
    }

    /**
     * @method introduction
     * @description What the assistant can do, with questions to start from
     */
    private var introduction: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Ask about your spending or your watchlist, or describe an expense to log. Nothing changes until you confirm.")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .glassCard()

            SectionLabel(String(appLocalized: "Try asking"))
                .padding(.top, 6)
            ForEach(examples, id: \.self) { example in
                Button {
                    send(example)
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.accent)
                        Text(example)
                            .font(Theme.font(13))
                            .foregroundStyle(Theme.text)
                            .multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                    }
                    .padding(.vertical, 11)
                    .padding(.horizontal, 14)
                    .glassCard()
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(isSending || !isAvailable)
            }
        }
        .padding(.bottom, 12)
    }

    /**
     * @method examples
     * @description The questions offered to start from
     */
    private var examples: [String] {
        [
            String(appLocalized: "How much on restaurants this month?"),
            String(appLocalized: "Lunch €12.50 yesterday"),
            String(appLocalized: "What's left on my watchlist?")
        ]
    }

    /**
     * @method thinking
     * @description The row shown while the assistant answers
     */
    private var thinking: some View {
        HStack(spacing: 8) {
            ProgressView()
                .controlSize(.small)
                .tint(Theme.muted)
            Text("Thinking")
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted)
        }
        .padding(.vertical, 4)
    }

    /**
     * @method composer
     * @description The question field and its send button, above the tab bar
     */
    private var composer: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("", text: $draft, prompt: Text("Ask the assistant").foregroundStyle(Theme.faint), axis: .vertical)
                .focused($isComposing)
                .lineLimit(1...5)
                .font(Theme.font(15))
                .foregroundStyle(Theme.text)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .frame(minHeight: 40)
                .glassInput(radius: 20)
                .disabled(!isAvailable)
            Button {
                send(draft)
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 16, weight: .semibold))
                    .frame(width: 24, height: 24)
            }
            .buttonStyle(.glassProminent)
            .buttonBorderShape(.circle)
            .tint(Theme.accent)
            .disabled(!canSend)
            .accessibilityLabel("Send")
        }
        .padding(.horizontal, Theme.screenPadding)
        .padding(.vertical, 10)
        .opacity(isAvailable ? 1 : 0.4)
    }

    /**
     * @method isAvailable
     * @description Whether the assistant can answer, as the server last said
     */
    private var isAvailable: Bool {
        session.assistantUnavailableReason == nil
    }

    /**
     * @method canSend
     * @description Whether the question typed can be sent now
     */
    private var canSend: Bool {
        isAvailable && !isSending && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /**
     * @method messageView
     * @description A message as a bubble, the person's on the right as typed, the assistant's in Markdown, with the cards
     * of the changes suggested in it
     *
     * @param item The message
     * @returns The message
     */
    @ViewBuilder
    private func messageView(_ item: ConversationItem) -> some View {
        let isUser = item.role == .user

        HStack {
            if isUser {
                Spacer(minLength: 48)
            }
            Group {
                if isUser {
                    Text(verbatim: item.text)
                } else {
                    MarkdownText(text: item.text)
                }
            }
                .font(Theme.font(14))
                .foregroundStyle(Theme.text)
                .lineSpacing(3)
                .textSelection(.enabled)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.vertical, 10)
                .padding(.horizontal, 13)
                .background(
                    isUser ? Theme.accent.opacity(0.18) : Theme.glassCardFill,
                    in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(isUser ? Theme.accent.opacity(0.35) : Theme.glassCardBorder, lineWidth: 1)
                )
            if !isUser {
                Spacer(minLength: 48)
            }
        }

        ForEach(item.proposals) { entry in
            ProposalCard(entry: entry, onConfirm: { confirm(entry.id, in: item.id) }, onDismiss: { dismiss(entry.id, in: item.id) })
        }

        if !isUser && !item.text.isEmpty {
            messageActions(item)
        }
    }

    /**
     * @method messageActions
     * @description The small buttons under an answer: copy its text, and ask again for the latest one. A phone can't
     * hover, so they always show
     *
     * @param item The answer
     * @returns The buttons
     */
    private func messageActions(_ item: ConversationItem) -> some View {
        let isCopied = copiedId == item.id

        return HStack(spacing: 14) {
            Button {
                copy(item)
            } label: {
                Image(systemName: isCopied ? "checkmark" : "doc.on.doc")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.faint)
                    .frame(width: 18, height: 18)
                    .expandedTapTarget(vertical: 8, horizontal: 6)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isCopied ? String(appLocalized: "Copied") : String(appLocalized: "Copy"))

            if item.id == items.last?.id {
                Button(action: retry) {
                    Image(systemName: "arrow.counterclockwise")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.faint)
                        .frame(width: 18, height: 18)
                        .expandedTapTarget(vertical: 8, horizontal: 6)
                }
                .buttonStyle(.plain)
                .disabled(isSending || !isAvailable)
                .opacity(isSending || !isAvailable ? 0.4 : 1)
                .accessibilityLabel("Try again")
            }
        }
        .padding(.leading, 6)
        .padding(.top, -4)
    }

    /**
     * @method copy
     * @description Puts an answer's text on the clipboard, and ticks its button for a moment
     *
     * @param item The answer
     */
    private func copy(_ item: ConversationItem) {
        UIPasteboard.general.string = item.text
        preferences.tap()
        copiedId = item.id

        Task {
            try? await Task.sleep(for: Self.copiedFor)
            if copiedId == item.id {
                copiedId = nil
            }
        }
    }

    /**
     * @method retry
     * @description Drops the latest answer and asks the person's last question again
     */
    private func retry() {
        guard !isSending, isAvailable, items.last?.role == .assistant, items.count >= 2, items[items.count - 2].role == .user else {
            return
        }

        preferences.tap()
        items.removeLast()
        ask(items[items.count - 1].text)
    }

    /**
     * @method send
     * @description Sends a question with the conversation so far
     *
     * @param text The question
     */
    private func send(_ text: String) {
        let question = text.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !question.isEmpty, !isSending, isAvailable else {
            return
        }

        preferences.tap()
        draft = ""
        items.append(ConversationItem(role: .user, text: question))
        ask(question)
    }

    /**
     * @method ask
     * @description Sends the conversation, which ends with the person's question, and shows the answer. A question that
     * goes unanswered is taken back into the field, so it can be sent again
     *
     * @param question The question the conversation ends with
     */
    private func ask(_ question: String) {
        failure = nil
        isSending = true

        let messages = items
            .filter { !$0.text.isEmpty }
            .suffix(Self.historyLimit)
            .map { AssistantMessage(role: $0.role, text: $0.text) }

        Task {
            do {
                let reply = try await session.ask(messages)
                items.append(ConversationItem(role: .assistant, text: reply.text, proposals: reply.proposals.map { ProposalEntry(proposal: $0) }))
            } catch {
                items.removeLast()
                draft = question
                failure = Self.describe(error)
            }
            isSending = false
        }
    }

    /**
     * @method describe
     * @description Why a question went unanswered, worded for the person; a spent quota is the assistant's, not too
     * many attempts of theirs
     *
     * @param error What went wrong
     * @returns Why
     */
    private static func describe(_ error: Error) -> String {
        if let error = error as? APIError, case .throttled = error {
            return String(appLocalized: "The assistant has used up its quota for now. Try again in a moment.")
        }
        return error.userMessage
    }

    /**
     * @method confirm
     * @description Carries out a suggestion the person confirmed
     *
     * @param entryId The suggestion
     * @param itemId The message it was suggested in
     */
    private func confirm(_ entryId: UUID, in itemId: UUID) {
        guard let proposal = entry(entryId, in: itemId)?.proposal else {
            return
        }

        setStatus(.applying, of: entryId, in: itemId)

        Task {
            do {
                try await ProposalApplier(store: store, rates: rates, session: session).apply(proposal)
                setStatus(.applied, of: entryId, in: itemId)
                preferences.success()
            } catch {
                setStatus(.failed(Self.describe(error)), of: entryId, in: itemId)
            }
        }
    }

    /**
     * @method dismiss
     * @description Ignores a suggestion
     *
     * @param entryId The suggestion
     * @param itemId The message it was suggested in
     */
    private func dismiss(_ entryId: UUID, in itemId: UUID) {
        preferences.tap()
        setStatus(.dismissed, of: entryId, in: itemId)
    }

    /**
     * @method entry
     * @description A suggestion of the conversation
     *
     * @param entryId The suggestion
     * @param itemId The message it was suggested in
     * @returns The suggestion, or nil once the conversation started over
     */
    private func entry(_ entryId: UUID, in itemId: UUID) -> ProposalEntry? {
        items.first { $0.id == itemId }?.proposals.first { $0.id == entryId }
    }

    /**
     * @method setStatus
     * @description Moves a suggestion on, unless the conversation started over in between
     *
     * @param status Where it stands now
     * @param entryId The suggestion
     * @param itemId The message it was suggested in
     */
    private func setStatus(_ status: ProposalEntry.Status, of entryId: UUID, in itemId: UUID) {
        guard let itemIndex = items.firstIndex(where: { $0.id == itemId }),
              let entryIndex = items[itemIndex].proposals.firstIndex(where: { $0.id == entryId }) else {
            return
        }
        items[itemIndex].proposals[entryIndex].status = status
    }

    /**
     * @method startOver
     * @description Forgets the conversation
     */
    private func startOver() {
        preferences.tap()
        items = []
        failure = nil
        draft = ""
    }

    /**
     * @method scrollToBottom
     * @description Shows the latest message
     *
     * @param proxy The scroll view's proxy
     */
    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.25)) {
            proxy.scrollTo(Self.bottomAnchor, anchor: .bottom)
        }
    }
}

/**
 * @class ProposalCard
 * @description A change the assistant suggested, as a card the person confirms or ignores
 */
struct ProposalCard: View {
    @Environment(LocalStore.self) private var store /*!< The budget, for the categories' names */

    let entry: ProposalEntry /*!< The suggestion */
    let onConfirm: () -> Void /*!< Carries it out */
    let onDismiss: () -> Void /*!< Ignores it */

    /**
     * @method body
     * @description The card
     */
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                IconTile(symbol: symbol, color: color)
                Text(title)
                    .font(Theme.font(14, .medium))
                    .foregroundStyle(Theme.text)
                Spacer(minLength: 0)
            }

            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                    Text(line)
                        .font(Theme.font(index == 0 ? 14 : 12))
                        .foregroundStyle(index == 0 ? Theme.text : Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            footer
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .glassCard()
    }

    /**
     * @method footer
     * @description The buttons while the suggestion waits, where it stands after
     */
    @ViewBuilder
    private var footer: some View {
        switch entry.status {
        case .pending:
            HStack(spacing: 10) {
                SecondaryButton(title: String(appLocalized: "Dismiss"), height: 38, action: onDismiss)
                PrimaryButton(title: String(appLocalized: "Confirm"), height: 38, action: onConfirm)
            }
        case .applying:
            ProgressView()
                .controlSize(.small)
                .tint(Theme.muted)
                .frame(maxWidth: .infinity, minHeight: 38)
        case .applied:
            statusLine(String(appLocalized: "Done"), symbol: "checkmark.circle", color: Theme.positive)
        case .dismissed:
            statusLine(String(appLocalized: "Dismissed"), symbol: "xmark.circle", color: Theme.faint)
        case .failed(let reason):
            VStack(alignment: .leading, spacing: 8) {
                statusLine(reason, symbol: "exclamationmark.triangle", color: Theme.negative)
                PrimaryButton(title: String(appLocalized: "Try again"), height: 38, action: onConfirm)
            }
        }
    }

    /**
     * @method statusLine
     * @description Where a suggestion stands, as a small coloured line
     *
     * @param text What happened
     * @param symbol Its SF Symbol
     * @param color Its colour
     * @returns The line
     */
    private func statusLine(_ text: String, symbol: String, color: Color) -> some View {
        Label(text, systemImage: symbol)
            .font(Theme.font(12, .medium))
            .foregroundStyle(color)
            .fixedSize(horizontal: false, vertical: true)
    }

    /**
     * @method title
     * @description What the suggestion does, in words
     */
    private var title: String {
        switch entry.proposal {
        case .createOperation: return String(appLocalized: "Add an operation")
        case .updateOperation: return String(appLocalized: "Change an operation")
        case .deleteOperation: return String(appLocalized: "Delete an operation")
        case .rateTitle: return String(appLocalized: "Rate a title")
        }
    }

    /**
     * @method symbol
     * @description The suggestion's SF Symbol
     */
    private var symbol: String {
        switch entry.proposal {
        case .createOperation: return "plus"
        case .updateOperation: return "pencil"
        case .deleteOperation: return "trash"
        case .rateTitle: return "star"
        }
    }

    /**
     * @method color
     * @description The suggestion's colour
     */
    private var color: Color {
        if case .deleteOperation = entry.proposal {
            return Theme.negative
        }
        return Theme.accent
    }

    /**
     * @method lines
     * @description What the suggestion says, the main line first
     */
    private var lines: [String] {
        switch entry.proposal {
        case .createOperation(_, let draft):
            return [
                "\(draft.name) · \(amount(draft.amount, draft.currencyCode))",
                details(categoryId: draft.categoryId, day: draft.date, location: draft.location)
            ]
        case .updateOperation(let operation, let changes):
            return [summary(operation), changesText(changes)]
        case .deleteOperation(let operation):
            return [summary(operation), String(appLocalized: "It will go to the trash, where you can restore it.")]
        case .rateTitle(_, let title, let rating, let comment, let watchedAt):
            var lines = ["\(title) · \(stars(rating))", String(appLocalized: "Watched on \(Self.date(watchedAt).map(Formatting.dayShort) ?? watchedAt)")]
            if let comment, !comment.isEmpty {
                lines.append("“\(comment)”")
            }
            return lines
        }
    }

    /**
     * @method stars
     * @description A rating in half stars, drawn as stars
     *
     * @param rating The rating, from 1 to 10
     * @returns The stars
     */
    private func stars(_ rating: Int) -> String {
        String(repeating: "★", count: rating / 2) + (rating % 2 == 1 ? "½" : "")
    }

    /**
     * @method summary
     * @description An existing operation in one line
     *
     * @param operation The operation
     * @returns The line
     */
    private func summary(_ operation: OperationSummary) -> String {
        let category = store.categoryOrFallback(id: operation.categoryId).title
        return "\(operation.name) · \(amount(operation.amount, operation.currencyCode)) · \(category) · \(Formatting.dayShort(operation.date))"
    }

    /**
     * @method changesText
     * @description What a suggestion to change an operation changes, in one line
     *
     * @param changes The changes
     * @returns The line
     */
    private func changesText(_ changes: OperationChanges) -> String {
        var parts: [String] = []
        if let name = changes.name {
            parts.append(name)
        }
        if let value = changes.amount {
            parts.append(amount(value, changes.currencyCode ?? Currency.euro.code))
        } else if let code = changes.currencyCode {
            parts.append(code)
        }
        if let categoryId = changes.categoryId {
            parts.append(store.categoryOrFallback(id: categoryId).title)
        }
        if let date = changes.date {
            parts.append(day(date))
        }
        if let location = changes.location {
            parts.append(location ?? String(appLocalized: "No place"))
        }
        if let description = changes.description {
            parts.append(description ?? String(appLocalized: "No note"))
        }
        if let isOnline = changes.isOnline {
            parts.append(isOnline ? String(appLocalized: "Online") : String(appLocalized: "In person"))
        }
        return "→ " + parts.joined(separator: " · ")
    }

    /**
     * @method details
     * @description A new operation's category, day and place, in one line
     *
     * @param categoryId Its category
     * @param day Its day, as `YYYY-MM-DD`
     * @param location Its place, if any
     * @returns The line
     */
    private func details(categoryId: String, day: String, location: String?) -> String {
        var parts = [store.categoryOrFallback(id: categoryId).title, self.day(day)]
        if let location, !location.isEmpty {
            parts.append(location)
        }
        return parts.joined(separator: " · ")
    }

    /**
     * @method amount
     * @description An amount in its currency
     *
     * @param value The amount
     * @param code The currency's code
     * @returns The amount, written
     */
    private func amount(_ value: Double, _ code: String) -> String {
        Formatting.amount(value, currency: Currency.named(code))
    }

    /**
     * @method day
     * @description A day named by the server, as History heads days
     *
     * @param key The day, as `YYYY-MM-DD`
     * @returns The day, written
     */
    private func day(_ key: String) -> String {
        Self.date(key).map(Formatting.relativeDay) ?? key
    }

    /**
     * @method date
     * @description The noon of a day named by the server
     *
     * @param key The day, as `YYYY-MM-DD`
     * @returns The date, or nil when the day can't be read
     */
    private static func date(_ key: String) -> Date? {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else {
            return nil
        }
        return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12))
    }
}
