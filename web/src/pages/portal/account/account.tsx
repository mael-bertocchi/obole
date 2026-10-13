import AlertComponent from 'components/alert/alert';
import FrameComponent from 'components/frame/frame';
import IconTileComponent from 'components/icon-tile/icon-tile';
import ListGroupComponent from 'components/list-group/list-group';
import ListRowComponent from 'components/list-row/list-row';
import SpinnerComponent from 'components/spinner/spinner';
import { KeyRound, Languages, LogOut, Plus, Trash2 } from 'lucide-react';
import type { Maybe } from 'models';
import { useIdentityContext } from 'modules/identity/identity-hooks';
import type { Passkey } from 'modules/identity/identity-models';
import type { IdentityContextProps } from 'modules/identity/identity-models';
import { createPasskey, forgetPasskey, PasskeyError, passkeyName } from 'modules/identity/identity-passkeys';
import identityService from 'modules/identity/identity-service';
import { chooseLanguage, currentLanguage, isLanguageChoice, LANGUAGES, languageChoice, t } from 'modules/language/language-service';
import { useToastContext } from 'modules/toast/toast-hooks';
import type { ToastContextProps } from 'modules/toast/toast-models';
import { useEffect, useState, type JSX } from 'react';
import { messageOf } from 'utils/tools';

/**
 * @constant ACCENT
 * @description The colour of the plain setting tiles.
 */
const ACCENT = '#6E56CF';

/**
 * @constant NEGATIVE
 * @description The colour of the destructive setting tiles.
 */
const NEGATIVE = '#FF3B30';

/**
 * @function day
 * @description A date, written in the page's language.
 */
function day(date: Date): string {
    return new Intl.DateTimeFormat(currentLanguage(), { dateStyle: 'medium' }).format(date);
}

/**
 * @interface PasskeyRowComponentProps
 * @description Properties of one passkey row
 */
interface PasskeyRowComponentProps {
    passkey: Passkey; /*!< The passkey */
    canRemove: boolean; /*!< Whether it may be removed, which the last one may not */
    onRemove: () => void; /*!< Called to remove it */
}

/**
 * @function PasskeyRowComponent
 * @description One passkey: where it lives, when it was created and last used, and a button to remove it unless it is
 * the last one.
 *
 * @param {PasskeyRowComponentProps} props The properties of the component
 */
function PasskeyRowComponent(props: PasskeyRowComponentProps): JSX.Element {
    const name = passkeyName(props.passkey);
    const used = props.passkey.lastUsedAt === null ? t('account.neverUsed') : t('account.lastUsed', { date: day(props.passkey.lastUsedAt) });

    return (
        <ListRowComponent
            icon={<IconTileComponent icon={KeyRound} color={ACCENT} size={30} />}
            title={
                <span className='block'>
                    <span className='flex items-center gap-2'>
                        {name}
                        {props.passkey.backedUp && (
                            <span className='rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent'>
                                {t('account.synced')}
                            </span>
                        )}
                    </span>
                    <span className='block text-[13px] text-ink-secondary'>
                        {t('account.created', { date: day(props.passkey.createdAt) })} • {used}
                    </span>
                </span>
            }
        >
            {props.canRemove && (
                <button type='button' onClick={props.onRemove} aria-label={t('account.removePasskey', { name })} className='flex h-8 w-8 items-center justify-center rounded-full text-ink-tertiary transition hover:bg-negative-soft hover:text-negative-text'>
                    <Trash2 size={17} />
                </button>
            )}
        </ListRowComponent>
    );
}

/**
 * @function AccountPage
 * @description The portal's account settings: the passkeys that open it (add one, remove one), the language every app
 * speaks, and signing out.
 */
function AccountPage(): JSX.Element {
    const { signOut }: IdentityContextProps = useIdentityContext();
    const { showToast }: ToastContextProps = useToastContext();
    const [passkeys, setPasskeys] = useState<Maybe<Passkey[]>>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [removing, setRemoving] = useState<Maybe<Passkey>>(null);
    const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);
    const [language, setLanguage] = useState(languageChoice);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        let isCurrent = true;

        identityService.getPasskeys().then((found: Passkey[]) => {
            if (isCurrent) {
                setPasskeys(found);
            }
        }).catch((failure: unknown) => showToast(messageOf(failure)));

        return () => {
            isCurrent = false;
        };
    }, [showToast, revision]);

    /**
     * @function add
     * @description Creates another passkey and stores it.
     */
    const add = async (): Promise<void> => {
        setIsAdding(true);

        try {
            await identityService.addPasskey(await createPasskey(await identityService.getPasskeyOptions()));
            showToast(t('account.passkeyAdded'));
            setRevision((current) => current + 1);
        } catch (failure: unknown) {
            if (!(failure instanceof PasskeyError && failure.isCancelled)) {
                showToast(messageOf(failure));
            }
        } finally {
            setIsAdding(false);
        }
    };

    /**
     * @function remove
     * @description Forgets a passkey on the server, then asks the password manager to forget it too.
     */
    const remove = async (passkey: Passkey): Promise<void> => {
        setRemoving(null);

        try {
            await identityService.removePasskey(passkey.id);
            forgetPasskey(passkey.id);
            setRevision((current) => current + 1);
        } catch (failure: unknown) {
            showToast(messageOf(failure));
        }
    };

    return (
        <FrameComponent>
            <div className='animate-rise'>
                <p className='eyebrow'>{t('account.eyebrow')}</p>
                <h1 className='mb-8 mt-1 text-[34px] font-semibold leading-tight tracking-tight'>
                    {t('account.title')}
                </h1>

                <ListGroupComponent title={t('account.passkeys')} note={t('account.passkeysNote')}>
                    {passkeys === null ? (
                        <div className='flex min-h-[52px] items-center justify-center'><SpinnerComponent /></div>
                    ) : (
                        passkeys.map((passkey) => (
                            <PasskeyRowComponent key={passkey.id} passkey={passkey} canRemove={passkeys.length > 1} onRemove={() => setRemoving(passkey)} />
                        ))
                    )}
                    <ListRowComponent icon={<IconTileComponent icon={Plus} color={ACCENT} size={30} />} title={<span className='text-accent'>{t('account.addPasskey')}</span>} onClick={() => void add()} disabled={isAdding}>
                        {isAdding && <SpinnerComponent size={18} />}
                    </ListRowComponent>
                </ListGroupComponent>

                <ListGroupComponent title={t('account.general')}>
                    <ListRowComponent icon={<IconTileComponent icon={Languages} color={ACCENT} size={30} />} title={<label htmlFor='language'>{t('account.language')}</label>}>
                        <select
                            id='language'
                            value={language}
                            onChange={(event) => {
                                const next = event.target.value;

                                if (!isLanguageChoice(next)) {
                                    return;
                                }

                                setLanguage(next);
                                chooseLanguage(next);
                            }}
                            className='cursor-pointer rounded-lg bg-transparent py-1 text-right text-[15px] text-ink-secondary outline-none focus:ring-2 focus:ring-accent/40'
                        >
                            <option value='automatic'>{t('account.automatic')}</option>
                            {LANGUAGES.map((option) => (
                                <option key={option.code} value={option.code} lang={option.code}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                    </ListRowComponent>
                </ListGroupComponent>

                <ListGroupComponent title={t('account.session')}>
                    <ListRowComponent icon={<IconTileComponent icon={LogOut} color={NEGATIVE} size={30} />} title={t('account.signOut')} destructive onClick={() => setIsConfirmingSignOut(true)} />
                </ListGroupComponent>

                <p className='mt-10 text-center text-[12px] text-ink-quaternary'>Obole Web {__APP_VERSION__}</p>

                <AlertComponent
                    open={removing !== null}
                    title={t('account.confirmRemove')}
                    message={t('account.removeMessage')}
                    action={t('account.removeAction')}
                    onConfirm={() => {
                        if (removing !== null) {
                            void remove(removing);
                        }
                    }}
                    onCancel={() => setRemoving(null)}
                />
                <AlertComponent
                    open={isConfirmingSignOut}
                    title={t('account.confirmSignOut')}
                    message={t('account.signOutMessage')}
                    action={t('account.signOut')}
                    onConfirm={() => {
                        setIsConfirmingSignOut(false);
                        void signOut();
                    }}
                    onCancel={() => setIsConfirmingSignOut(false)}
                />
            </div>
        </FrameComponent>
    );
}

export default AccountPage;
