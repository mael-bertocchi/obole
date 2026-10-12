import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import type { KeyObject } from 'node:crypto';

/**
 * @type CborValue
 * @description What the little CBOR encoder below can write: just enough for an attestation object and a COSE key.
 */
type CborValue = number | string | Uint8Array | Map<CborValue, CborValue>;

/**
 * @function cborHead
 * @description A CBOR item's head: its major type and its length or value.
 */
function cborHead(major: number, value: number): Buffer {
    if (value < 24) {
        return Buffer.from([(major << 5) | value]);
    }

    if (value < 0x100) {
        return Buffer.from([(major << 5) | 24, value]);
    }

    const head = Buffer.alloc(3);

    head[0] = (major << 5) | 25;
    head.writeUInt16BE(value, 1);

    return head;
}

/**
 * @function cbor
 * @description Encodes a value in CBOR.
 */
function cbor(value: CborValue): Buffer {
    if (typeof value === 'number') {
        return value >= 0 ? cborHead(0, value) : cborHead(1, -1 - value);
    }

    if (typeof value === 'string') {
        const bytes = Buffer.from(value, 'utf8');

        return Buffer.concat([cborHead(3, bytes.length), bytes]);
    }

    if (value instanceof Uint8Array) {
        return Buffer.concat([cborHead(2, value.length), value]);
    }

    return Buffer.concat([cborHead(5, value.size), ...[...value].flatMap(([key, item]) => [cbor(key), cbor(item)])]);
}

/**
 * @interface PasskeyAnswer
 * @description What every passkey answer carries, as the browser gives it in JSON.
 */
interface PasskeyAnswer {
    id: string; /*!< The passkey's id */
    rawId: string; /*!< The same id */
    type: 'public-key'; /*!< Always a public key */
    authenticatorAttachment: 'platform'; /*!< Held by the device itself */
    clientExtensionResults: Record<string, never>; /*!< No extension was asked for */
}

/**
 * @interface RegistrationAnswer
 * @description A new passkey, as `navigator.credentials.create()` gives it in JSON.
 *
 * @extends PasskeyAnswer
 */
interface RegistrationAnswer extends PasskeyAnswer {
    response: {
        clientDataJSON: string; /*!< What the browser signed over */
        attestationObject: string; /*!< The passkey's public key and flags */
        transports: string[]; /*!< How the passkey can be reached */
    }; /*!< The authenticator's answer */
}

/**
 * @interface AuthenticationAnswer
 * @description A signed challenge, as `navigator.credentials.get()` gives it in JSON.
 *
 * @extends PasskeyAnswer
 */
interface AuthenticationAnswer extends PasskeyAnswer {
    response: {
        clientDataJSON: string; /*!< What the browser signed over */
        authenticatorData: string; /*!< The relying party's hash, the flags and the counter */
        signature: string; /*!< The signature */
        userHandle: string; /*!< The owner's handle */
    }; /*!< The authenticator's answer */
}

/**
 * @interface AuthenticatorOptions
 * @description Who the stand-in authenticator says it is.
 */
interface AuthenticatorOptions {
    origin: string; /*!< The page it believes it is called from */
    aaguid?: string; /*!< Who it says it is */
}

/**
 * @class SoftwareAuthenticator
 * @description A passkey authenticator in software, holding one ES256 key, standing in for a password manager in tests: it
 * creates a passkey answer the way `navigator.credentials.create()` gives it in JSON, and signs challenges the way
 * `navigator.credentials.get()` does.
 */
export class SoftwareAuthenticator {
    readonly credentialId = randomBytes(16).toString('base64url'); /*!< The passkey's id */
    readonly rpId: string; /*!< The relying party it signs for: the host of the page it was created on */
    origin: string; /*!< The page it believes it is called from, which a phishing page would change */
    verifiesUser = true; /*!< Whether it reports the device's check (Face ID) as passed */
    private readonly privateKey: KeyObject; /*!< The passkey's private key */
    private readonly publicKey: KeyObject; /*!< The passkey's public key */
    private readonly counter = 0; /*!< Always zero, as a synced passkey keeps it */

    /**
     * @constructor
     * @description Creates the key
     *
     * @param {AuthenticatorOptions} options How it behaves
     */
    constructor(private readonly options: AuthenticatorOptions) {
        const pair = generateKeyPairSync('ec', { namedCurve: 'P-256' });

        this.origin = options.origin;
        this.rpId = new URL(options.origin).hostname;

        this.privateKey = pair.privateKey;
        this.publicKey = pair.publicKey;
    }

    /**
     * @method create
     * @description Creates the passkey for a registration challenge.
     */
    create(challenge: string): RegistrationAnswer {
        const jwk = this.publicKey.export({ format: 'jwk' });
        const coseKey = cbor(new Map<CborValue, CborValue>([
            [1, 2],
            [3, -7],
            [-1, 1],
            [-2, Buffer.from(jwk.x ?? '', 'base64url')],
            [-3, Buffer.from(jwk.y ?? '', 'base64url')]
        ]));
        const credentialId = Buffer.from(this.credentialId, 'base64url');
        const idLength = Buffer.alloc(2);

        idLength.writeUInt16BE(credentialId.length);

        const authenticatorData = Buffer.concat([
            this.header(0x40),
            Buffer.from((this.options.aaguid ?? '00000000-0000-0000-0000-000000000000').replace(/-/g, ''), 'hex'),
            idLength,
            credentialId,
            coseKey
        ]);
        const attestationObject = cbor(new Map<CborValue, CborValue>([
            ['fmt', 'none'],
            ['attStmt', new Map()],
            ['authData', authenticatorData]
        ]));

        return {
            id: this.credentialId,
            rawId: this.credentialId,
            type: 'public-key',
            response: {
                clientDataJSON: this.clientData('webauthn.create', challenge).toString('base64url'),
                attestationObject: attestationObject.toString('base64url'),
                transports: ['internal', 'hybrid']
            },
            authenticatorAttachment: 'platform',
            clientExtensionResults: {}
        };
    }

    /**
     * @method get
     * @description Signs a sign-in challenge.
     */
    get(challenge: string): AuthenticationAnswer {
        const authenticatorData = this.header(0);
        const clientData = this.clientData('webauthn.get', challenge);
        const signature = sign('sha256', Buffer.concat([authenticatorData, createHash('sha256').update(clientData).digest()]), this.privateKey);

        return {
            id: this.credentialId,
            rawId: this.credentialId,
            type: 'public-key',
            response: {
                clientDataJSON: clientData.toString('base64url'),
                authenticatorData: authenticatorData.toString('base64url'),
                signature: signature.toString('base64url'),
                userHandle: Buffer.from('owner').toString('base64url')
            },
            authenticatorAttachment: 'platform',
            clientExtensionResults: {}
        };
    }

    /**
     * @method header
     * @description The start of the authenticator data: the relying party's hash, the flags (user present, user verified
     * unless told otherwise, and backed up like a synced passkey) and the counter.
     */
    private header(extraFlags: number): Buffer {
        const flags = 0x01 | (this.verifiesUser ? 0x04 : 0) | 0x08 | 0x10 | extraFlags;
        const counter = Buffer.alloc(4);

        counter.writeUInt32BE(this.counter);

        return Buffer.concat([createHash('sha256').update(this.rpId).digest(), Buffer.from([flags]), counter]);
    }

    /**
     * @method clientData
     * @description The client data the browser would have signed over.
     */
    private clientData(type: string, challenge: string): Buffer {
        return Buffer.from(JSON.stringify({ type, challenge, origin: this.origin, crossOrigin: false }), 'utf8');
    }
}
