import { categoriesOf, categoryName, DEFAULT_CATEGORIES } from 'modules/budget/budget-categories';
import { currencyName, currencyNamed } from 'modules/budget/budget-currencies';
import { chooseLanguage, currentLanguage, languageChoice, t } from 'modules/language/language-service';
import { describe, expect, it } from 'vitest';

describe('sentences', () => {
    it('fills in their slots and leaves unknown ones alone', () => {
        expect(t('budget.of', { amount: '€3,000' })).toBe('of €3,000');
        expect(t('budget.of')).toBe('of {amount}');
    });

    it('follow the language picked', () => {
        chooseLanguage('fr');

        expect(currentLanguage()).toBe('fr');
        expect(languageChoice()).toBe('fr');
        expect(t('navigation.settings')).toBe('Réglages');
        expect(t('account.created', { date: '12 oct. 2026' })).toBe('Créée le 12 oct. 2026');
    });
});

describe('categories', () => {
    it('take their look from the catalogue and keep their stored limit', () => {
        const stored = [{ id: 'selfcare', name: 'Selfcare', symbol: 'dumbbell', colorHex: 0x000000, monthlyLimit: 55 }, { id: 'pets', name: 'Pets', symbol: 'pawprint', colorHex: 0x123456, monthlyLimit: 20 }];
        const shipped = DEFAULT_CATEGORIES.find((category) => category.id === 'selfcare');

        expect(categoriesOf(stored)).toEqual([{ ...shipped, monthlyLimit: 55 }, stored[1]]);
    });

    it('are named in the page language by id, and by their stored name otherwise', () => {
        chooseLanguage('fr');

        expect(categoryName({ id: 'selfcare', name: 'Selfcare', symbol: 'cross.case', colorHex: 0, monthlyLimit: 0 })).toBe('Bien-être');
        expect(categoryName({ id: 'pets', name: 'Pets', symbol: 'pawprint', colorHex: 0, monthlyLimit: 0 })).toBe('Pets');
        expect(currencyName(currencyNamed('USD'))).toBe('Dollar américain');
    });
});
