import Foundation

/**
 * @class IdentityTokens
 * @description An access/refresh token pair, as the server hands it over
 */
struct IdentityTokens: Codable {
    var accessToken: String /*!< The short-lived token sent with every request */
    var refreshToken: String /*!< The long-lived token renewing it */
}

/**
 * @class RemoteState
 * @description The budget document as the server stores it, with the revision a push has to name to replace it
 */
struct RemoteState: Decodable {
    var document: BudgetDocument /*!< The budget */
    var revision: Int /*!< Its revision */

    /**
     * @type CodingKeys
     * @description The key the revision sits under, next to the document's own
     */
    private enum CodingKeys: String, CodingKey {
        case revision /*!< The revision */
    }

    /**
     * @constructor init
     * @description Reads the document and its revision from the same object
     *
     * @param decoder The decoder
     */
    init(from decoder: Decoder) throws {
        document = try BudgetDocument(from: decoder)
        revision = try decoder.container(keyedBy: CodingKeys.self).decode(Int.self, forKey: .revision)
    }
}

/**
 * @class StatePush
 * @description A budget pushed to the server, naming the revision it was edited from
 */
private struct StatePush: Encodable {
    let document: BudgetDocument /*!< The budget */
    let revision: Int /*!< The revision it was edited from */

    /**
     * @type CodingKeys
     * @description The key the revision sits under, next to the document's own
     */
    private enum CodingKeys: String, CodingKey {
        case revision /*!< The revision */
    }

    /**
     * @method encode
     * @description Writes the document and its revision into the same object
     *
     * @param encoder The encoder
     */
    func encode(to encoder: Encoder) throws {
        try document.encode(to: encoder)
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(revision, forKey: .revision)
    }
}

/**
 * @type APIError
 * @description Why a request to the server failed, worded for the person in the interface's language
 */
enum APIError: Error, LocalizedError {
    case notConfigured /*!< No server address is set */
    case unauthorized /*!< The session expired and couldn't be renewed */
    case connectionRefused /*!< The portal's one-time code was refused */
    case throttled /*!< Too many requests */
    case conflict /*!< The budget changed on the server since it was read */
    case server(status: Int, message: String) /*!< The server refused the request, with its status and message */
    case transport(Error) /*!< The server couldn't be reached */
    case decoding(Error) /*!< The server answered something unexpected */

    /**
     * @method errorDescription
     * @description What to tell the person, in the interface's language. The server words its own messages in English
     * for whoever reads its logs, so they are kept for that and never shown
     */
    var errorDescription: String? {
        switch self {
        case .notConfigured: return String(appLocalized: "No server is configured.")
        case .unauthorized: return String(appLocalized: "Your session has expired.")
        case .connectionRefused: return String(appLocalized: "The sign-in didn't go through. Try again.")
        case .throttled: return String(appLocalized: "Too many attempts. Try again in a moment.")
        case .conflict: return String(appLocalized: "The budget changed on the server.")
        case .server(let status, _) where status >= 500: return String(appLocalized: "The server is unavailable right now.")
        case .server: return String(appLocalized: "The server refused the request.")
        case .transport: return String(appLocalized: "Can't reach the server.")
        case .decoding: return String(appLocalized: "The server sent an unexpected response.")
        }
    }

    /**
     * @method isOffline
     * @description Whether the server couldn't be reached
     */
    var isOffline: Bool {
        if case .transport = self {
            return true
        }
        return false
    }
}

/**
 * @class APIClient
 * @description Talks to the server: it signs in with the portal's one-time code, renews the tokens when they lapse, and
 * reads and writes the budget and the rates
 */
@MainActor
final class APIClient {
    private(set) var baseURL: URL? /*!< The server's address */
    private let tokens: TokenStore /*!< The session's tokens */
    private let session: URLSession /*!< The URL session the requests go through */
    private var refreshTask: Task<Void, Error>? /*!< The renewal under way, shared by the requests that need it */

    /**
     * @constructor init
     * @description Builds a client around the token store
     *
     * @param tokens The session's tokens
     * @param baseURL The server's address
     */
    init(tokens: TokenStore, baseURL: URL? = nil) {
        self.tokens = tokens
        self.baseURL = baseURL
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 20
        configuration.waitsForConnectivity = false
        self.session = URLSession(configuration: configuration)
    }

    /**
     * @method setBaseURL
     * @description Points the client at a server
     *
     * @param url The server's address
     */
    func setBaseURL(_ url: URL?) {
        baseURL = url
    }

    /**
     * @class Envelope
     * @description The `{ data }` envelope every answer comes in
     */
    private struct Envelope<T: Decodable>: Decodable {
        let data: T /*!< The answer */
    }

    /**
     * @class ErrorEnvelope
     * @description The message an error answer carries
     */
    private struct ErrorEnvelope: Decodable {
        let message: String /*!< The server's message, for its logs */
    }

    /**
     * @method connect
     * @description Trades the one-time code the portal handed back, with the PKCE verifier it was asked with, for a
     * session
     *
     * @param code The one-time code
     * @param verifier The PKCE verifier
     */
    func connect(code: String, verifier: String) async throws {
        do {
            let tokens: IdentityTokens = try await send(
                "/v1/identity/connect/token",
                method: "POST",
                body: ["code": code, "verifier": verifier],
                authorized: false
            )
            self.tokens.store(access: tokens.accessToken, refresh: tokens.refreshToken)
        } catch APIError.server(status: 401, message: _) {
            throw APIError.connectionRefused
        }
    }

    /**
     * @method logout
     * @description Closes the session on the server; a failure is ignored, the session is forgotten anyway
     */
    func logout() async {
        guard let refreshToken = tokens.refreshToken else {
            return
        }
        let _: EmptyResponse? = try? await send(
            "/v1/identity/logout",
            method: "POST",
            body: ["refreshToken": refreshToken]
        )
    }

    /**
     * @method getRates
     * @description Reads the latest reference rates
     *
     * @returns The rates
     */
    func getRates() async throws -> RateSnapshot {
        try await send("/v1/budget/rates", method: "GET")
    }

    /**
     * @method getRates
     * @description Reads one day's reference rates
     *
     * @param day The day, as `YYYY-MM-DD`
     * @returns The rates
     */
    func getRates(on day: String) async throws -> RateSnapshot {
        try await send("/v1/budget/rates/\(day)", method: "GET")
    }

    /**
     * @method getState
     * @description Reads the whole budget and its revision
     *
     * @returns The budget
     */
    func getState() async throws -> RemoteState {
        try await send("/v1/budget/state", method: "GET")
    }

    /**
     * @method putState
     * @description Stores the document, provided the server still holds `revision`. Throws `APIError.conflict` when
     * someone else wrote since, leaving the server untouched
     *
     * @param document The budget
     * @param revision The revision it was edited from
     * @returns The budget as stored
     */
    @discardableResult
    func putState(_ document: BudgetDocument, revision: Int) async throws -> RemoteState {
        try await send("/v1/budget/state", method: "PUT", body: StatePush(document: document, revision: revision))
    }

    /**
     * @class EmptyResponse
     * @description An answer whose content doesn't matter
     */
    private struct EmptyResponse: Decodable {}

    /**
     * @method send
     * @description Sends a request, renewing the tokens once and replaying it when the access token lapsed
     *
     * @param path The path, from `/v1`
     * @param method The HTTP method
     * @param body The body, if any
     * @param authorized Whether to send the access token
     * @returns The answer's data
     */
    private func send<Response: Decodable>(
        _ path: String,
        method: String,
        body: Encodable? = nil,
        authorized: Bool = true
    ) async throws -> Response {
        do {
            return try await perform(path, method: method, body: body, authorized: authorized)
        } catch APIError.unauthorized where authorized {
            try await refreshTokens()
            return try await perform(path, method: method, body: body, authorized: true)
        }
    }

    /**
     * @method perform
     * @description Sends one request and reads its answer, turning each refusal into its `APIError`
     *
     * @param path The path, from `/v1`
     * @param method The HTTP method
     * @param body The body, if any
     * @param authorized Whether to send the access token
     * @returns The answer's data
     */
    private func perform<Response: Decodable>(
        _ path: String,
        method: String,
        body: Encodable?,
        authorized: Bool
    ) async throws -> Response {
        guard let baseURL else {
            throw APIError.notConfigured
        }

        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONCoding.encoder.encode(AnyEncodable(body))
        }

        if authorized, let accessToken = tokens.accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.server(status: 0, message: "Invalid response")
        }

        if http.statusCode == 401, authorized {
            throw APIError.unauthorized
        }

        if http.statusCode == 409 {
            throw APIError.conflict
        }

        if http.statusCode == 429 {
            throw APIError.throttled
        }

        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONCoding.decoder.decode(ErrorEnvelope.self, from: data))?.message ?? "Request failed"
            throw APIError.server(status: http.statusCode, message: message)
        }

        do {
            return try JSONCoding.decoder.decode(Envelope<Response>.self, from: data).data
        } catch {
            throw APIError.decoding(error)
        }
    }

    /**
     * @method refreshTokens
     * @description Rotates the refresh token into a new pair. Concurrent calls share one rotation, and a refused one
     * ends the session
     */
    private func refreshTokens() async throws {
        if let refreshTask {
            try await refreshTask.value
            return
        }
        let task = Task<Void, Error> {
            defer { refreshTask = nil }
            guard let refreshToken = tokens.refreshToken else {
                throw APIError.unauthorized
            }
            do {
                let pair: IdentityTokens = try await perform(
                    "/v1/identity/refresh",
                    method: "POST",
                    body: ["refreshToken": refreshToken],
                    authorized: false
                )
                tokens.store(access: pair.accessToken, refresh: pair.refreshToken)
            } catch APIError.server, APIError.unauthorized {
                tokens.clear()
                throw APIError.unauthorized
            }
        }
        refreshTask = task
        try await task.value
    }
}

/**
 * @class AnyEncodable
 * @description Wraps any encodable body, so the client can take bodies of every type
 */
private struct AnyEncodable: Encodable {
    private let encode: (Encoder) throws -> Void /*!< Encodes the wrapped body */

    /**
     * @constructor init
     * @description Wraps a body
     *
     * @param wrapped The body
     */
    init(_ wrapped: Encodable) {
        encode = wrapped.encode
    }

    /**
     * @method encode
     * @description Encodes the wrapped body
     *
     * @param encoder The encoder
     */
    func encode(to encoder: Encoder) throws {
        try encode(encoder)
    }
}
