import Foundation

/**
 * @class MonthProjection
 * @description Where the current month is heading: what was spent so far, where it ends at the same pace, and the
 * curves the chart draws
 */
struct MonthProjection: Equatable {
    var month: Date /*!< The first day of the month */
    var today: Int /*!< Today's day of the month */
    var length: Int /*!< How many days the month has */
    var limit: Double /*!< The month's budget */
    var spent: Double /*!< Euros spent so far */
    var recurring: Double /*!< Euros of it spent on recurring operations, which don't repeat within the month */
    var pace: Double /*!< Euros spent per day on everything else */
    var cumulative: [Double] /*!< Euros spent by the end of each day so far, the first day first */
    var usual: [Double]? /*!< Euros the reference months had spent by each day of the month, on average, nil without any */

    var projected: Double { spent + pace * Double(length - today) } /*!< Euros spent by the end of the month, at that pace */
    var isEarly: Bool { today < BudgetAnalysis.earlyDays } /*!< Whether the month only just started, so the projection is rough */
}

/**
 * @class CategoryComparison
 * @description What one category spent this month so far, against what it usually had by the same day
 */
struct CategoryComparison: Identifiable, Equatable {
    var category: Category /*!< The category */
    var spent: Double /*!< Euros spent this month so far */
    var usual: Double /*!< Euros it usually had by the same day */

    var id: String { category.id } /*!< Its identifier, the category's */
    var change: Double? { BudgetAnalysis.change(spent, from: usual) } /*!< The change as a fraction, nil when it usually spent nothing */
}

/**
 * @class MonthComparison
 * @description The current month so far against the same point of the reference months, in all and per category
 */
struct MonthComparison: Equatable {
    var referenceCount: Int /*!< How many past months "usual" is measured on, 0 without history */
    var spent: Double /*!< Euros spent this month so far */
    var usual: Double /*!< Euros usually spent by the same day */
    var categories: [CategoryComparison] /*!< Each category that spent this month or usually does, the largest rise first */

    var change: Double? { BudgetAnalysis.change(spent, from: usual) } /*!< The change as a fraction, nil when nothing was usually spent */
}

/**
 * @type BudgetAnalysis
 * @description The Analysis tab's arithmetic, as pure functions of the budget, the same as the web's: where the month is
 * heading, and how it compares with the usual spending at the same point of the month
 */
enum BudgetAnalysis {
    /**
     * @constant referenceLimit
     * @description How many past months "usual" is measured on, at most
     */
    static let referenceLimit = 6
    /**
     * @constant earlyDays
     * @description Before this day of the month, too little was spent for the projection to say much
     */
    static let earlyDays = 5

    /**
     * @method change
     * @description How much a figure moved from its usual value, as a fraction
     *
     * @param spent The figure
     * @param usual Its usual value
     * @returns The change, or nil when the usual value is nothing
     */
    static func change(_ spent: Double, from usual: Double) -> Double? {
        usual > 0 ? spent / usual - 1 : nil
    }

    /**
     * @method day
     * @description A date's day of the month
     *
     * @param date The date
     * @returns The day, from 1
     */
    static func day(of date: Date) -> Int {
        BudgetMath.calendar.component(.day, from: date)
    }

    /**
     * @method length
     * @description How many days a month has
     *
     * @param month Any day of the month
     * @returns The number of days
     */
    static func length(of month: Date) -> Int {
        BudgetMath.calendar.range(of: .day, in: .month, for: month)?.count ?? 30
    }

    /**
     * @method referenceMonths
     * @description The past months "usual" is measured on: the latest ones holding operations, before the month and at
     * most six, latest first
     *
     * @param operations Every operation
     * @param month The month measured
     * @returns The first day of each reference month
     */
    static func referenceMonths(_ operations: [Operation], before month: Date) -> [Date] {
        let start = BudgetMath.monthStart(month)
        let months = Set(operations.map { BudgetMath.monthStart($0.date) }.filter { $0 < start })
        return Array(months.sorted(by: >).prefix(referenceLimit))
    }

    /**
     * @method spent
     * @description What operations cost in euros
     *
     * @param operations The operations
     * @returns The total
     */
    static func spent(_ operations: [Operation]) -> Double {
        operations.reduce(0) { $0 + $1.euroAmount }
    }

    /**
     * @method cumulative
     * @description What a month's operations spent by the end of each of its first days
     *
     * @param operations The month's operations
     * @param days How many days to measure
     * @returns The euros spent by each day, the first day first
     */
    static func cumulative(_ operations: [Operation], days: Int) -> [Double] {
        var daily = Array(repeating: 0.0, count: max(0, days))
        for operation in operations {
            let index = day(of: operation.date) - 1
            if index >= 0, index < days {
                daily[index] += operation.euroAmount
            }
        }

        var total = 0.0
        return daily.map { amount in
            total += amount
            return total
        }
    }

    /**
     * @method usualCumulative
     * @description What the reference months had spent by each day of a month of a given length, on average. A shorter
     * month counts as finished past its last day
     *
     * @param operations Every operation
     * @param references The reference months
     * @param length How many days the measured month has
     * @returns The average euros by each day, or nil without a reference month
     */
    static func usualCumulative(_ operations: [Operation], references: [Date], length: Int) -> [Double]? {
        guard !references.isEmpty else {
            return nil
        }

        let curves = references.map { month -> [Double] in
            let curve = cumulative(BudgetMath.operations(operations, in: month), days: self.length(of: month))
            return (0..<length).map { curve[min($0, curve.count - 1)] }
        }

        return (0..<length).map { index in
            curves.reduce(0) { $0 + $1[index] } / Double(curves.count)
        }
    }

    /**
     * @method project
     * @description Where the current month is heading. Recurring operations, such as the rent or a subscription, are
     * counted once; everything else is spread over the days gone by, today included, and carried on to the month's end
     *
     * @param operations Every operation
     * @param limit The month's budget
     * @param now The current date
     * @returns The projection
     */
    static func project(_ operations: [Operation], limit: Double, now: Date = .now) -> MonthProjection {
        let month = BudgetMath.monthStart(now)
        let today = day(of: now)
        let days = length(of: month)
        let current = BudgetMath.operations(operations, in: month).filter { day(of: $0.date) <= today }
        let total = spent(current)
        let recurring = spent(current.filter(\.isRecurring))
        let references = referenceMonths(operations, before: month)

        return MonthProjection(month: month, today: today, length: days, limit: limit, spent: total, recurring: recurring, pace: (total - recurring) / Double(today), cumulative: cumulative(current, days: today), usual: usualCumulative(operations, references: references, length: days))
    }

    /**
     * @method compare
     * @description The current month so far against the same point of the reference months: by today's day, or by
     * their last day when they are shorter. Comparing at the same day keeps a rent paid on the 1st, or a month only half
     * gone, from reading as a rise or a fall
     *
     * @param operations Every operation
     * @param categories The categories
     * @param now The current date
     * @returns The comparison
     */
    static func compare(_ operations: [Operation], categories: [Category], now: Date = .now) -> MonthComparison {
        let month = BudgetMath.monthStart(now)
        let today = day(of: now)
        let references = referenceMonths(operations, before: month)
        let current = BudgetMath.operations(operations, in: month).filter { day(of: $0.date) <= today }
        let past = references.flatMap { BudgetMath.operations(operations, in: $0).filter { day(of: $0.date) <= today } }
        let count = Double(max(1, references.count))

        let rows = categories.map { category in
            CategoryComparison(category: category, spent: spent(current.filter { $0.categoryId == category.id }), usual: spent(past.filter { $0.categoryId == category.id }) / count)
        }
        let shown = rows.filter { $0.spent > 0 || $0.usual > 0 }.sorted { ($0.spent - $0.usual) > ($1.spent - $1.usual) }

        return MonthComparison(referenceCount: references.count, spent: spent(current), usual: spent(past) / count, categories: shown)
    }
}
