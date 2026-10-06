/**
 * @constant en
 * @description Every sentence the page shows, in English. The keys are what the rest of the code asks for; `{name}`
 * marks a value filled in when the sentence is used.
 */
export const en = {
    'navigation.sections': 'Sections',
    'navigation.budget': 'Budget',
    'navigation.history': 'History',
    'navigation.settings': 'Settings',
    'navigation.newOperation': 'New operation',

    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.loading': 'Loading',
    'common.irreversible': "This can't be undone.",

    'layout.loadFailed': "Your budget couldn't be loaded",
    'layout.tryAgain': 'Try again',

    'sync.syncing': 'Syncing',
    'sync.synced': 'Synced',
    'sync.offline': 'Offline',
    'sync.error': 'Error',

    'signIn.prompt': 'Enter your code to open your budget.',
    'signIn.code': 'Six-digit code',
    'signIn.digit': 'Digit {position}',

    'budget.eyebrow': 'Budget',
    'budget.previousMonth': 'Previous month',
    'budget.nextMonth': 'Next month',
    'budget.overspent': 'Overspent',
    'budget.leftToSpend': 'Left to spend',
    'budget.of': 'of {amount}',
    'budget.noOperations': 'No operations',
    'budget.spent': 'Spent',
    'budget.daysLeft': 'Days left',
    'budget.perDay': 'Per day',
    'budget.byCategory': 'By category',
    'budget.editLimits': 'Edit limits',
    'budget.notDispatched': '{amount} of the budget is not dispatched yet',
    'budget.emptyMonth': 'No operations in this month.',
    'budget.noSpending': 'No spending yet this month. Log an operation and your categories will fill in here.',

    'limits.title': 'Edit limits',
    'limits.monthly': 'Monthly budget',
    'limits.categories': 'Category limits',
    'limits.toDispatch': '{amount} to dispatch',
    'limits.overBudget': '{amount} over budget',
    'limits.dispatched': 'Fully dispatched',
    'limits.categoryLimit': '{category} limit',
    'limits.save': 'Save limits',

    'history.eyebrow': 'History',
    'history.title': 'Operations',
    'history.search': 'Search operations',
    'history.clearSearch': 'Clear search',
    'history.all': 'All',
    'history.date': 'Date',
    'history.dateFilter': 'Filter by date',
    'history.day': 'Day',
    'history.period': 'Period',
    'history.from': 'From',
    'history.to': 'To',
    'history.apply': 'Apply',
    'history.allDates': 'All dates',
    'history.totalSpent': 'Total spent',
    'history.noMatch': 'No operations match this search.',
    'history.empty': 'No operations yet. Use New operation to log your first expense.',
    'history.recurring': 'Recurring',
    'history.hasNote': 'Has a note',
    'history.online': 'Online',

    'operation.new': 'New operation',
    'operation.edit': 'Edit operation',
    'operation.amount': 'Amount',
    'operation.currency': 'Currency',
    'operation.category': 'Category',
    'operation.name': 'Name',
    'operation.namePlaceholder': 'Whole Foods',
    'operation.description': 'Description',
    'operation.descriptionPlaceholder': 'Weekly groceries with Anna',
    'operation.date': 'Date',
    'operation.online': 'Online',
    'operation.onlineHint': 'No physical location',
    'operation.location': 'Location',
    'operation.locationPlaceholder': 'Berlin Mitte',
    'operation.recurring': 'Recurring',
    'operation.recurringHint': 'Repeats monthly',
    'operation.rate': 'Rate {rate}',
    'operation.loadingRate': 'Loading…',
    'operation.save': 'Save operation',
    'operation.saveChanges': 'Save changes',
    'operation.delete': 'Delete operation',
    'operation.confirmDelete': 'Delete this operation?',
    'operation.deleteAction': 'Delete',
    'operation.missing': 'This operation no longer exists.',
    'operation.deletedElsewhere': 'This operation was deleted on another device.',

    'settings.eyebrow': 'Settings',
    'settings.title': 'Preferences',
    'settings.account': 'Account',
    'settings.sync': 'Sync',
    'settings.signOut': 'Sign out',
    'settings.budget': 'Budget',
    'settings.budgetAndLimits': 'Budget & limits',
    'settings.entry': 'Entry',
    'settings.defaultCurrency': 'Default currency',
    'settings.general': 'General',
    'settings.language': 'Language',
    'settings.automatic': 'Automatic',
    'settings.exchangeRates': 'Exchange rates',
    'settings.markup': 'Includes the {markup} your bank adds on top of the reference rate.',
    'settings.data': 'Data',
    'settings.operations': 'Operations',
    'settings.categories': 'Categories',
    'settings.reset': 'Reset all data',
    'settings.confirmReset': 'Delete every operation?',
    'settings.resetMessage': "Your limits go back to their defaults too. This can't be undone.",
    'settings.resetAction': 'Reset',
    'settings.confirmSignOut': 'Sign out?',
    'settings.signOutMessage': "You'll need your code to open your budget again.",

    'dates.today': 'Today',
    'dates.yesterday': 'Yesterday',
    'dates.todayOn': 'Today, {day}',
    'dates.yesterdayOn': 'Yesterday, {day}',

    'category.groceries': 'Groceries',
    'category.restaurant': 'Restaurant',
    'category.bar': 'Bar',
    'category.coffee': 'Coffee',
    'category.transport': 'Transport',
    'category.shopping': 'Shopping',
    'category.fun': 'Fun',
    'category.health': 'Health',
    'category.school': 'School',
    'category.miscellaneous': 'Miscellaneous',
    'category.rent': 'Rent',
    'category.uncategorized': 'Uncategorized',

    'currency.EUR': 'Euro',
    'currency.USD': 'United States Dollar',
    'currency.CHF': 'Swiss Franc',
    'currency.KRW': 'South Korean Won',

    'error.generic': 'Something went wrong.',
    'error.unreachable': "Can't reach the server.",
    'error.sessionExpired': 'Your session has expired.',
    'error.wrongCode': 'Wrong code.',
    'error.throttled': 'Too many wrong codes. Try again in {minutes} min.',
    'error.tooManyAttempts': 'Too many attempts. Try again in a moment.',
    'error.unavailable': 'The server is unavailable right now.',
    'error.refused': 'The server refused the request.',
    'error.unexpected': 'The server sent an unexpected response.'
} as const;

/**
 * @type MessageKey
 * @description A sentence the page can show.
 */
export type MessageKey = keyof typeof en;

/**
 * @type Messages
 * @description Every sentence in one language. Typing a translation with it makes a forgotten sentence a build error.
 */
export type Messages = Record<MessageKey, string>;
