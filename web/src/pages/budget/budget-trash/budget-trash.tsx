import EmptyStateComponent from 'components/empty-state/empty-state';
import SheetComponent from 'components/sheet/sheet';
import SpinnerComponent from 'components/spinner/spinner';
import type { Maybe } from 'models';
import { categoriesOf, categoryName, categoryOrFallback } from 'modules/budget/budget-categories';
import { currencyNamed } from 'modules/budget/budget-currencies';
import { money, relativeDay } from 'modules/budget/budget-formatting';
import { useBudgetContext, useDocument } from 'modules/budget/budget-hooks';
import type { TrashedOperation } from 'modules/budget/budget-models';
import budgetService from 'modules/budget/budget-service';
import { t } from 'modules/language/language-service';
import { useToastContext } from 'modules/toast/toast-hooks';
import type { ToastContextProps } from 'modules/toast/toast-models';
import { useEffect, useState, type JSX } from 'react';
import { messageOf } from 'utils/tools';

/**
 * @interface BudgetTrashComponentProps
 * @description Properties of the trash
 */
interface BudgetTrashComponentProps {
    open: boolean; /*!< Whether it is shown */
    onClose: () => void; /*!< Called when it is dismissed */
}

/**
 * @function TrashListComponent
 * @description The deleted operations, the most recently deleted first, each with a button putting it back in the
 * budget. Read from the server each time the trash opens.
 *
 * @returns {JSX.Element} The list
 */
function TrashListComponent(): JSX.Element {
    const { store } = useBudgetContext();
    const document = useDocument();
    const { showToast }: ToastContextProps = useToastContext();
    const [operations, setOperations] = useState<Maybe<TrashedOperation[]>>(null);
    const [failure, setFailure] = useState<Maybe<string>>(null);
    const [restoring, setRestoring] = useState<Maybe<string>>(null);
    const categories = categoriesOf(document.categories);

    useEffect(() => {
        budgetService.listTrash().then(setOperations).catch((error: unknown) => setFailure(messageOf(error)));
    }, []);

    /**
     * @function restore
     * @description Puts one operation back in the budget, then reads the budget again so it shows there
     */
    const restore = async (id: string): Promise<void> => {
        setRestoring(id);

        try {
            await budgetService.restoreOperation(id);
            setOperations((current) => current?.filter((operation) => operation.id !== id) ?? null);
            await store.refresh();
        } catch (error: unknown) {
            showToast(messageOf(error));
        } finally {
            setRestoring(null);
        }
    };

    if (failure !== null) {
        return <EmptyStateComponent message={`${t('trash.loadFailed')} ${failure}`} />;
    }

    if (operations === null) {
        return (
            <div className='flex justify-center py-10'>
                <SpinnerComponent />
            </div>
        );
    }

    if (operations.length === 0) {
        return <EmptyStateComponent message={t('trash.empty')} />;
    }

    return (
        <div className='card divide-y divide-hairline overflow-hidden'>
            {operations.map((operation) => (
                <div key={operation.id} className='flex items-center gap-3 px-4 py-3'>
                    <span className='min-w-0 flex-1'>
                        <span className='flex items-baseline justify-between gap-3'>
                            <span className='truncate text-[15px] font-semibold'>{operation.name}</span>
                            <span className='shrink-0 text-[15px] tabular-nums'>{money(operation.amount, currencyNamed(operation.currencyCode))}</span>
                        </span>
                        <span className='block text-[12px] text-ink-tertiary'>
                            {[categoryName(categoryOrFallback(categories, operation.categoryId)), relativeDay(operation.date), t('trash.deletedOn', { date: relativeDay(operation.deletedAt) })].join(' • ')}
                        </span>
                    </span>
                    <button type='button' disabled={restoring !== null} onClick={() => void restore(operation.id)} className='shrink-0 rounded-full bg-fill px-3.5 py-1.5 text-[14px] font-medium text-accent transition hover:bg-fill-strong disabled:opacity-50'>
                        {t('trash.restore')}
                    </button>
                </div>
            ))}
        </div>
    );
}

/**
 * @function BudgetTrashComponent
 * @description The trash, in a sheet: what was deleted, and the way back
 *
 * @param {BudgetTrashComponentProps} props The properties of the component
 */
function BudgetTrashComponent(props: BudgetTrashComponentProps): JSX.Element {
    return (
        <SheetComponent open={props.open} title={t('trash.title')} onClose={props.onClose}>
            <p className='mb-4 text-[14px] text-ink-secondary'>{t('trash.note')}</p>
            <TrashListComponent />
        </SheetComponent>
    );
}

export default BudgetTrashComponent;
