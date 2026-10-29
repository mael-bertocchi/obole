import FrameActionComponent from 'components/frame-action/frame-action';
import FrameComponent from 'components/frame/frame';
import RatingComponent from 'components/rating/rating';
import SpinnerComponent from 'components/spinner/spinner';
import { ArrowUp, SquarePen } from 'lucide-react';
import type { Maybe } from 'models';
import type { ProposalServices } from 'modules/assistant/assistant-actions';
import { applyProposal } from 'modules/assistant/assistant-actions';
import { useAppAvailability } from 'modules/apps/apps-hooks';
import { assistant } from 'modules/assistant/assistant-manifest';
import type { AssistantOperationDraft, ConversationMessage, Proposal, ProposalEntry, ProposalStatus } from 'modules/assistant/assistant-models';
import assistantService from 'modules/assistant/assistant-service';
import { categoriesOf, categoryName, categoryOrFallback } from 'modules/budget/budget-categories';
import { currencyNamed } from 'modules/budget/budget-currencies';
import { dayKey, parseDayKey } from 'modules/budget/budget-dates';
import { money, relativeDay } from 'modules/budget/budget-formatting';
import { useBudget, useBudgetContext, useCatchUp } from 'modules/budget/budget-hooks';
import type { BudgetServices, Category } from 'modules/budget/budget-models';
import { BudgetProvider } from 'modules/budget/budget-provider';
import type { MessageKey } from 'modules/language/language-en';
import { t } from 'modules/language/language-service';
import { useToastContext } from 'modules/toast/toast-hooks';
import type { ToastContextProps } from 'modules/toast/toast-models';
import { useWatchlistContext } from 'modules/watchlist/watchlist-hooks';
import { WatchlistProvider } from 'modules/watchlist/watchlist-provider';
import { ratingText } from 'modules/watchlist/watchlist-formatting';
import { useEffect, useRef, useState, type FormEvent, type JSX, type KeyboardEvent } from 'react';
import { messageOf } from 'utils/errors';

/**
 * @constant PROPOSAL_TITLES
 * @description What each kind of suggestion is called on its card
 */
const PROPOSAL_TITLES: Record<Proposal['kind'], MessageKey> = {
    createOperation: 'assistant.proposeCreate',
    updateOperation: 'assistant.proposeUpdate',
    deleteOperation: 'assistant.proposeDelete',
    rateTitle: 'assistant.proposeRate'
};

/**
 * @function dayLabel
 * @description A day written as `YYYY-MM-DD`, the way the budget writes dates
 *
 * @param {string} day The day
 * @returns {string} How it reads
 */
function dayLabel(day: string): string {
    const parsed = parseDayKey(day);

    return parsed === null ? day : relativeDay(parsed);
}

/**
 * @interface DraftLinesComponentProps
 * @description Properties of the lines describing an operation
 */
interface DraftLinesComponentProps {
    draft: AssistantOperationDraft; /*!< The operation */
    categories: readonly Category[]; /*!< The budget's categories, to name its own */
}

/**
 * @function DraftLinesComponent
 * @description An operation in two lines: its name and amount, then its category, day and place
 *
 * @param {DraftLinesComponentProps} props The properties of the component
 */
function DraftLinesComponent(props: DraftLinesComponentProps): JSX.Element {
    const facts = [categoryName(categoryOrFallback(props.categories, props.draft.categoryId)), dayLabel(props.draft.date), props.draft.location ?? null];

    return (
        <div>
            <p className='flex items-baseline justify-between gap-3'>
                <span className='truncate text-[16px] font-semibold tracking-tight'>{props.draft.name}</span>
                <span className='shrink-0 text-[16px] font-semibold tabular-nums'>{money(props.draft.amount, currencyNamed(props.draft.currencyCode))}</span>
            </p>
            <p className='text-[13px] text-ink-tertiary'>{facts.filter((fact) => fact !== null && fact !== '').join(' • ')}</p>
            {props.draft.description !== undefined && props.draft.description !== null && props.draft.description !== '' && (
                <p className='mt-1 text-[14px] text-ink-secondary'>{props.draft.description}</p>
            )}
        </div>
    );
}

/**
 * @interface ProposalBodyComponentProps
 * @description Properties of what a suggestion says
 */
interface ProposalBodyComponentProps {
    proposal: Proposal; /*!< The suggestion */
    categories: readonly Category[]; /*!< The budget's categories */
}

/**
 * @function ProposalBodyComponent
 * @description What a suggestion would do: the operation to log, the operation before and after a change, the
 * operation to delete, or the rating to give
 *
 * @param {ProposalBodyComponentProps} props The properties of the component
 */
function ProposalBodyComponent(props: ProposalBodyComponentProps): JSX.Element {
    const { proposal } = props;

    if (proposal.kind === 'createOperation') {
        return <DraftLinesComponent draft={proposal.draft} categories={props.categories} />;
    }

    if (proposal.kind === 'rateTitle') {
        return (
            <div>
                <p className='text-[16px] font-semibold tracking-tight'>{proposal.title}</p>
                <div className='mt-1 flex items-center gap-3'>
                    <RatingComponent value={proposal.rating} label={ratingText(proposal.rating)} size={15} />
                    <span className='text-[12px] text-ink-tertiary'>{t('assistant.watchedOn', { date: dayLabel(proposal.watchedAt) })}</span>
                </div>
                {proposal.comment !== null && <p className='mt-1 text-[14px] text-ink-secondary'>{proposal.comment}</p>}
            </div>
        );
    }

    const before: AssistantOperationDraft = {
        date: dayKey(proposal.operation.date),
        name: proposal.operation.name,
        categoryId: proposal.operation.categoryId,
        amount: proposal.operation.amount,
        currencyCode: proposal.operation.currencyCode
    };

    if (proposal.kind === 'deleteOperation') {
        return (
            <div>
                <DraftLinesComponent draft={before} categories={props.categories} />
                <p className='mt-2 text-[13px] text-ink-secondary'>{t('assistant.deleteNote')}</p>
            </div>
        );
    }

    return (
        <div className='space-y-2'>
            <div className='opacity-50 line-through decoration-ink-quaternary'>
                <DraftLinesComponent draft={before} categories={props.categories} />
            </div>
            <DraftLinesComponent draft={{ ...before, ...proposal.changes }} categories={props.categories} />
        </div>
    );
}

/**
 * @interface ProposalCardComponentProps
 * @description Properties of a suggestion's card
 */
interface ProposalCardComponentProps {
    entry: ProposalEntry; /*!< The suggestion and where it stands */
    categories: readonly Category[]; /*!< The budget's categories */
    onConfirm: () => void; /*!< Called when the owner confirms it */
    onDismiss: () => void; /*!< Called when the owner sets it aside */
}

/**
 * @function ProposalCardComponent
 * @description A suggestion, with what it would do and the owner's two choices: nothing happens until they confirm it
 *
 * @param {ProposalCardComponentProps} props The properties of the component
 */
function ProposalCardComponent(props: ProposalCardComponentProps): JSX.Element {
    const { status } = props.entry;
    const settled: Partial<Record<ProposalStatus, string>> = { applied: t('assistant.applied'), dismissed: t('assistant.dismissed') };

    return (
        <div className={`card p-4 ${status === 'dismissed' ? 'opacity-60' : ''}`}>
            <p className='eyebrow'>{t(PROPOSAL_TITLES[props.entry.proposal.kind])}</p>
            <div className='mt-2'>
                <ProposalBodyComponent proposal={props.entry.proposal} categories={props.categories} />
            </div>
            {props.entry.error !== undefined && <p className='mt-2 text-[13px] text-warning-text'>{props.entry.error}</p>}
            <div className='mt-3 flex items-center justify-end gap-2'>
                {settled[status] !== undefined ? (
                    <span className='text-[14px] font-medium text-ink-secondary'>{settled[status]}</span>
                ) : (
                    <>
                        <button type='button' disabled={status === 'applying'} onClick={props.onDismiss} className='rounded-full px-4 py-1.5 text-[14px] font-medium text-ink-secondary transition hover:bg-fill disabled:opacity-50'>
                            {t('assistant.dismiss')}
                        </button>
                        <button type='button' disabled={status === 'applying'} onClick={props.onConfirm} className='rounded-full bg-accent px-4 py-1.5 text-[14px] font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50'>
                            {t('assistant.confirm')}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * @interface MessageComponentProps
 * @description Properties of one message of the conversation
 */
interface MessageComponentProps {
    message: ConversationMessage; /*!< The message */
    categories: readonly Category[]; /*!< The budget's categories */
    onSettle: (index: number, status: ProposalStatus, error?: string) => void; /*!< Records where one of its suggestions stands */
    services: ProposalServices; /*!< What carrying out a suggestion goes through */
}

/**
 * @function MessageComponent
 * @description One message: the owner's on the right, the assistant's on the left with its suggestions under it
 *
 * @param {MessageComponentProps} props The properties of the component
 */
function MessageComponent(props: MessageComponentProps): JSX.Element {
    const isOwner = props.message.role === 'user';

    /**
     * @function confirm
     * @description Carries out one of the message's suggestions, recording how it went
     */
    const confirm = async (index: number, proposal: Proposal): Promise<void> => {
        props.onSettle(index, 'applying');

        try {
            await applyProposal(props.services, proposal);
            props.onSettle(index, 'applied');
        } catch (error: unknown) {
            props.onSettle(index, 'failed', messageOf(error));
        }
    };

    return (
        <div className={`flex flex-col gap-2 ${isOwner ? 'items-end' : 'items-start'}`}>
            {props.message.text !== '' && (
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${isOwner ? 'bg-accent text-white' : 'bg-fill text-ink'}`}>{props.message.text}</p>
            )}
            {props.message.proposals.map((entry, index) => (
                <div key={index} className='w-full max-w-md'>
                    <ProposalCardComponent entry={entry} categories={props.categories} onConfirm={() => void confirm(index, entry.proposal)} onDismiss={() => props.onSettle(index, 'dismissed')} />
                </div>
            ))}
        </div>
    );
}

/**
 * @function AssistantShellComponent
 * @description The conversation: the messages so far, the assistant thinking, and the field to write the next one. The
 * budget is kept in step so a confirmed suggestion lands on the latest one. While the server says the assistant can't
 * answer, the field is greyed out and the page says why. The field stays pinned to the bottom of the screen.
 *
 * @returns {JSX.Element} The assistant
 */
function AssistantShellComponent(): JSX.Element {
    const budgetServices: BudgetServices = useBudgetContext();
    const watchlist = useWatchlistContext();
    const { document } = useBudget();
    const { showToast }: ToastContextProps = useToastContext();
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<Maybe<string>>(null);
    const end = useRef<HTMLDivElement>(null);
    const categories = categoriesOf(document?.categories ?? []);
    const services: ProposalServices = { budget: budgetServices, watchlist };
    const availability = useAppAvailability(assistant);

    useCatchUp(budgetServices);
    useEffect(() => budgetServices.store.onRejected(showToast), [budgetServices, showToast]);
    useEffect(() => {
        void end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isThinking]);

    /**
     * @function settle
     * @description Records where one suggestion of one message stands
     */
    const settle = (messageId: string, index: number, status: ProposalStatus, reason?: string): void => {
        setMessages((current) => current.map((message) => (message.id !== messageId ? message : { ...message, proposals: message.proposals.map((entry, position) => (position === index ? { ...entry, status, error: reason } : entry)) })));
    };

    /**
     * @function send
     * @description Sends the owner's message with the conversation so far, and shows the answer
     */
    const send = async (): Promise<void> => {
        const text = draft.trim();

        if (text === '' || isThinking || !availability.isAvailable) {
            return;
        }

        const next: ConversationMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user', text, proposals: [] }];

        setMessages(next);
        setDraft('');
        setError(null);
        setIsThinking(true);

        try {
            const reply = await assistantService.sendConversation(next);

            setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: reply.text, proposals: reply.proposals.map((proposal) => ({ proposal, status: 'pending' })) }]);
        } catch (failure: unknown) {
            setError(messageOf(failure));
        } finally {
            setIsThinking(false);
        }
    };

    /**
     * @function submit
     * @description Sends the message when the form is submitted
     */
    const submit = (event: FormEvent): void => {
        event.preventDefault();
        void send();
    };

    /**
     * @function sendOnEnter
     * @description Sends the message on Enter; Shift+Enter starts a new line
     */
    const sendOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void send();
        }
    };

    /**
     * @function restart
     * @description Forgets the conversation
     */
    const restart = (): void => {
        setMessages([]);
        setError(null);
    };

    return (
        <FrameComponent app={assistant} action={<FrameActionComponent label={t('assistant.newConversation')} icon={SquarePen} onClick={restart} />}>
            <div className='mx-auto flex max-w-2xl flex-col animate-rise'>
                <p className='eyebrow'>{t('assistant.eyebrow')}</p>
                <h1 className='mt-1 text-[34px] font-semibold leading-tight tracking-tight'>{t('assistant.title')}</h1>
                <p className='mt-1 text-[15px] text-ink-secondary'>{t('assistant.intro')}</p>

                <div className='mt-8 flex flex-col gap-4 pb-36'>
                    {messages.map((message) => (
                        <MessageComponent key={message.id} message={message} categories={categories} services={services} onSettle={(index, status, reason) => settle(message.id, index, status, reason)} />
                    ))}
                    {isThinking && (
                        <div className='flex items-center gap-2 text-[14px] text-ink-tertiary'>
                            <SpinnerComponent size={16} />
                            {t('assistant.thinking')}
                        </div>
                    )}
                    {availability.isAvailable && error !== null && <p className='rounded-2xl bg-fill px-4 py-3 text-[14px] text-warning-text'>{error}</p>}
                    {availability.reason !== null && <p className='rounded-2xl bg-fill px-4 py-3 text-[14px] text-warning-text'>{t(availability.reason)}</p>}
                    <div ref={end} className='scroll-mb-40' />
                </div>

                <div className='fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-canvas from-70% to-canvas/0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-6'>
                    <div className='mx-auto max-w-[calc(42rem+2.5rem)] px-5 sm:max-w-[calc(42rem+4rem)] sm:px-8'>
                        <form onSubmit={submit} className={`flex items-end gap-2 rounded-3xl bg-white p-2 shadow-control ${availability.isAvailable ? '' : 'opacity-50'}`}>
                            <textarea aria-label={t('assistant.placeholder')} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={sendOnEnter} maxLength={4000} rows={1} disabled={!availability.isAvailable} placeholder={t('assistant.placeholder')} className='max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-[15px] leading-snug outline-none placeholder:text-ink-quaternary disabled:cursor-not-allowed' />
                            <button type='submit' aria-label={t('assistant.send')} disabled={draft.trim() === '' || isThinking || !availability.isAvailable} className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent/90 disabled:opacity-40'>
                                <ArrowUp size={20} />
                            </button>
                        </form>
                        <p className='mt-3 text-center text-[12px] text-ink-quaternary'>{t('assistant.privacy')}</p>
                    </div>
                </div>
            </div>
        </FrameComponent>
    );
}

/**
 * @function AssistantPage
 * @description The assistant, as the portal loads it under `/assistant`. It shares the budget and the watchlist with
 * their apps, so a confirmed suggestion shows there at once.
 *
 * @returns {JSX.Element} The assistant page
 */
function AssistantPage(): JSX.Element {
    return (
        <BudgetProvider>
            <WatchlistProvider>
                <AssistantShellComponent />
            </WatchlistProvider>
        </BudgetProvider>
    );
}

export default AssistantPage;
