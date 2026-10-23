import Foundation
import Observation

/**
 * @type JSONCoding
 * @description The JSON encoder and decoder the app writes the budget with, dates as ISO 8601
 */
enum JSONCoding {
    /**
     * @constant encoder
     * @description Writes JSON with ISO 8601 dates
     */
    static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    /**
     * @constant decoder
     * @description Reads JSON with ISO 8601 dates
     */
    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}

/**
 * @class LocalStore
 * @description The budget kept on the device, as a JSON file in Application Support: the working copy the server syncs
 * with. Every change is saved at once and announced, so the session can push it
 */
@MainActor
@Observable
final class LocalStore {
    private(set) var categories: [Category] = [] /*!< The spending categories: the shipped catalogue first, then any kept for their operations */
    private(set) var operations: [Operation] = [] /*!< Every operation, latest first */
    private(set) var budget: BudgetSettings = .default /*!< The monthly budget */
    private(set) var budgetHistory: [String: MonthlyBudget] = [:] /*!< The budget frozen against each finished month, by month */

    @ObservationIgnored var onChange: (() -> Void)? /*!< Called after every local change, to push it */
    @ObservationIgnored private var isApplyingRemote = false /*!< Whether the change comes from the server, which needs no pushing back */

    /**
     * @constructor init
     * @description Reads the budget back, and brings its categories in line with the catalogue
     */
    init() {
        load()
        let stored = categories
        mergeCatalog()
        if categories != stored {
            save()
        }
    }

    /**
     * @method document
     * @description The whole budget, as the server syncs it
     *
     * @returns The budget
     */
    func document() -> BudgetDocument {
        BudgetDocument(
            categories: categories,
            operations: operations,
            budget: budget,
            budgetHistory: budgetHistory
        )
    }

    /**
     * @method applyRemote
     * @description Takes the budget the server holds, without announcing it as a local change
     *
     * @param document The server's budget
     */
    func applyRemote(_ document: BudgetDocument) {
        isApplyingRemote = true
        defer { isApplyingRemote = false }
        categories = document.categories
        operations = document.operations
        budget = document.budget
        budgetHistory = document.budgetHistory
        mergeCatalog()
        sortOperations()
        persist()
    }

    /**
     * @method category
     * @description A category by its id
     *
     * @param id Its id
     * @returns The category, or nil when there is none
     */
    func category(id: String) -> Category? {
        categories.first { $0.id == id }
    }

    /**
     * @method categoryOrFallback
     * @description A category by its id, or the fallback for an operation whose category is gone
     *
     * @param id Its id
     * @returns The category
     */
    func categoryOrFallback(id: String) -> Category {
        category(id: id) ?? .fallback
    }

    /**
     * @method updateLimit
     * @description Sets a category's monthly limit
     *
     * @param categoryId The category's id
     * @param limit The limit, never below zero
     */
    func updateLimit(categoryId: String, limit: Double) {
        guard let index = categories.firstIndex(where: { $0.id == categoryId }) else {
            return
        }
        categories[index].monthlyLimit = max(0, limit)
        save()
    }

    /**
     * @method upsertOperation
     * @description Adds an operation, or replaces the one with its id, stamped as just updated
     *
     * @param operation The operation
     */
    func upsertOperation(_ operation: Operation) {
        var updated = operation
        updated.updatedAt = .now
        if let index = operations.firstIndex(where: { $0.id == operation.id }) {
            operations[index] = updated
        } else {
            operations.append(updated)
        }
        sortOperations()
        save()
    }

    /**
     * @method reprice
     * @description Rewrites the rate of the operations a later publication priced differently
     *
     * @param rates The new rate to the euro, by operation id
     */
    func reprice(_ rates: [String: Double]) {
        var changed = false

        for (id, rate) in rates {
            guard let index = operations.firstIndex(where: { $0.id == id }), operations[index].rateToEuro != rate else {
                continue
            }

            operations[index].rateToEuro = rate
            operations[index].updatedAt = .now
            changed = true
        }

        guard changed else {
            return
        }

        save()
    }

    /**
     * @method deleteOperation
     * @description Deletes an operation
     *
     * @param id Its id
     */
    func deleteOperation(id: String) {
        operations.removeAll { $0.id == id }
        save()
    }

    /**
     * @method operation
     * @description An operation by its id
     *
     * @param id Its id
     * @returns The operation, or nil when there is none
     */
    func operation(id: String) -> Operation? {
        operations.first { $0.id == id }
    }

    /**
     * @method liveBudget
     * @description The budget as it stands now: the monthly limit and each category's limit
     */
    var liveBudget: MonthlyBudget {
        MonthlyBudget(
            monthlyLimit: budget.monthlyLimit,
            categoryLimits: Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0.monthlyLimit) })
        )
    }

    /**
     * @method monthlyBudget
     * @description The budget a month is measured against: frozen when it ended, the live one otherwise
     *
     * @param month Any day of the month
     * @returns The month's budget
     */
    func monthlyBudget(for month: Date) -> MonthlyBudget {
        budgetHistory[BudgetMath.monthKey(month)] ?? liveBudget
    }

    /**
     * @method sealCompletedMonths
     * @description Freezes the live budget against every finished month that has none yet, so changing a limit later
     * doesn't rewrite the past
     *
     * @param now The current date
     */
    func sealCompletedMonths(now: Date = .now) {
        guard let earliest = operations.map(\.date).min() else {
            return
        }
        let snapshot = liveBudget
        let currentMonth = BudgetMath.monthStart(now)
        var month = BudgetMath.monthStart(earliest)
        var sealed = false
        while month < currentMonth {
            let key = BudgetMath.monthKey(month)
            if budgetHistory[key] == nil {
                budgetHistory[key] = snapshot
                sealed = true
            }
            month = BudgetMath.shiftMonth(month, by: 1)
        }
        if sealed {
            save()
        }
    }

    /**
     * @method latestLocation
     * @description Where the latest operation in a physical place happened, to suggest it for the next one
     */
    var latestLocation: String? {
        operations.first { !$0.isOnline && !($0.location ?? "").isEmpty }?.location
    }

    /**
     * @method setMonthlyLimit
     * @description Sets the monthly budget
     *
     * @param limit The budget, never below zero
     */
    func setMonthlyLimit(_ limit: Double) {
        budget.monthlyLimit = max(0, limit)
        save()
    }

    /**
     * @method replaceAll
     * @description Replaces the whole budget, for the demonstration
     *
     * @param categories The categories
     * @param operations The operations
     * @param budget The monthly budget
     */
    func replaceAll(
        categories: [Category],
        operations: [Operation],
        budget: BudgetSettings
    ) {
        self.categories = categories
        self.operations = operations
        self.budget = budget
        budgetHistory = [:]
        sortOperations()
        save()
    }

    /**
     * @method clearAll
     * @description Deletes every operation and puts the budget back to its defaults
     */
    func clearAll() {
        categories = Category.defaults
        operations = []
        budget = .default
        budgetHistory = [:]
        save()
    }

    /**
     * @method fileURL
     * @description Where the budget is kept
     */
    private static var fileURL: URL {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appending(path: "local-store.json")
    }

    /**
     * @method load
     * @description Reads the budget back from its file, migrated from older versions
     */
    private func load() {
        guard let data = try? Data(contentsOf: Self.fileURL),
              let document = try? JSONCoding.decoder.decode(BudgetDocument.self, from: LegacyDocument.migrated(data)) else {
            return
        }
        categories = document.categories
        operations = document.operations
        budget = document.budget
        budgetHistory = document.budgetHistory
        sortOperations()
    }

    /**
     * @method save
     * @description Writes the budget and announces the change, unless it came from the server
     */
    func save() {
        persist()
        if !isApplyingRemote {
            onChange?()
        }
    }

    /**
     * @method persist
     * @description Writes the budget to its file
     */
    private func persist() {
        if let data = try? JSONCoding.encoder.encode(document()) {
            try? data.write(to: Self.fileURL, options: .atomic)
        }
    }

    /**
     * @method sortOperations
     * @description Puts the operations latest first
     */
    private func sortOperations() {
        operations.sort { $0.date > $1.date }
    }

    /**
     * @method mergeCatalog
     * @description Brings the categories in line with the shipped catalogue, keeping their stored limits and any
     * retired category an operation still uses. A category shipped after the budget was stored joins it with no limit,
     * so it does not eat into the limits already dispatched, and a dropped one is left out
     */
    private func mergeCatalog() {
        guard !categories.isEmpty else {
            categories = Category.defaults
            return
        }

        let stored = Dictionary(categories.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        let catalogIds = Set(Category.defaults.map(\.id))
        let used = Set(operations.map(\.categoryId))

        let shipped = Category.defaults.map { category in
            var merged = category
            merged.monthlyLimit = stored[category.id]?.monthlyLimit ?? 0
            return merged
        }

        categories = shipped + categories.filter { category in
            guard !catalogIds.contains(category.id), !Category.dropped.contains(category.id) else {
                return false
            }

            return !Category.retired.contains(category.id) || used.contains(category.id)
        }
    }
}
