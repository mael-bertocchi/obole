import SwiftUI

enum HistoryFilter: Hashable {
    case all
    case category(String)
}

/// A run of whole days, both ends included. A single day starts and ends on itself.
struct DayRange: Hashable {
    let start: Date
    let end: Date

    /// The days from one date to another, whichever of the two comes first.
    init(_ first: Date, _ second: Date) {
        let first = BudgetMath.calendar.startOfDay(for: first)
        let second = BudgetMath.calendar.startOfDay(for: second)
        start = min(first, second)
        end = max(first, second)
    }

    init(day: Date) {
        self.init(day, day)
    }

    var isSingleDay: Bool {
        start == end
    }

    func contains(_ date: Date) -> Bool {
        let day = BudgetMath.calendar.startOfDay(for: date)
        return day >= start && day <= end
    }
}

struct HistoryView: View {
    @Binding var filter: HistoryFilter
    var onSelect: (Operation) -> Void = { _ in }
    var onNewOperation: () -> Void = {}

    @Environment(LocalStore.self) private var store
    @Environment(Preferences.self) private var preferences

    @State private var query = ""
    @State private var dateRange: DayRange?
    @State private var showDateSheet = false

    var body: some View {
        VStack(spacing: 0) {
            headerBlock
            operationList
        }
        .sheet(isPresented: $showDateSheet) {
            HistoryDateSheet(range: $dateRange)
        }
    }

    private var headerBlock: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center) {
                ScreenTitle(String(appLocalized: "History"))
                Spacer(minLength: 12)
                HeaderAddButton {
                    preferences.tap()
                    onNewOperation()
                }
            }
            .padding(.bottom, 12)

            SearchField(text: $query, prompt: String(appLocalized: "Search operations"))
                .padding(.bottom, 12)

            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    FilterChip(
                        title: dateRange.map(Formatting.rangeTitle) ?? String(appLocalized: "Date"),
                        systemImage: "calendar",
                        isActive: dateRange != nil
                    ) {
                        preferences.tap()
                        showDateSheet = true
                    }
                    Rectangle()
                        .fill(Theme.divider)
                        .frame(width: 1, height: 18)
                    FilterChip(title: String(appLocalized: "All"), isActive: filter == .all) {
                        select(.all)
                    }
                    ForEach(store.categories) { category in
                        FilterChip(title: category.title, isActive: filter == .category(category.id)) {
                            select(.category(category.id))
                        }
                    }
                }
                .padding(.horizontal, Theme.screenPadding)
            }
            .scrollIndicators(.hidden)
            .padding(.horizontal, -Theme.screenPadding)
        }
        .padding(.top, 8)
        .padding(.horizontal, Theme.screenPadding)
        .padding(.bottom, 12)
    }

    @ViewBuilder
    private var operationList: some View {
        if groups.isEmpty {
            ScrollView {
                EmptyStateCard(message: emptyMessage)
                    .padding(.horizontal, Theme.screenPadding)
                    .padding(.top, 12)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
        } else {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    ForEach(groups) { group in
                        HStack {
                            DayLabel(Formatting.relativeDay(group.date))
                            Spacer(minLength: 12)
                            Text(Formatting.amount(group.spent))
                                .font(Theme.font(12))
                                .foregroundStyle(Theme.faint)
                        }
                        .padding(.top, 16)
                        .padding(.bottom, 8)

                        VStack(spacing: 0) {
                            ForEach(Array(group.operations.enumerated()), id: \.element.id) { index, operation in
                                Button {
                                    preferences.tap()
                                    onSelect(operation)
                                } label: {
                                    OperationRow(
                                        operation: operation,
                                        category: store.categoryOrFallback(id: operation.categoryId)
                                    )
                                }
                                .buttonStyle(.plain)
                                if index < group.operations.count - 1 {
                                    RowDivider()
                                }
                            }
                        }
                        .glassCard()
                    }
                }
                .padding(.horizontal, Theme.screenPadding)
                .padding(.bottom, 20)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
        }
    }

    private var emptyMessage: String {
        if !query.isEmpty || filter != .all || dateRange != nil {
            return String(appLocalized: "No operations match this search.")
        }
        return String(appLocalized: "No operations yet. Tap ＋ to log your first expense.")
    }

    private var groups: [DayGroup] {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        let filtered = store.operations.filter { operation in
            matchesFilter(operation) && (dateRange?.contains(operation.date) ?? true) && matchesQuery(operation, trimmed)
        }
        return BudgetMath.dayGroups(filtered)
    }

    private func matchesFilter(_ operation: Operation) -> Bool {
        switch filter {
        case .all:
            return true
        case .category(let categoryId):
            return operation.categoryId == categoryId
        }
    }

    private func matchesQuery(_ operation: Operation, _ query: String) -> Bool {
        guard !query.isEmpty else { return true }
        let category = store.categoryOrFallback(id: operation.categoryId).title
        let haystack = [operation.name, operation.description ?? "", operation.location ?? "", category]
        return haystack.contains { $0.localizedCaseInsensitiveContains(query) }
    }

    private func select(_ value: HistoryFilter) {
        preferences.tap()
        withAnimation(.easeOut(duration: 0.18)) {
            filter = filter == value ? .all : value
        }
    }
}

struct OperationRow: View {
    let operation: Operation
    let category: Category

    var body: some View {
        HStack(spacing: 12) {
            IconTile(
                symbol: category.symbol,
                color: category.color,
                size: 38,
                radius: 11,
                glyphSize: 18
            )

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(operation.name)
                        .font(Theme.font(14))
                        .foregroundStyle(Theme.text)
                        .lineLimit(1)
                    if operation.isRecurring {
                        Image(systemName: "repeat")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.faint)
                    }
                    if hasDescription {
                        Image(systemName: "text.alignleft")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.faint)
                    }
                }
                if operation.isOnline {
                    HStack(spacing: 4) {
                        Image(systemName: "globe")
                            .font(.system(size: 10))
                        Text("Online")
                    }
                    .font(Theme.font(12))
                    .foregroundStyle(Theme.muted)
                } else if let location = operation.location, !location.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin")
                            .font(.system(size: 10))
                        Text(location)
                    }
                    .font(Theme.font(12))
                    .foregroundStyle(Theme.muted)
                    .lineLimit(1)
                    .truncationMode(.tail)
                }
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 1) {
                Text(amountText)
                    .font(Theme.font(14, .semibold))
                    .foregroundStyle(Theme.text)
                if operation.isForeign {
                    Text(Formatting.euroPrecise(operation.euroAmount))
                        .font(Theme.font(11))
                        .foregroundStyle(Theme.faint)
                }
            }
            .fixedSize(horizontal: true, vertical: false)
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private var hasDescription: Bool {
        guard let description = operation.description else { return false }
        return !description.isEmpty
    }

    private var accessibilityText: String {
        var parts = [operation.name, amountText]
        if let location = operation.location, !location.isEmpty {
            parts.append(location)
        }
        if hasDescription {
            parts.append(String(appLocalized: "has a note"))
        }
        return parts.joined(separator: ", ")
    }

    private var amountText: String {
        Formatting.amount(operation.amount, currency: Currency.named(operation.currencyCode))
    }
}
