import Foundation

/**
 * @type ProposalError
 * @description Why a suggestion the person confirmed couldn't be carried out, worded for them
 */
enum ProposalError: Error, LocalizedError {
    case invalidDate /*!< The suggestion names a day that can't be used, such as one to come */
    case rateMissing(String) /*!< No rate is known for the currency on that day */
    case rateFailed(String) /*!< The day's rates couldn't be loaded, with why */
    case deletedElsewhere /*!< The operation it changes is gone */

    /**
     * @method errorDescription
     * @description What to tell the person, in the interface's language
     */
    var errorDescription: String? {
        switch self {
        case .invalidDate: return String(appLocalized: "This suggestion has a date that can't be used.")
        case .rateMissing(let code): return String(appLocalized: "No exchange rate for \(code) on that day.")
        case .rateFailed(let reason): return reason
        case .deletedElsewhere: return String(appLocalized: "This operation was deleted on another device.")
        }
    }
}

/**
 * @class ProposalApplier
 * @description Carries out a suggestion the person confirmed, as the app would: an operation logged, changed or moved to
 * the trash goes through the store, which the session syncs, a rating straight to the server
 */
@MainActor
struct ProposalApplier {
    let store: LocalStore /*!< The budget */
    let rates: ExchangeRates /*!< The exchange rates */
    let session: ApplicationSession /*!< The session with the server */

    /**
     * @method apply
     * @description Carries out a suggestion
     *
     * @param proposal The suggestion
     */
    func apply(_ proposal: AssistantProposal) async throws {
        switch proposal {
        case .createOperation(let id, let draft):
            let date = try Self.moment(on: draft.date)
            let rate = try await price(code: draft.currencyCode, on: draft.date)
            store.upsertOperation(Self.operation(from: draft, id: id.uppercased(), date: date, rate: rate, isRecurring: false))
        case .updateOperation(let summary, let changes):
            await session.catchUp()
            guard let existing = store.operation(id: summary.id) else {
                throw ProposalError.deletedElsewhere
            }
            store.upsertOperation(try await changed(existing, by: changes))
        case .deleteOperation(let summary):
            store.deleteOperation(id: summary.id)
        case .rateTitle(let entryId, _, let rating, let comment, let watchedAt):
            try await session.rateTitle(entryId: entryId, rating: rating, comment: comment, watchedAt: Self.moment(on: watchedAt))
        }
    }

    /**
     * @method changed
     * @description An operation with the suggested changes made. It is priced again only when its currency or its day
     * changes, so a rate the app already settled is kept otherwise
     *
     * @param existing The operation
     * @param changes The changes
     * @returns The operation, changed
     */
    private func changed(_ existing: Operation, by changes: OperationChanges) async throws -> Operation {
        let existingDay = ExchangeRates.day(from: existing.date)
        let draft = OperationDraft(
            date: changes.date ?? existingDay,
            name: changes.name ?? existing.name,
            description: changes.description ?? existing.description,
            categoryId: changes.categoryId ?? existing.categoryId,
            location: changes.location ?? existing.location,
            amount: changes.amount ?? existing.amount,
            currencyCode: changes.currencyCode ?? existing.currencyCode,
            isOnline: changes.isOnline ?? existing.isOnline
        )
        var date = existing.date
        var rate = existing.rateToEuro

        if draft.date != existingDay {
            date = try Self.moment(on: draft.date)
        }
        if draft.date != existingDay || draft.currencyCode != existing.currencyCode {
            rate = try await price(code: draft.currencyCode, on: draft.date)
        }

        return Self.operation(from: draft, id: existing.id, date: date, rate: rate, isRecurring: existing.isRecurring)
    }

    /**
     * @method price
     * @description The rate a currency had on a day, bank markup included, loading that day's rates if need be
     *
     * @param code The currency's code
     * @param day The day, as `YYYY-MM-DD`
     * @returns The euros one unit cost
     */
    private func price(code: String, on day: String) async throws -> Double {
        if code == Currency.euro.code {
            return 1
        }

        await rates.load(day: day)

        guard let rate = rates.rate(code: code, on: day) else {
            if let failure = rates.failure(on: day) {
                throw ProposalError.rateFailed(failure)
            }
            throw ProposalError.rateMissing(code)
        }

        return rate
    }

    /**
     * @method operation
     * @description The operation a draft describes, trimmed as the editor trims what is typed
     *
     * @param draft The draft
     * @param id The operation's id
     * @param date When it happened
     * @param rate Its rate to the euro
     * @param isRecurring Whether it repeats every month
     * @returns The operation
     */
    private static func operation(from draft: OperationDraft, id: String, date: Date, rate: Double, isRecurring: Bool) -> Operation {
        let isOnline = draft.isOnline ?? false
        let description = (draft.description ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let location = isOnline ? "" : (draft.location ?? "").trimmingCharacters(in: .whitespaces)

        return Operation(
            id: id,
            date: date,
            name: draft.name.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            categoryId: draft.categoryId,
            location: location.isEmpty ? nil : location,
            amount: draft.amount,
            currencyCode: draft.currencyCode,
            rateToEuro: rate,
            isOnline: isOnline,
            isRecurring: isRecurring
        )
    }

    /**
     * @method moment
     * @description The moment something dated on a day is logged at: that day, at the time it is now. A day to come is
     * refused, as in the editor
     *
     * @param day The day, as `YYYY-MM-DD`
     * @returns The moment
     */
    private static func moment(on day: String) throws -> Date {
        let parts = day.split(separator: "-").compactMap { Int($0) }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        let now = Date.now
        let time = calendar.dateComponents([.hour, .minute, .second], from: now)

        guard parts.count == 3,
              let moment = calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: time.hour, minute: time.minute, second: time.second)),
              ExchangeRates.day(from: moment) == day,
              day <= ExchangeRates.day(from: now) else {
            throw ProposalError.invalidDate
        }

        return moment
    }
}
