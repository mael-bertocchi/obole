import type { EditorRoute } from '@application/editor-context';
import { useDocument, useRates } from '@application/hooks';
import { useServices } from '@application/services';
import AlertComponent from '@components/alert';
import { CategoryIconComponent } from '@components/icon-tile';
import SheetComponent from '@components/sheet';
import SwitchComponent from '@components/switch';
import { latestLocation } from '@core/budget-math';
import { categoriesOf, categoryName } from '@core/categories';
import { CURRENCIES, EURO } from '@core/currencies';
import { atTime, dayKey, isFutureDay, parseDay, timeKey, withTimeOf } from '@core/dates';
import { euroPrecise, fieldDate, rate } from '@core/formatting';
import { t } from '@core/i18n';
import type { Operation } from '@core/models';
import { amountInputOf, deleteOperation, groupAmountInput, Limits, parseAmountInput, sanitizeAmountInput, toOperation, upsertOperation } from '@core/operations';
import { defaultCurrency, rememberCurrency } from '@core/preferences';
import { Globe, MapPin, Repeat, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type JSX, type ReactNode } from 'react';

/**
 * @constant FORM_ID
 * @description Ties the sheet's pinned Save button to its form.
 */
const FORM_ID = 'operation-form';

/**
 * @function ToggleRow
 * @description A setting with an icon, a title, a hint and a switch.
 */
function ToggleRow({ icon: Icon, title, hint, checked, onChange }: { icon: LucideIcon; title: string; hint: string; checked: boolean; onChange: (checked: boolean) => void }): JSX.Element {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-fill px-4 py-3">
            <Icon size={19} className="shrink-0 text-accent" />
            <span className="flex-1">
                <span className="block text-[15px]">{title}</span>
                <span className="block text-[12px] text-ink-secondary">{hint}</span>
            </span>
            <SwitchComponent checked={checked} onChange={onChange} label={title} />
        </div>
    );
}

/**
 * @function Field
 * @description A labelled field.
 */
function Field({ label, htmlFor, aside, children }: { label: string; htmlFor: string; aside?: string; children: ReactNode }): JSX.Element {
    return (
        <div>
            <div className="flex items-baseline justify-between">
                <label className="field-label" htmlFor={htmlFor}>{label}</label>
                {aside !== undefined && <span className="text-[13px] text-ink-tertiary">{aside}</span>}
            </div>
            {children}
        </div>
    );
}

/**
 * @function OperationForm
 * @description The editor, mounted fresh each time the sheet opens. A foreign amount is priced at the rate of its own
 * day, markup included, and can't be saved until that rate is known: a guessed rate never passes for a published one.
 */
function OperationForm({ existing, onDone, onDelete, onValidityChange }: { existing: Operation | null; onDone: () => void; onDelete: () => void; onValidityChange: (isValid: boolean) => void }): JSX.Element {
    const document = useDocument();
    const rates = useRates();
    const { store } = useServices();
    const categories = categoriesOf(document.categories);
    const now = new Date();

    const [amountText, setAmountText] = useState(existing === null ? '' : amountInputOf(existing.amount));
    const [currencyCode, setCurrencyCode] = useState(existing?.currencyCode ?? defaultCurrency());
    const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? '');
    const [name, setName] = useState(existing?.name ?? '');
    const [description, setDescription] = useState(existing?.description ?? '');
    const [location, setLocation] = useState(existing === null ? latestLocation(document.operations) ?? '' : existing.location ?? '');
    const [date, setDate] = useState(existing?.date ?? now);
    const [isOnline, setIsOnline] = useState(existing?.isOnline ?? false);
    const [isRecurring, setIsRecurring] = useState(existing?.isRecurring ?? false);

    const day = dayKey(date);
    const isForeign = currencyCode !== EURO.code;
    const amount = parseAmountInput(amountText);
    const storedRate = existing !== null && existing.currencyCode === currencyCode && dayKey(existing.date) === day ? existing.rateToEuro : null;
    const appliedRate = rates.rate(currencyCode, day) ?? storedRate;
    const isValid = amount !== null && name.trim() !== '' && categoryId !== '' && appliedRate !== null;

    useEffect(() => {
        if (isForeign) {
            void rates.load(day);
        }
    }, [rates, day, isForeign]);

    useEffect(() => {
        onValidityChange(isValid);
    }, [isValid, onValidityChange]);

    /**
     * @function settle
     * @description Dates the operation, at the latest now: like the app's picker, the future is out of reach.
     */
    const settle = (picked: Date): void => {
        setDate(picked.getTime() > now.getTime() ? now : picked);
    };

    /**
     * @function pickDay
     * @description Moves the operation to another day, at the time of day it already holds.
     */
    const pickDay = (value: string): void => {
        const picked = parseDay(value, now);

        if (picked !== null && !isFutureDay(picked, now)) {
            settle(withTimeOf(picked, date));
        }
    };

    /**
     * @function pickTime
     * @description Moves the operation to another time of day, on its day.
     */
    const pickTime = (value: string): void => {
        const picked = atTime(date, value);

        if (picked !== null) {
            settle(picked);
        }
    };

    /**
     * @function save
     * @description Stores the operation. An edit to one deleted on the phone in the meantime is dropped, with a notice.
     */
    const save = (): void => {
        if (!isValid || amount === null || appliedRate === null) {
            return;
        }

        const operation = toOperation({ name, description, amount, currencyCode, categoryId, date, location, isOnline, isRecurring }, appliedRate, existing?.id);

        store.apply((current) => {
            if (existing !== null && !current.operations.some((candidate) => candidate.id === existing.id)) {
                throw new Error(t('operation.deletedElsewhere'));
            }

            return upsertOperation(current, operation);
        });
        rememberCurrency(currencyCode);
        onDone();
    };

    let rateLine = rates.failure(day) ?? t('operation.loadingRate');

    if (appliedRate !== null) {
        rateLine = t('operation.rate', { rate: rate(appliedRate) });
    }

    return (
        <form
            id={FORM_ID}
            onSubmit={(event) => {
                event.preventDefault();
                save();
            }}
            className="space-y-5"
        >
            <div className="flex flex-col items-center pb-2 pt-1">
                <label htmlFor="amount" className="eyebrow">{t('operation.amount')}</label>
                <div className="mt-2 flex items-center gap-2">
                    <input
                        id="amount"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder={groupAmountInput('0.00')}
                        value={amountText}
                        onChange={(event) => setAmountText(groupAmountInput(sanitizeAmountInput(event.target.value)))}
                        style={{ width: `${Math.max(4, amountText.length) * 0.6 + 0.3}em` }}
                        className="bg-transparent text-right text-[46px] font-semibold tracking-tight tabular-nums outline-none placeholder:text-ink-quaternary"
                    />
                    <select
                        aria-label={t('operation.currency')}
                        value={currencyCode}
                        onChange={(event) => setCurrencyCode(event.target.value)}
                        className="h-9 cursor-pointer rounded-xl bg-fill px-2.5 text-[15px] font-semibold outline-none transition hover:bg-fill-strong focus:ring-2 focus:ring-accent/40"
                    >
                        {CURRENCIES.map((currency) => (
                            <option key={currency.code} value={currency.code}>{currency.code}</option>
                        ))}
                    </select>
                </div>
                {isForeign && (
                    <div className="mt-1 text-center">
                        {appliedRate !== null && amount !== null && <p className="text-[15px] font-medium text-accent tabular-nums">{euroPrecise(amount * appliedRate)}</p>}
                        <p className={`text-[12px] ${appliedRate === null ? 'text-warning-text' : 'text-ink-tertiary'}`}>{rateLine}</p>
                    </div>
                )}
            </div>

            <div className="border-t border-hairline pt-5">
                <p className="field-label">{t('operation.category')}</p>
                <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-5">
                    {categories.map((category) => {
                        const isSelected = category.id === categoryId;

                        return (
                            <button
                                key={category.id}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => setCategoryId(category.id)}
                                className="group flex flex-col items-center gap-1.5 rounded-2xl py-1 focus-visible:outline-none"
                            >
                                <span className={`rounded-[16px] p-[3px] ring-2 transition ${isSelected ? 'ring-accent' : 'ring-transparent group-hover:ring-fill-strong group-focus-visible:ring-accent/50'}`}>
                                    <CategoryIconComponent category={category} size={44} />
                                </span>
                                <span className={`w-full truncate text-center text-[12px] transition ${isSelected ? 'font-semibold text-accent' : 'font-medium text-ink-secondary'}`}>{categoryName(category)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <Field label={t('operation.name')} htmlFor="name">
                <input id="name" className="field" value={name} maxLength={Limits.name} onChange={(event) => setName(event.target.value)} placeholder={t('operation.namePlaceholder')} autoComplete="off" />
            </Field>

            <Field label={t('operation.description')} htmlFor="description">
                <textarea id="description" className="field min-h-[76px] resize-none py-2.5 leading-snug" value={description} maxLength={Limits.description} onChange={(event) => setDescription(event.target.value)} placeholder={t('operation.descriptionPlaceholder')} rows={2} />
            </Field>

            <Field label={t('operation.date')} htmlFor="date" aside={fieldDate(date, now)}>
                <div className="flex gap-2">
                    <input id="date" type="date" className="field min-w-0 flex-1" value={day} max={dayKey(now)} onChange={(event) => pickDay(event.target.value)} />
                    <input type="time" aria-label={t('operation.time')} className="field w-28 shrink-0" value={timeKey(date)} onChange={(event) => pickTime(event.target.value)} />
                </div>
            </Field>

            <ToggleRow icon={Globe} title={t('operation.online')} hint={t('operation.onlineHint')} checked={isOnline} onChange={setIsOnline} />

            {!isOnline && (
                <Field label={t('operation.location')} htmlFor="location">
                    <div className="relative">
                        <MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-accent" />
                        <input id="location" className="field pl-9" value={location} maxLength={Limits.location} onChange={(event) => setLocation(event.target.value)} placeholder={t('operation.locationPlaceholder')} />
                    </div>
                </Field>
            )}

            <ToggleRow icon={Repeat} title={t('operation.recurring')} hint={t('operation.recurringHint')} checked={isRecurring} onChange={setIsRecurring} />

            {existing !== null && (
                <button type="button" onClick={onDelete} className="w-full py-2 text-[15px] font-medium text-negative-text transition hover:opacity-70">{t('operation.delete')}</button>
            )}
        </form>
    );
}

/**
 * @function OperationSheet
 * @description The New operation and Edit operation sheet, with its delete confirmation.
 */
function OperationSheet({ route, onClose }: { route: EditorRoute | null; onClose: () => void }): JSX.Element {
    const document = useDocument();
    const { store } = useServices();
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [canSave, setCanSave] = useState(false);
    const existing = route?.kind === 'edit' ? document.operations.find((operation) => operation.id === route.id) ?? null : null;
    const isMissing = route?.kind === 'edit' && existing === null;

    /**
     * @function confirmDelete
     * @description Deletes the operation once confirmed.
     */
    const confirmDelete = (): void => {
        if (existing !== null) {
            store.apply((current) => deleteOperation(current, existing.id));
        }

        setIsConfirmingDelete(false);
        onClose();
    };

    return (
        <>
            <SheetComponent
                open={route !== null}
                title={route?.kind === 'edit' ? t('operation.edit') : t('operation.new')}
                onClose={onClose}
                footer={isMissing ? undefined : <button type="submit" form={FORM_ID} disabled={!canSave} className="button-primary">{route?.kind === 'edit' ? t('operation.saveChanges') : t('operation.save')}</button>}
            >
                {isMissing
                    ? <p className="py-10 text-center text-[15px] text-ink-secondary">{t('operation.missing')}</p>
                    : <OperationForm key={route?.kind === 'edit' ? route.id : 'new'} existing={existing} onDone={onClose} onDelete={() => setIsConfirmingDelete(true)} onValidityChange={setCanSave} />}
            </SheetComponent>
            <AlertComponent
                open={isConfirmingDelete}
                title={t('operation.confirmDelete')}
                message={t('common.irreversible')}
                action={t('operation.deleteAction')}
                onConfirm={confirmDelete}
                onCancel={() => setIsConfirmingDelete(false)}
            />
        </>
    );
}

export default OperationSheet;
