import Charts
import SwiftUI

/**
 * @class AnalysisView
 * @description The Analysis tab: where the current month is heading at its pace, and how it compares with the usual
 * spending at the same point of the month, in all and per category. Everything is worked out on the device
 */
struct AnalysisView: View {
    @Environment(LocalStore.self) private var store /*!< The budget */

    /**
     * @method body
     * @description The tab
     */
    var body: some View {
        let now = Date.now
        let projection = BudgetAnalysis.project(store.operations, limit: store.monthlyBudget(for: now).monthlyLimit, now: now)
        let comparison = BudgetAnalysis.compare(store.operations, categories: store.categories, now: now)

        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ScreenTitle(Formatting.monthTitle(projection.month))
                    .padding(.bottom, 20)

                SectionLabel(String(appLocalized: "End of the month"))
                    .padding(.bottom, 10)
                ProjectionCard(projection: projection)

                HStack(spacing: 10) {
                    StatCard(label: String(appLocalized: "Spent"), value: Formatting.euro(projection.spent))
                    StatCard(label: String(appLocalized: "Per day"), value: Formatting.euro(projection.pace))
                    StatCard(label: String(appLocalized: "Budget"), value: projection.limit > 0 ? Formatting.euro(projection.limit) : "•")
                }
                .padding(.top, 10)

                SectionLabel(String(appLocalized: "Compared with usual"))
                    .padding(.top, 22)
                    .padding(.bottom, 10)
                ComparisonSection(comparison: comparison)
            }
            .padding(.top, 8)
            .padding(.horizontal, Theme.screenPadding)
            .padding(.bottom, 24)
        }
        .scrollIndicators(.hidden)
        .scrollTopBlur()
    }
}

/**
 * @class ProjectionCard
 * @description Where the month ends at the current pace, against its budget, with how it was worked out and the
 * month's curve next to the usual one
 */
private struct ProjectionCard: View {
    let projection: MonthProjection /*!< Where the month is heading */

    /**
     * @method body
     * @description The card
     */
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(verbatim: Formatting.euro(projection.projected))
                .font(Theme.font(34, .semibold))
                .foregroundStyle(Theme.text)
                .monospacedDigit()

            if projection.limit > 0 {
                Text(isOver ? String(appLocalized: "Over budget by \(Formatting.euro(-margin))") : String(appLocalized: "\(Formatting.euro(margin)) left"))
                    .font(Theme.font(13, .medium))
                    .foregroundStyle(isOver ? Theme.negative : Theme.positive)
                    .padding(.top, 2)
            }

            Text(basis)
                .font(Theme.font(12))
                .foregroundStyle(Theme.muted)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 8)

            if projection.isEarly {
                Text("The month has only just started: take it as a rough estimate.")
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.faint)
                    .padding(.top, 4)
            }

            PaceChart(projection: projection)
                .frame(height: 190)
                .padding(.top, 16)
        }
        .padding(16)
        .glassCard()
    }

    /**
     * @method margin
     * @description What the budget leaves at the end of the month, negative when it is overspent
     */
    private var margin: Double {
        projection.limit - projection.projected
    }

    /**
     * @method isOver
     * @description Whether the month is heading over its budget
     */
    private var isOver: Bool {
        margin < 0
    }

    /**
     * @method basis
     * @description How the projection was worked out
     */
    private var basis: String {
        let pace = Formatting.euro(projection.pace)
        guard projection.recurring > 0 else {
            return String(appLocalized: "At \(pace) a day since the 1st, carried on to the end of the month.")
        }
        return String(appLocalized: "At \(pace) a day since the 1st, carried on to the end of the month, plus \(Formatting.euro(projection.recurring)) of recurring operations counted once.")
    }
}

/**
 * @class PacePoint
 * @description One point of a curve of the chart
 */
private struct PacePoint: Identifiable {
    let series: String /*!< The curve it belongs to */
    let day: Int /*!< The day it closes, 0 for the month's start */
    let amount: Double /*!< Euros spent by then */

    var id: String { "\(series)-\(day)" } /*!< Its identifier, by curve and day */
}

/**
 * @class PaceChart
 * @description The month's spending as it builds up day by day, carried on dashed to where it ends, against the usual
 * spending and the budget's line. Touching a day reads its figures
 */
private struct PaceChart: View {
    let projection: MonthProjection /*!< Where the month is heading */

    @State private var selectedDay: Int? /*!< The day being touched */

    /**
     * @method body
     * @description The chart
     */
    var body: some View {
        Chart {
            ForEach(points(of: usualSeries, values: projection.usual ?? [])) { point in
                LineMark(x: .value("Day", point.day), y: .value("Amount", point.amount), series: .value("Series", point.series))
                    .foregroundStyle(Theme.neutral400)
                    .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
            }
            ForEach(points(of: actualSeries, values: projection.cumulative)) { point in
                AreaMark(x: .value("Day", point.day), y: .value("Amount", point.amount))
                    .foregroundStyle(Theme.accent.opacity(0.12))
                LineMark(x: .value("Day", point.day), y: .value("Amount", point.amount), series: .value("Series", point.series))
                    .foregroundStyle(Theme.accent)
                    .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
            }
            if projection.today < projection.length {
                ForEach(projectionPoints) { point in
                    LineMark(x: .value("Day", point.day), y: .value("Amount", point.amount), series: .value("Series", point.series))
                        .foregroundStyle(Theme.accent)
                        .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round, dash: [3, 5]))
                }
            }
            if projection.limit > 0 {
                RuleMark(y: .value("Budget", projection.limit))
                    .foregroundStyle(Theme.faint)
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
            }
            PointMark(x: .value("Day", projection.today), y: .value("Amount", projection.spent))
                .foregroundStyle(Theme.accent)
                .symbolSize(60)
            if let selectedDay {
                RuleMark(x: .value("Day", selectedDay))
                    .foregroundStyle(Theme.faint)
                    .annotation(position: .top, overflowResolution: .init(x: .fit(to: .chart), y: .disabled)) {
                        tooltip(for: selectedDay)
                    }
            }
        }
        .chartXScale(domain: 0...projection.length)
        .chartXSelection(value: $selectedDay)
        .chartXAxis {
            AxisMarks(values: ticks) { value in
                AxisValueLabel {
                    if let day = value.as(Int.self) {
                        Text(verbatim: label(for: day))
                    }
                }
                .font(Theme.font(10))
                .foregroundStyle(Theme.muted)
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { value in
                AxisGridLine()
                    .foregroundStyle(Theme.divider)
                AxisValueLabel {
                    if let amount = value.as(Double.self) {
                        Text(verbatim: Formatting.euro(amount))
                    }
                }
                .font(Theme.font(10))
                .foregroundStyle(Theme.muted)
            }
        }
        .chartLegend(.hidden)
        .overlay(alignment: .topTrailing) {
            legend
        }
        .accessibilityLabel(String(appLocalized: "Projection: \(Formatting.euro(projection.projected))"))
    }

    /**
     * @constant actualSeries
     * @description The name of this month's curve
     */
    private let actualSeries = "actual"
    /**
     * @constant usualSeries
     * @description The name of the usual curve
     */
    private let usualSeries = "usual"
    /**
     * @constant projectionSeries
     * @description The name of the projection's line
     */
    private let projectionSeries = "projection"

    /**
     * @method points
     * @description A curve's points, from the month's start
     *
     * @param series The curve
     * @param values Euros spent by the end of each day
     * @returns The points
     */
    private func points(of series: String, values: [Double]) -> [PacePoint] {
        guard !values.isEmpty else {
            return []
        }
        return [PacePoint(series: series, day: 0, amount: 0)] + values.enumerated().map { PacePoint(series: series, day: $0.offset + 1, amount: $0.element) }
    }

    /**
     * @method projectionPoints
     * @description The projection's line, from today to the month's end
     */
    private var projectionPoints: [PacePoint] {
        [PacePoint(series: projectionSeries, day: projection.today, amount: projection.spent), PacePoint(series: projectionSeries, day: projection.length, amount: projection.projected)]
    }

    /**
     * @method ticks
     * @description The days the axis names
     */
    private var ticks: [Int] {
        Array(Set([1, 10, 20, projection.length])).sorted()
    }

    /**
     * @method label
     * @description A day of the month, with the month's short name
     *
     * @param day The day
     * @returns The label
     */
    private func label(for day: Int) -> String {
        let date = BudgetMath.calendar.date(byAdding: .day, value: day - 1, to: projection.month) ?? projection.month
        return Formatting.dayShort(date)
    }

    /**
     * @method amount
     * @description Where a curve stands at the end of a day: this month's up to today, the projection after
     *
     * @param day The day
     * @returns The euros, and whether they are projected
     */
    private func amount(at day: Int) -> (value: Double, isProjected: Bool) {
        if day <= projection.today {
            return (day > 0 ? projection.cumulative[day - 1] : 0, false)
        }
        let share = Double(day - projection.today) / Double(max(1, projection.length - projection.today))
        return (projection.spent + (projection.projected - projection.spent) * share, true)
    }

    /**
     * @method tooltip
     * @description The figures of the day being touched
     *
     * @param day The day
     * @returns The tooltip
     */
    private func tooltip(for day: Int) -> some View {
        let clamped = min(max(day, 1), projection.length)
        let current = amount(at: clamped)
        let usual = projection.usual.map { $0[clamped - 1] }

        return VStack(alignment: .leading, spacing: 3) {
            Text(verbatim: label(for: clamped))
                .font(Theme.font(11, .semibold))
                .foregroundStyle(Theme.text)
            tooltipRow(title: current.isProjected ? String(appLocalized: "Projection") : String(appLocalized: "This month"), amount: current.value, color: Theme.accent)
            if let usual {
                tooltipRow(title: String(appLocalized: "Usually"), amount: usual, color: Theme.neutral400)
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 9)
        .glassCard(radius: Theme.controlRadius)
    }

    /**
     * @method tooltipRow
     * @description One figure of the tooltip, after its curve's colour
     *
     * @param title What the figure is
     * @param amount The euros
     * @param color The curve's colour
     * @returns The row
     */
    private func tooltipRow(title: String, amount: Double, color: Color) -> some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text(verbatim: title)
                .font(Theme.font(11))
                .foregroundStyle(Theme.muted)
            Spacer(minLength: 8)
            Text(verbatim: Formatting.euro(amount))
                .font(Theme.font(11, .semibold))
                .foregroundStyle(Theme.text)
                .monospacedDigit()
        }
        .frame(width: 150)
    }

    /**
     * @method legend
     * @description The curves' names, so they never rest on colour alone
     */
    private var legend: some View {
        HStack(spacing: 10) {
            legendItem(title: String(appLocalized: "This month"), color: Theme.accent, isDashed: false)
            legendItem(title: String(appLocalized: "Projection"), color: Theme.accent, isDashed: true)
            if projection.usual != nil {
                legendItem(title: String(appLocalized: "Usually"), color: Theme.neutral400, isDashed: false)
            }
        }
        .padding(.top, -2)
    }

    /**
     * @method legendItem
     * @description A short line in a curve's colour and style, with its name
     *
     * @param title The curve's name
     * @param color Its colour
     * @param isDashed Whether it is drawn dashed
     * @returns The item
     */
    private func legendItem(title: String, color: Color, isDashed: Bool) -> some View {
        HStack(spacing: 5) {
            Path { path in
                path.move(to: CGPoint(x: 1, y: 1))
                path.addLine(to: CGPoint(x: 13, y: 1))
            }
            .stroke(color, style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: isDashed ? [2, 3] : []))
            .frame(width: 14, height: 2)
            Text(verbatim: title)
                .font(Theme.font(10))
                .foregroundStyle(Theme.muted)
        }
    }
}

/**
 * @class ComparisonSection
 * @description The month so far against what is usually spent by the same day: in all, then category by category, the
 * largest rise first
 */
private struct ComparisonSection: View {
    let comparison: MonthComparison /*!< The month so far against usual */

    /**
     * @method body
     * @description The section
     */
    var body: some View {
        if comparison.referenceCount == 0 {
            EmptyStateCard(message: String(appLocalized: "Once a month is over, each category shows here against your usual spending."))
        } else {
            VStack(alignment: .leading, spacing: 10) {
                Text(note)
                    .font(Theme.font(12))
                    .foregroundStyle(Theme.muted)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("In all")
                            .font(Theme.font(11))
                            .foregroundStyle(Theme.muted)
                        Text(verbatim: Formatting.euro(comparison.spent))
                            .font(Theme.font(22, .semibold))
                            .foregroundStyle(Theme.text)
                            .monospacedDigit()
                        Text("Usually \(Formatting.euro(comparison.usual))")
                            .font(Theme.font(11))
                            .foregroundStyle(Theme.muted)
                    }
                    Spacer(minLength: 8)
                    TrendBadge(change: comparison.change)
                }
                .padding(14)
                .glassCard()

                if comparison.categories.isEmpty {
                    EmptyStateCard(message: String(appLocalized: "Nothing spent yet this month."))
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(comparison.categories.enumerated()), id: \.element.id) { index, entry in
                            ComparisonRow(comparison: entry)
                            if index < comparison.categories.count - 1 {
                                RowDivider()
                            }
                        }
                    }
                    .glassCard()
                }
            }
        }
    }

    /**
     * @method note
     * @description What "usual" is measured on
     */
    private var note: String {
        comparison.referenceCount == 1 ? String(appLocalized: "At this point of the month, against last month.") : String(appLocalized: "At this point of the month, against the average of your last \(comparison.referenceCount) months.")
    }
}

/**
 * @class ComparisonRow
 * @description A category's spending this month so far, what it usually is by now, and the change
 */
private struct ComparisonRow: View {
    let comparison: CategoryComparison /*!< The category, this month and usually */

    /**
     * @method body
     * @description The row
     */
    var body: some View {
        HStack(spacing: 11) {
            IconTile(symbol: comparison.category.symbol, color: comparison.category.color)
            VStack(alignment: .leading, spacing: 2) {
                Text(comparison.category.title)
                    .font(Theme.font(14))
                    .foregroundStyle(Theme.text)
                    .lineLimit(1)
                Text("Usually \(Formatting.euro(comparison.usual))")
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.muted)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 4) {
                Text(verbatim: Formatting.euro(comparison.spent))
                    .font(Theme.font(14, .semibold))
                    .foregroundStyle(Theme.text)
                    .monospacedDigit()
                TrendBadge(change: comparison.change)
            }
        }
        .padding(.vertical, 11)
        .padding(.horizontal, 14)
        .accessibilityElement(children: .combine)
    }
}

/**
 * @class TrendBadge
 * @description A change from usual, with an arrow and its sign so it never rests on colour alone: spending more reads
 * red, spending less green, a change under 5% grey
 */
private struct TrendBadge: View {
    let change: Double? /*!< The change, as a fraction, or nil when it usually is nothing */

    /**
     * @type Trend
     * @description Which way the figure moved
     */
    private enum Trend {
        case up /*!< More than usual */
        case down /*!< Less than usual */
        case steady /*!< About as usual */
        case new /*!< Usually nothing */
    }

    /**
     * @method body
     * @description The badge
     */
    var body: some View {
        HStack(spacing: 3) {
            if let symbol {
                Image(systemName: symbol)
                    .font(.system(size: 10, weight: .bold))
            }
            Text(verbatim: label)
                .font(Theme.font(11, .semibold))
                .monospacedDigit()
        }
        .foregroundStyle(color)
        .padding(.vertical, 3)
        .padding(.horizontal, 7)
        .background(color.opacity(0.16), in: Capsule())
    }

    /**
     * @method trend
     * @description Which way the figure moved, a change rounding under 5% reading as steady
     */
    private var trend: Trend {
        guard let change else {
            return .new
        }
        if (abs(change) * 100).rounded() < 5 {
            return .steady
        }
        return change > 0 ? .up : .down
    }

    /**
     * @method label
     * @description The change, signed, or a word that it is new
     */
    private var label: String {
        guard let change else {
            return String(appLocalized: "New")
        }
        return (change > 0 ? "+" : "") + Formatting.percent(change)
    }

    /**
     * @method symbol
     * @description The arrow drawn before the change
     */
    private var symbol: String? {
        switch trend {
        case .up: return "arrow.up.right"
        case .down: return "arrow.down.right"
        case .steady: return "minus"
        case .new: return nil
        }
    }

    /**
     * @method color
     * @description The badge's colour
     */
    private var color: Color {
        switch trend {
        case .up: return Theme.negative
        case .down: return Theme.positive
        case .steady: return Theme.muted
        case .new: return Theme.accent
        }
    }
}
