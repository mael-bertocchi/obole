import SwiftUI

struct HistoryDateSheet: View {
    @Binding var range: DayRange?

    @Environment(Preferences.self) private var preferences
    @Environment(\.dismiss) private var dismiss

    @State private var mode: Mode
    @State private var day: Date
    @State private var start: Date
    @State private var end: Date

    private enum Mode: Hashable {
        case day
        case period
    }

    /// Starts on the filter in place, or on today. A period not yet picked runs from the first of the day's month up
    /// to that day.
    init(range: Binding<DayRange?>) {
        _range = range
        let calendar = BudgetMath.calendar
        let day = range.wrappedValue?.end ?? calendar.startOfDay(for: .now)
        _day = State(initialValue: day)
        _end = State(initialValue: day)
        if let current = range.wrappedValue, !current.isSingleDay {
            _mode = State(initialValue: .period)
            _start = State(initialValue: current.start)
        } else {
            _mode = State(initialValue: .day)
            _start = State(initialValue: calendar.dateInterval(of: .month, for: day)?.start ?? day)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                SheetHeader(title: String(appLocalized: "Filter by date")) { dismiss() }
                    .padding(.bottom, 16)

                Picker("Filter by date", selection: $mode) {
                    Text("Day").tag(Mode.day)
                    Text("Period").tag(Mode.period)
                }
                .pickerStyle(.segmented)
                .padding(.bottom, 16)

                switch mode {
                case .day:
                    DatePicker("", selection: $day, in: ...Date.now, displayedComponents: .date)
                        .datePickerStyle(.graphical)
                        .tint(Theme.accent)
                        .labelsHidden()
                        .padding(.horizontal, 6)
                        .glassCard()
                case .period:
                    VStack(spacing: 0) {
                        dateRow("From", selection: $start)
                        RowDivider()
                        dateRow("To", selection: $end)
                    }
                    .glassCard()
                }

                PrimaryButton(title: String(appLocalized: "Apply")) {
                    apply(mode == .day ? DayRange(day: day) : DayRange(start, end))
                }
                .padding(.top, 24)

                if range != nil {
                    SecondaryButton(title: String(appLocalized: "All dates")) {
                        apply(nil)
                    }
                    .padding(.top, 10)
                }
            }
            .padding(.top, 20)
            .padding(.horizontal, Theme.screenPadding)
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
        .screenBackground()
        .presentationDragIndicator(.visible)
        .onChange(of: start) { _, value in
            if value > end { end = value }
        }
        .onChange(of: end) { _, value in
            if value < start { start = value }
        }
    }

    private func dateRow(_ title: LocalizedStringKey, selection: Binding<Date>) -> some View {
        HStack(spacing: 12) {
            Text(title)
                .font(Theme.font(14))
                .foregroundStyle(Theme.text)
            Spacer(minLength: 8)
            DatePicker(title, selection: selection, in: ...Date.now, displayedComponents: .date)
                .labelsHidden()
                .tint(Theme.accent)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 14)
    }

    private func apply(_ picked: DayRange?) {
        preferences.tap()
        withAnimation(.easeOut(duration: 0.18)) {
            range = picked
        }
        dismiss()
    }
}
