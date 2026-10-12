import Foundation

/**
 * @class BudgetDocument
 * @description The whole budget, as the app stores it and the server syncs it
 */
struct BudgetDocument: Codable, Equatable {
    var categories: [Category] /*!< The spending categories, with their limits */
    var operations: [Operation] /*!< Every operation */
    var budget: BudgetSettings /*!< The monthly budget */
    var budgetHistory: [String: MonthlyBudget] /*!< The budget frozen against each finished month, by month */

    /**
     * @method isEmpty
     * @description Whether no operation was ever logged
     */
    var isEmpty: Bool {
        operations.isEmpty
    }
}
