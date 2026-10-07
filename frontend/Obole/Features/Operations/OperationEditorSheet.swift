import SwiftUI

enum OperationEditorRoute: Identifiable {
    case new
    case edit(String)

    var id: String {
        switch self {
        case .new: return "new"
        case .edit(let operationId): return operationId
        }
    }
}

struct OperationEditorSheet: View {
    let route: OperationEditorRoute

    @Environment(LocalStore.self) private var store
    @Environment(ExchangeRates.self) private var rates
    @Environment(Preferences.self) private var preferences
    @Environment(\.dismiss) private var dismiss

    @State private var amountText = ""
    @State private var currencyCode = Currency.euro.code
    @State private var categoryId = ""
    @State private var name = ""
    @State private var description = ""
    @State private var location = ""
    @State private var date = Date.now
    @State private var isOnline = false
    @State private var isRecurring = false

    @State private var showCurrencyPicker = false
    @State private var showDatePicker = false
    @State private var showDeleteConfirmation = false

    @FocusState private var focus: Field?

    private enum Field {
        case amount
        case name
        case description
        case location
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                amountBlock
                    .padding(.bottom, 8)

                RowDivider()
                    .padding(.vertical, 18)

                FieldLabel(String(appLocalized: "Category"))
                    .padding(.bottom, 10)
                categoryGrid
                    .padding(.bottom, 20)

                fields

                PrimaryButton(title: isEditing ? String(appLocalized: "Save changes") : String(appLocalized: "Save operation"), isDisabled: !isValid) {
                    save()
                }
                .padding(.top, 20)

                if isEditing {
                    Button {
                        showDeleteConfirmation = true
                    } label: {
                        Text("Delete operation")
                            .font(Theme.font(14))
                            .foregroundStyle(Theme.negative)
                            .frame(maxWidth: .infinity)
                            .expandedTapTarget(vertical: 14, horizontal: 8)
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 14)
                }
            }
            .padding(.top, 32)
            .padding(.horizontal, Theme.screenPadding)
            .padding(.bottom, 32)
            .background(
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { dismissEditing() }
            )
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .screenBackground()
        .presentationDragIndicator(.visible)
        .sheet(isPresented: $showCurrencyPicker) {
            CurrencyPickerSheet(selection: $currencyCode)
                .presentationDetents([.medium, .large])
        }
        .confirmationDialog("Delete this operation?", isPresented: $showDeleteConfirmation, titleVisibility: .visible) {
            Button("Delete", role: .destructive) { delete() }
            Button("Cancel", role: .cancel) {}
        }
        .onAppear(perform: loadValues)
        .task(id: selectedDay) {
            await rates.load(day: selectedDay)
        }
        .onChange(of: amountText) { _, typed in
            let formatted = Formatting.groupedAmountInput(Formatting.sanitizeAmountInput(typed))
            if formatted != typed { amountText = formatted }
        }
        .onChange(of: focus) { _, field in
            guard field != nil, showDatePicker else { return }
            withAnimation(.easeOut(duration: 0.2)) { showDatePicker = false }
        }
    }

    private var isEditing: Bool {
        if case .edit = route { return true }
        return false
    }

    private var currency: Currency {
        rates.currency(code: currencyCode)
    }

    private var amount: Double {
        Formatting.parseAmountInput(amountText) ?? 0
    }

    private var selectedDay: String {
        ExchangeRates.day(from: date)
    }

    /// The rate the operation was saved at, while its date and currency are still the ones it was saved with.
    /// It came from a real published rate, markup included, so it stands in perfectly well until the day's
    /// rate arrives.
    private var storedRate: Double? {
        guard case .edit(let operationId) = route,
              let operation = store.operation(id: operationId),
              operation.currencyCode == currencyCode,
              ExchangeRates.day(from: operation.date) == selectedDay else { return nil }

        return operation.rateToEuro
    }

    /// The rate to price this operation at, or nil while none is known. Nothing is ever guessed here: a
    /// rate the app invented must never be shown as though it were published.
    private var appliedRate: Double? {
        rates.rate(code: currencyCode, on: selectedDay) ?? storedRate
    }

    /// The reason there is no rate to show, or nil when there is one.
    private var rateProblem: String? {
        appliedRate == nil ? (rates.failure(on: selectedDay) ?? String(appLocalized: "Loading…")) : nil
    }

    /// The rate, or why there isn't one yet.
    private var rateLine: String {
        guard let appliedRate else {
            return rates.failure(on: selectedDay) ?? String(appLocalized: "Loading…")
        }

        return String(appLocalized: "Rate \(Formatting.rate(appliedRate))")
    }

    private var euroAmount: Double? {
        guard let appliedRate else { return nil }

        return amount * appliedRate
    }

    private var isValid: Bool {
        amount > 0 && !name.trimmingCharacters(in: .whitespaces).isEmpty && !categoryId.isEmpty && appliedRate != nil
    }

    private var amountBlock: some View {
        VStack(spacing: 4) {
            FieldLabel(String(appLocalized: "Amount"))
            HStack(alignment: .center, spacing: 6) {
                TextField("", text: $amountText, prompt: Text(verbatim: Formatting.groupedAmountInput("0.00")).foregroundStyle(Theme.faint))
                    .font(Theme.font(44, .semibold))
                    .tracking(-0.88)
                    .foregroundStyle(Theme.text)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .fixedSize(horizontal: true, vertical: false)
                    .focused($focus, equals: .amount)
                    .accessibilityLabel("Amount")

                Button {
                    preferences.tap()
                    showCurrencyPicker = true
                } label: {
                    HStack(spacing: 3) {
                        Text(currency.code)
                            .font(Theme.font(15))
                        Image(systemName: "chevron.down")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(Theme.text)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Theme.neutral900, in: RoundedRectangle(cornerRadius: Theme.inputRadius, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Currency, \(currency.title)")
            }
            .padding(.top, 2)

            if currency.code != Currency.euro.code {
                if let euroAmount {
                    Text(Formatting.euroPrecise(euroAmount))
                        .font(Theme.font(13))
                        .foregroundStyle(Theme.accent300)
                        .padding(.top, 4)
                }
                Text(rateLine)
                    .font(Theme.font(11))
                    .foregroundStyle(rateProblem == nil ? Theme.faint : Theme.warning)
                    .padding(.top, euroAmount == nil ? 4 : 0)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var categoryGrid: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 9), count: 4), spacing: 9) {
            ForEach(store.categories) { category in
                CategoryChip(category: category, isSelected: categoryId == category.id) {
                    preferences.tap()
                    withAnimation(.easeOut(duration: 0.15)) {
                        categoryId = category.id
                    }
                }
            }
        }
    }

    private var fields: some View {
        VStack(alignment: .leading, spacing: 12) {
            GlassField(label: String(appLocalized: "Name")) {
                TextField("", text: $name, prompt: Text("Whole Foods").foregroundStyle(Theme.faint))
                    .focused($focus, equals: .name)
                    .accessibilityLabel("Name")
            }

            GlassField(label: String(appLocalized: "Description")) {
                TextField(
                    "",
                    text: $description,
                    prompt: Text("Weekly groceries with Anna").foregroundStyle(Theme.faint),
                    axis: .vertical
                )
                .lineLimit(1...4)
                .focused($focus, equals: .description)
                .accessibilityLabel("Description")
            }

            VStack(alignment: .leading, spacing: 6) {
                FieldLabel(String(appLocalized: "Date"))
                Button {
                    preferences.tap()
                    focus = nil
                    withAnimation(.easeOut(duration: 0.2)) {
                        showDatePicker.toggle()
                    }
                } label: {
                    HStack {
                        Text(Formatting.fieldDate(date))
                            .font(Theme.font(14))
                            .foregroundStyle(Theme.text)
                        Spacer(minLength: 8)
                        Image(systemName: "calendar")
                            .font(.system(size: 14))
                            .foregroundStyle(Theme.muted)
                    }
                    .padding(.horizontal, 12)
                    .frame(minHeight: Theme.inputHeight)
                    .glassInput()
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if showDatePicker {
                    DatePicker("", selection: $date, in: ...Date.now, displayedComponents: [.date, .hourAndMinute])
                        .datePickerStyle(.graphical)
                        .environment(\.locale, Formatting.clockLocale)
                        .tint(Theme.accent)
                        .labelsHidden()
                        .padding(.horizontal, 6)
                        .glassCard()
                }
            }

            onlineRow

            if !isOnline {
                GlassField(label: String(appLocalized: "Location")) {
                    HStack(spacing: 8) {
                        Image(systemName: "mappin")
                            .font(.system(size: 14))
                            .foregroundStyle(Theme.accent)
                        TextField("", text: $location, prompt: Text("Berlin Mitte").foregroundStyle(Theme.faint))
                            .focused($focus, equals: .location)
                            .accessibilityLabel("Location")
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            recurringRow
        }
    }

    private var onlineRow: some View {
        HStack(spacing: 10) {
            Image(systemName: "globe")
                .font(.system(size: 17))
                .foregroundStyle(Theme.accent)
            VStack(alignment: .leading, spacing: 1) {
                Text("Online")
                    .font(Theme.font(14))
                    .foregroundStyle(Theme.text)
                Text("No physical location")
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.muted)
            }
            Spacer(minLength: 8)
            Toggle("", isOn: $isOnline.animation(.easeOut(duration: 0.2)))
                .labelsHidden()
                .tint(Theme.accent)
                .accessibilityLabel("Online")
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .glassCard(radius: Theme.controlRadius)
    }

    private var recurringRow: some View {
        HStack(spacing: 10) {
            Image(systemName: "repeat")
                .font(.system(size: 17))
                .foregroundStyle(Theme.accent)
            VStack(alignment: .leading, spacing: 1) {
                Text("Recurring")
                    .font(Theme.font(14))
                    .foregroundStyle(Theme.text)
                Text("Repeats monthly")
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.muted)
            }
            Spacer(minLength: 8)
            Toggle("", isOn: $isRecurring)
                .labelsHidden()
                .tint(Theme.accent)
                .accessibilityLabel("Recurring")
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .glassCard(radius: Theme.controlRadius)
    }

    private func loadValues() {
        guard case .edit(let operationId) = route, let operation = store.operation(id: operationId) else {
            currencyCode = preferences.lastUsedCurrencyCode
            categoryId = store.categories.first?.id ?? ""
            location = store.latestLocation ?? ""
            return
        }
        amountText = Formatting.amountInput(operation.amount)
        currencyCode = operation.currencyCode
        categoryId = operation.categoryId
        name = operation.name
        description = operation.description ?? ""
        location = operation.location ?? ""
        date = operation.date
        isOnline = operation.isOnline
        isRecurring = operation.isRecurring
    }

    private func dismissEditing() {
        focus = nil
        guard showDatePicker else { return }
        withAnimation(.easeOut(duration: 0.2)) { showDatePicker = false }
    }

    private func save() {
        guard isValid else { return }
        let trimmedLocation = isOnline ? "" : location.trimmingCharacters(in: .whitespaces)
        let trimmedDescription = description.trimmingCharacters(in: .whitespacesAndNewlines)
        let existingId: String? = {
            if case .edit(let operationId) = route { return operationId }
            return nil
        }()

        guard let appliedRate else { return }

        let operation = Operation(
            id: existingId ?? UUID().uuidString,
            date: date,
            name: name.trimmingCharacters(in: .whitespaces),
            description: trimmedDescription.isEmpty ? nil : trimmedDescription,
            categoryId: categoryId,
            location: trimmedLocation.isEmpty ? nil : trimmedLocation,
            amount: amount,
            currencyCode: currencyCode,
            rateToEuro: appliedRate,
            isOnline: isOnline,
            isRecurring: isRecurring
        )

        store.upsertOperation(operation)
        preferences.lastUsedCurrencyCode = currencyCode
        preferences.success()
        dismiss()
    }

    private func delete() {
        guard case .edit(let operationId) = route else { return }
        store.deleteOperation(id: operationId)
        preferences.success()
        dismiss()
    }
}
