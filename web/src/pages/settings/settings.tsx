import { useBudget, useDocument, useRates } from '@application/hooks';
import { useServices } from '@application/services';
import { useSession } from '@application/session-context';
import AlertComponent from '@components/alert';
import { IconTileComponent } from '@components/icon-tile';
import SyncBadgeComponent from '@components/sync-badge';
import { DEFAULT_CATEGORIES } from '@core/categories';
import { BANK_MARKUP, bankRate, CURRENCIES, currencyName, EURO } from '@core/currencies';
import { euro, percent, rate } from '@core/formatting';
import type { LanguageChoice } from '@core/i18n';
import { chooseLanguage, LANGUAGES, languageChoice, t } from '@core/i18n';
import { defaultCurrency, rememberCurrency } from '@core/preferences';
import LimitsSheet from '@pages/budget/limits-sheet';
import { ChevronRight, Euro, Languages, LayoutGrid, List, LogOut, RefreshCw, Target, Trash2 } from 'lucide-react';
import { useState, type JSX, type ReactNode } from 'react';

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
 * @function Group
 * @description A titled group of rows, like a section of the iOS Settings app.
 */
function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }): JSX.Element {
    return (
        <section className="mt-8 first:mt-0">
            <h2 className="eyebrow px-4 pb-2">{title}</h2>
            <div className="card divide-y divide-hairline overflow-hidden">{children}</div>
            {note !== undefined && <p className="px-4 pt-2 text-[13px] text-ink-secondary">{note}</p>}
        </section>
    );
}

/**
 * @function Row
 * @description One row: an icon, a title, and whatever sits on its right.
 */
function Row({ icon, title, children, onClick, destructive = false }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; onClick?: () => void; destructive?: boolean }): JSX.Element {
    const content = (
        <>
            {icon}
            <span className={`flex-1 text-[15px] ${destructive ? 'text-negative-text' : ''}`}>{title}</span>
            {children}
        </>
    );

    if (onClick === undefined) {
        return <div className="flex min-h-[52px] items-center gap-3 px-4 py-2.5">{content}</div>;
    }

    return (
        <button type="button" onClick={onClick} className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-fill/60">
            {content}
        </button>
    );
}

/**
 * @function SettingsPage
 * @description The Settings tab: the session and its sync state, the budget and limits, the default currency, the
 * exchange rates and what the budget holds.
 */
function SettingsPage(): JSX.Element {
    const document = useDocument();
    const { status } = useBudget();
    const rates = useRates();
    const { store } = useServices();
    const { signOut } = useSession();
    const [showLimits, setShowLimits] = useState(false);
    const [currency, setCurrency] = useState(defaultCurrency);
    const [language, setLanguage] = useState(languageChoice);
    const [confirming, setConfirming] = useState<'reset' | 'signOut' | null>(null);
    const latest = rates.latest;

    /**
     * @function reset
     * @description Deletes every operation and puts the budget back to its defaults, as the app's Reset does.
     */
    const reset = (): void => {
        store.apply(() => ({
            categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
            operations: [],
            budget: { monthlyLimit: 3000 },
            budgetHistory: {}
        }));
        setConfirming(null);
    };

    return (
        <div className="mx-auto max-w-2xl animate-rise">
            <p className="eyebrow">{t('settings.eyebrow')}</p>
            <h1 className="mb-8 mt-1 text-[34px] font-semibold leading-tight tracking-tight">{t('settings.title')}</h1>

            <Group title={t('settings.account')}>
                <Row icon={<IconTileComponent icon={RefreshCw} color={ACCENT} size={30} />} title={t('settings.sync')}>
                    <SyncBadgeComponent status={status} />
                </Row>
                <Row icon={<IconTileComponent icon={LogOut} color={NEGATIVE} size={30} />} title={t('settings.signOut')} destructive onClick={() => setConfirming('signOut')} />
            </Group>

            <Group title={t('settings.budget')}>
                <Row icon={<IconTileComponent icon={Target} color={ACCENT} size={30} />} title={t('settings.budgetAndLimits')} onClick={() => setShowLimits(true)}>
                    <span className="text-[15px] text-ink-secondary tabular-nums">{euro(document.budget.monthlyLimit)}</span>
                    <ChevronRight size={17} className="text-ink-quaternary" />
                </Row>
            </Group>

            <Group title={t('settings.entry')}>
                <Row icon={<IconTileComponent icon={Euro} color={ACCENT} size={30} />} title={<label htmlFor="default-currency">{t('settings.defaultCurrency')}</label>}>
                    <select
                        id="default-currency"
                        value={currency}
                        onChange={(event) => {
                            setCurrency(event.target.value);
                            rememberCurrency(event.target.value);
                        }}
                        className="cursor-pointer rounded-lg bg-transparent py-1 text-right text-[15px] text-ink-secondary outline-none focus:ring-2 focus:ring-accent/40"
                    >
                        {CURRENCIES.map((option) => <option key={option.code} value={option.code}>{option.code}</option>)}
                    </select>
                </Row>
            </Group>

            <Group title={t('settings.general')}>
                <Row icon={<IconTileComponent icon={Languages} color={ACCENT} size={30} />} title={<label htmlFor="language">{t('settings.language')}</label>}>
                    <select
                        id="language"
                        value={language}
                        onChange={(event) => {
                            const next = event.target.value as LanguageChoice;

                            setLanguage(next);
                            chooseLanguage(next);
                        }}
                        className="cursor-pointer rounded-lg bg-transparent py-1 text-right text-[15px] text-ink-secondary outline-none focus:ring-2 focus:ring-accent/40"
                    >
                        <option value="automatic">{t('settings.automatic')}</option>
                        {LANGUAGES.map((option) => <option key={option.code} value={option.code} lang={option.code}>{option.name}</option>)}
                    </select>
                </Row>
            </Group>

            <Group title={t('settings.exchangeRates')} note={t('settings.markup', { markup: percent(BANK_MARKUP) })}>
                {CURRENCIES.filter((option) => option.code !== EURO.code).map((option) => {
                    const reference = latest?.rates[option.code];

                    return (
                        <Row key={option.code} title={<span><span className="font-mono text-[14px] font-medium">{option.code}</span> <span className="ml-1.5 text-ink-secondary">{currencyName(option)}</span></span>}>
                            <span className="text-[14px] text-ink-secondary tabular-nums">{reference === undefined ? '•' : `1 ${option.code} = ${rate(bankRate(reference, option.code))} €`}</span>
                        </Row>
                    );
                })}
            </Group>

            <Group title={t('settings.data')}>
                <Row icon={<IconTileComponent icon={List} color={ACCENT} size={30} />} title={t('settings.operations')}>
                    <span className="text-[15px] text-ink-secondary tabular-nums">{document.operations.length}</span>
                </Row>
                <Row icon={<IconTileComponent icon={LayoutGrid} color={ACCENT} size={30} />} title={t('settings.categories')}>
                    <span className="text-[15px] text-ink-secondary tabular-nums">{document.categories.length}</span>
                </Row>
                <Row icon={<IconTileComponent icon={Trash2} color={NEGATIVE} size={30} />} title={t('settings.reset')} destructive onClick={() => setConfirming('reset')} />
            </Group>

            <p className="mt-10 text-center text-[12px] text-ink-quaternary">Obole Web {__APP_VERSION__}</p>

            <LimitsSheet open={showLimits} onClose={() => setShowLimits(false)} />
            <AlertComponent
                open={confirming === 'reset'}
                title={t('settings.confirmReset')}
                message={t('settings.resetMessage')}
                action={t('settings.resetAction')}
                onConfirm={reset}
                onCancel={() => setConfirming(null)}
            />
            <AlertComponent
                open={confirming === 'signOut'}
                title={t('settings.confirmSignOut')}
                message={t('settings.signOutMessage')}
                action={t('settings.signOut')}
                onConfirm={() => {
                    setConfirming(null);
                    void signOut();
                }}
                onCancel={() => setConfirming(null)}
            />
        </div>
    );
}

export default SettingsPage;
