import Foundation

/**
 * @class AssistantMessage
 * @description One message of the conversation with the assistant, as the server takes it
 */
struct AssistantMessage: Encodable {
    /**
     * @type Role
     * @description Who said it
     */
    enum Role: String, Encodable {
        case user /*!< The person */
        case assistant /*!< The assistant */
    }

    let role: Role /*!< Who said it */
    let text: String /*!< What was said */
}

/**
 * @class AssistantConversation
 * @description A question to the assistant: the conversation so far, ending with the question, the language to answer
 * in and the person's day, which the server can't know
 */
struct AssistantConversation: Encodable {
    let messages: [AssistantMessage] /*!< The conversation, oldest first */
    let language: String /*!< The language to answer in, `en` or `fr` */
    let today: String /*!< The person's day, as `YYYY-MM-DD` */
}

/**
 * @class OperationDraft
 * @description An operation the assistant suggests logging. Its rate to the euro is left to the app, which prices it as
 * any operation typed by hand
 */
struct OperationDraft: Decodable, Equatable {
    var date: String /*!< Its day, as `YYYY-MM-DD` */
    var name: String /*!< Its name */
    var description: String? /*!< Its note, if any */
    var categoryId: String /*!< Its category */
    var location: String? /*!< Its place, if any */
    var amount: Double /*!< Its amount, in its currency */
    var currencyCode: String /*!< Its currency */
    var isOnline: Bool? /*!< Whether it was paid online, offline when left out */
}

/**
 * @class OperationChanges
 * @description The changes the assistant suggests making to an operation. A field left out stays as it is; a note or a
 * place sent as null is cleared, which is why those two are kept as double optionals
 */
struct OperationChanges: Decodable, Equatable {
    var date: String? /*!< Its new day, as `YYYY-MM-DD` */
    var name: String? /*!< Its new name */
    var description: String?? /*!< Its new note: nil to keep it, `.some(nil)` to clear it */
    var categoryId: String? /*!< Its new category */
    var location: String?? /*!< Its new place: nil to keep it, `.some(nil)` to clear it */
    var amount: Double? /*!< Its new amount */
    var currencyCode: String? /*!< Its new currency */
    var isOnline: Bool? /*!< Whether it was paid online */

    /**
     * @type CodingKeys
     * @description The fields a change can name
     */
    private enum CodingKeys: String, CodingKey {
        case date /*!< Its day */
        case name /*!< Its name */
        case description /*!< Its note */
        case categoryId /*!< Its category */
        case location /*!< Its place */
        case amount /*!< Its amount */
        case currencyCode /*!< Its currency */
        case isOnline /*!< Whether it was paid online */
    }

    /**
     * @constructor init
     * @description Reads the changes, telling a field left out from one sent as null
     *
     * @param decoder The decoder
     */
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        date = try container.decodeIfPresent(String.self, forKey: .date)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        description = try Self.clearable(container, .description)
        categoryId = try container.decodeIfPresent(String.self, forKey: .categoryId)
        location = try Self.clearable(container, .location)
        amount = try container.decodeIfPresent(Double.self, forKey: .amount)
        currencyCode = try container.decodeIfPresent(String.self, forKey: .currencyCode)
        isOnline = try container.decodeIfPresent(Bool.self, forKey: .isOnline)
    }

    /**
     * @method clearable
     * @description A text field that a change can clear: nil when left out, `.some(nil)` when sent as null
     *
     * @param container The changes
     * @param key The field
     * @returns Its value
     */
    private static func clearable(_ container: KeyedDecodingContainer<CodingKeys>, _ key: CodingKeys) throws -> String?? {
        guard container.contains(key) else {
            return nil
        }
        if try container.decodeNil(forKey: key) {
            return .some(nil)
        }
        return .some(try container.decode(String.self, forKey: key))
    }
}

/**
 * @class OperationSummary
 * @description An existing operation, as a suggestion to change or delete it shows it
 */
struct OperationSummary: Decodable, Equatable {
    let id: String /*!< Its identifier */
    let date: Date /*!< When it happened */
    let name: String /*!< Its name */
    let categoryId: String /*!< Its category */
    let amount: Double /*!< Its amount, in its currency */
    let currencyCode: String /*!< Its currency */
    let euroAmount: Double /*!< Its amount in euros */
}

/**
 * @type AssistantProposal
 * @description A change the assistant suggests. The server never carries one out: the app shows it and the person
 * confirms it, which sends it through the ordinary sync
 */
enum AssistantProposal: Decodable, Equatable {
    case createOperation(id: String, draft: OperationDraft) /*!< Log an operation */
    case updateOperation(operation: OperationSummary, changes: OperationChanges) /*!< Change an operation */
    case deleteOperation(operation: OperationSummary) /*!< Move an operation to the trash */
    case rateTitle(entryId: String, title: String, rating: Int, comment: String?, watchedAt: String) /*!< Mark a title of the watchlist watched, with a rating */

    /**
     * @type CodingKeys
     * @description The fields a suggestion carries, by kind
     */
    private enum CodingKeys: String, CodingKey {
        case kind /*!< Which change it is */
        case id /*!< The new operation's id */
        case draft /*!< The new operation */
        case operation /*!< The operation it changes */
        case changes /*!< What it changes */
        case entryId /*!< The watchlist entry */
        case title /*!< The title's name */
        case rating /*!< The rating */
        case comment /*!< The comment */
        case watchedAt /*!< The day it was watched */
    }

    /**
     * @constructor init
     * @description Reads a suggestion by its kind
     *
     * @param decoder The decoder
     */
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let kind = try container.decode(String.self, forKey: .kind)

        switch kind {
        case "createOperation":
            self = .createOperation(
                id: try container.decode(String.self, forKey: .id),
                draft: try container.decode(OperationDraft.self, forKey: .draft)
            )
        case "updateOperation":
            self = .updateOperation(
                operation: try container.decode(OperationSummary.self, forKey: .operation),
                changes: try container.decode(OperationChanges.self, forKey: .changes)
            )
        case "deleteOperation":
            self = .deleteOperation(operation: try container.decode(OperationSummary.self, forKey: .operation))
        case "rateTitle":
            self = .rateTitle(
                entryId: try container.decode(String.self, forKey: .entryId),
                title: try container.decode(String.self, forKey: .title),
                rating: try container.decode(Int.self, forKey: .rating),
                comment: try container.decodeIfPresent(String.self, forKey: .comment),
                watchedAt: try container.decode(String.self, forKey: .watchedAt)
            )
        default:
            throw DecodingError.dataCorruptedError(forKey: .kind, in: container, debugDescription: "Unknown suggestion \(kind)")
        }
    }
}

/**
 * @class AssistantReply
 * @description What the assistant answers: its message, and the changes it suggests, waiting for the person
 */
struct AssistantReply: Decodable {
    let text: String /*!< Its message */
    let proposals: [AssistantProposal] /*!< The changes it suggests */
}

/**
 * @class AssistantStatus
 * @description Whether the assistant can answer, as the server tells it
 */
struct AssistantStatus: Decodable {
    let isAvailable: Bool /*!< Whether Gemini takes the server's key and knows its model */
    let reason: String? /*!< Why not, one of the assistant's reasons */
}
