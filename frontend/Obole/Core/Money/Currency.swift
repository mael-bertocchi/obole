import Foundation

struct Currency: Codable, Identifiable, Equatable, Hashable {
    var code: String
    var symbol: String
    var name: String
    var rateToEuro: Double

    var id: String { code }
}

extension Currency {
    static let euro = Currency(code: "EUR", symbol: "€", name: "Euro", rateToEuro: 1)

    /// The currencies the app offers. The rates here are only a fallback for a launch that has
    /// never reached the server: `ExchangeRates` overlays the live values on top of them.
    /// They are ECB reference rates for 2026-09-07.
    static let all: [Currency] = [
        euro,
        Currency(code: "USD", symbol: "$", name: "United States Dollar", rateToEuro: 0.860437),
        Currency(code: "CHF", symbol: "CHF", name: "Swiss Franc", rateToEuro: 1.063264),
        Currency(code: "KRW", symbol: "₩", name: "South Korean Won", rateToEuro: 0.00063834)
    ]

    static func named(_ code: String) -> Currency {
        all.first { $0.code == code } ?? euro
    }

    /// The name to show, in the interface's language.
    var title: String {
        switch code {
        case "EUR": return String(appLocalized: "Euro")
        case "USD": return String(appLocalized: "United States Dollar")
        case "CHF": return String(appLocalized: "Swiss Franc")
        case "KRW": return String(appLocalized: "South Korean Won")
        default: return name
        }
    }

    /// What the bank adds on top of the reference rate. A card payment abroad is not settled at the ECB
    /// rate: the bank takes its cut on the way, so the operation lands on the statement about a percent
    /// dearer than the published rate suggests.
    static let bankMarkup = 0.01

    /// The rate the app applies: the published reference rate with the bank's markup on top, so a euro
    /// amount matches what is actually charged. The euro itself is never marked up, since it is never converted.
    static func bankRate(_ referenceRate: Double, code: String) -> Double {
        guard code != euro.code else { return referenceRate }

        return referenceRate * (1 + bankMarkup)
    }
}

/// One set of reference rates as published by the server. `rates` maps a currency code to the
/// euros a single unit of it buys, which is the convention `Currency.rateToEuro` uses.
struct RateSnapshot: Codable, Equatable {
    var quoteDate: String
    var fetchedAt: Date
    var rates: [String: Double]
}

@MainActor
@Observable
final class ExchangeRates {
    enum RefreshState: Equatable {
        case idle
        case refreshing
        case failed(String)
    }

    private(set) var snapshot: RateSnapshot?
    private(set) var refreshState: RefreshState = .idle

    /// Rates for one past day, keyed by that day. Held for the run only: the server caches them
    /// permanently, and a finished day's rates never change.
    private(set) var dated: [String: RateSnapshot] = [:]

    /// Why one day's rates could not be loaded, keyed by that day. A rate the app had to guess at should
    /// never look like one it actually fetched, so the reason is kept and shown.
    private(set) var failures: [String: String] = [:]

    private let api: APIClient
    private var inFlight: [String: Task<Void, Never>] = [:]

    init(api: APIClient) {
        self.api = api
        snapshot = Self.stored()
    }

    /// The calendar day a date falls on, in the time zone the device is in now. Picking the 5th should price an
    /// operation at the 5th's rate, whatever that instant happens to be in UTC. The zone is read on every call:
    /// a formatter kept around would stay in the one it was created in after the device moves to another.
    static func day(from date: Date) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    /// The catalogue with the latest known rate overlaid onto each currency, carrying the bank's markup:
    /// every rate the app hands out is one it would actually charge at.
    var currencies: [Currency] {
        Currency.all.map { currency in
            var applied = currency

            if let live = snapshot?.rates[currency.code], live > 0 {
                applied.rateToEuro = live
            }

            applied.rateToEuro = Currency.bankRate(applied.rateToEuro, code: currency.code)

            return applied
        }
    }

    /// Whether the rates are old enough to be worth re-fetching.
    var isStale: Bool {
        guard let fetchedAt = snapshot?.fetchedAt else { return true }

        return Date.now.timeIntervalSince(fetchedAt) >= Self.staleAfter
    }

    func currency(code: String) -> Currency {
        currencies.first { $0.code == code } ?? .euro
    }

    func rate(code: String) -> Double {
        currency(code: code).rateToEuro
    }

    func euroAmount(_ amount: Double, code: String) -> Double {
        amount * rate(code: code)
    }

    /// The rate that applied on one day, markup included, or nil until that day has been loaded.
    func rate(code: String, on day: String) -> Double? {
        guard code != Currency.euro.code else { return 1 }
        guard let published = dated[day]?.rates[code] else { return nil }

        return Currency.bankRate(published, code: code)
    }

    /// Whether a day's rates may still be replaced. A day answered by an earlier day's rate is provisional
    /// while it is today or later: its own rate simply hasn't been published yet. A past weekend is not:
    /// Friday's rate is the final answer for it.
    private func isProvisional(_ snapshot: RateSnapshot, for day: String) -> Bool {
        snapshot.quoteDate != day && day >= Self.day(from: .now)
    }

    /// The day the loaded rates were actually published on, which is the previous working day for a weekend
    /// or a holiday. Nil until the day has been loaded.
    func quoteDate(on day: String) -> String? {
        dated[day]?.quoteDate
    }

    /// Why one day's rates are missing, or nil when nothing went wrong.
    func failure(on day: String) -> String? {
        failures[day]
    }

    /// Loads the rates for one day, once. The fetch runs in a task of its own rather than the caller's: a
    /// view that changes its mind about which day it wants would otherwise cancel the request mid-flight,
    /// and a cancelled request looks exactly like an unreachable server.
    func load(day: String) async {
        if let cached = dated[day], !isProvisional(cached, for: day) { return }

        if let inFlight = inFlight[day] {
            await inFlight.value

            return
        }

        let task = Task { [api] in
            do {
                dated[day] = try await api.getRates(on: day)
                failures.removeValue(forKey: day)
            } catch {
                failures[day] = (error as? APIError)?.errorDescription ?? error.localizedDescription
            }

            inFlight.removeValue(forKey: day)
        }

        inFlight[day] = task

        await task.value
    }

    /// Re-fetches only when the rates have gone stale, so foregrounding the app repeatedly
    /// doesn't turn into a request each time.
    func refreshIfNeeded() async {
        guard isStale, refreshState != .refreshing else { return }

        await refresh()
    }

    /// Pulls the current rates from the server. A failure keeps the last known snapshot in place:
    /// rates that are a little old beat rates that are wrong, and the UI reports their age.
    func refresh() async {
        refreshState = .refreshing

        do {
            let fresh = try await api.getRates()

            snapshot = fresh
            Self.store(fresh)
            refreshState = .idle
        } catch {
            let message = (error as? APIError)?.errorDescription ?? error.localizedDescription
            refreshState = .failed(message)
        }
    }

    private static func stored() -> RateSnapshot? {
        guard let data = UserDefaults.standard.data(forKey: Keys.snapshot) else { return nil }

        return try? JSONCoding.decoder.decode(RateSnapshot.self, from: data)
    }

    private static func store(_ snapshot: RateSnapshot) {
        guard let data = try? JSONCoding.encoder.encode(snapshot) else { return }

        UserDefaults.standard.set(data, forKey: Keys.snapshot)
    }

    private static let staleAfter: TimeInterval = 60 * 60

    private enum Keys {
        static let snapshot = "rates.snapshot"
    }
}
