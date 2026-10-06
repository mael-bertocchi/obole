import SwiftUI

struct SettingsView: View {
    @Environment(LocalStore.self) private var store
    @Environment(ExchangeRates.self) private var rates
    @Environment(Preferences.self) private var preferences
    @Environment(ApplicationSession.self) private var session

    @State private var showLimits = false
    @State private var showCurrencyPicker = false
    @State private var showResetConfirmation = false
    @State private var showSignOutConfirmation = false

    var body: some View {
        @Bindable var preferences = preferences

        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ScreenTitle(String(appLocalized: "Settings"))
                    .padding(.bottom, 20)

                SectionLabel(String(appLocalized: "Account"))
                    .padding(.bottom, 10)
                VStack(spacing: 0) {
                    HStack(spacing: 12) {
                        IconTile(symbol: "arrow.triangle.2.circlepath", color: Theme.accent)
                        Text("Sync")
                            .font(Theme.font(14))
                            .foregroundStyle(Theme.text)
                        Spacer(minLength: 8)
                        syncBadge
                    }
                    .padding(.vertical, 11)
                    .padding(.horizontal, 14)
                    RowDivider()
                    Button {
                        showSignOutConfirmation = true
                    } label: {
                        HStack(spacing: 12) {
                            IconTile(symbol: "rectangle.portrait.and.arrow.right", color: Theme.negative)
                            Text("Sign out")
                                .font(Theme.font(14))
                                .foregroundStyle(Theme.negative)
                            Spacer(minLength: 8)
                        }
                        .padding(.vertical, 11)
                        .padding(.horizontal, 14)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                .glassCard()

                SectionLabel(String(appLocalized: "Budget"))
                    .padding(.top, 22)
                    .padding(.bottom, 10)
                VStack(spacing: 0) {
                    valueRow(
                        symbol: "target",
                        color: Theme.accent,
                        title: String(appLocalized: "Budget & limits"),
                        value: Formatting.euro(store.budget.monthlyLimit)
                    ) {
                        showLimits = true
                    }
                }
                .glassCard()

                SectionLabel(String(appLocalized: "Entry"))
                    .padding(.top, 22)
                    .padding(.bottom, 10)
                VStack(spacing: 0) {
                    valueRow(
                        symbol: "eurosign.circle",
                        color: Theme.accent,
                        title: String(appLocalized: "Default currency"),
                        value: preferences.lastUsedCurrencyCode
                    ) {
                        showCurrencyPicker = true
                    }
                    RowDivider()
                    HStack(spacing: 12) {
                        IconTile(symbol: "hand.tap", color: Theme.accent)
                        Text("Haptics")
                            .font(Theme.font(14))
                            .foregroundStyle(Theme.text)
                        Spacer(minLength: 8)
                        Toggle("", isOn: $preferences.hapticsEnabled)
                            .labelsHidden()
                            .tint(Theme.accent)
                            .accessibilityLabel("Haptics")
                    }
                    .padding(.vertical, 11)
                    .padding(.horizontal, 14)
                }
                .glassCard()

                SectionLabel(String(appLocalized: "General"))
                    .padding(.top, 22)
                    .padding(.bottom, 10)
                languageRow
                    .glassCard()

                SectionLabel(String(appLocalized: "Exchange rates"))
                    .padding(.top, 22)
                    .padding(.bottom, 10)
                VStack(spacing: 0) {
                    ForEach(Array(rates.currencies.dropFirst().enumerated()), id: \.element.id) { index, currency in
                        HStack(spacing: 12) {
                            Text(currency.code)
                                .font(Theme.mono(14, .medium))
                                .foregroundStyle(Theme.text)
                            Text(currency.title)
                                .font(Theme.font(13))
                                .foregroundStyle(Theme.muted)
                            Spacer(minLength: 8)
                            Text(verbatim: "1 \(currency.code) = \(Formatting.rate(currency.rateToEuro)) €")
                                .font(Theme.font(12))
                                .foregroundStyle(Theme.muted)
                        }
                        .padding(.vertical, 11)
                        .padding(.horizontal, 14)
                        if index < rates.currencies.count - 2 {
                            RowDivider()
                        }
                    }
                }
                .glassCard()

                Text("Includes the \(Formatting.percent(Currency.bankMarkup)) your bank adds on top of the reference rate.")
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.muted)
                    .padding(.top, 8)
                    .padding(.horizontal, 2)

                SectionLabel(String(appLocalized: "Data"))
                    .padding(.top, 22)
                    .padding(.bottom, 10)
                VStack(spacing: 0) {
                    infoRow(symbol: "list.bullet", title: String(appLocalized: "Operations"), value: "\(store.operations.count)")
                    RowDivider()
                    infoRow(symbol: "square.grid.2x2", title: String(appLocalized: "Categories"), value: "\(store.categories.count)")
                    RowDivider()
                    Button {
                        showResetConfirmation = true
                    } label: {
                        HStack(spacing: 12) {
                            IconTile(symbol: "trash", color: Theme.negative)
                            Text("Reset all data")
                                .font(Theme.font(14))
                                .foregroundStyle(Theme.negative)
                            Spacer(minLength: 8)
                        }
                        .padding(.vertical, 11)
                        .padding(.horizontal, 14)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                .glassCard()

                Text(verbatim: "Obole \(applicationVersion)")
                    .font(Theme.font(11))
                    .foregroundStyle(Theme.faint)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 24)
            }
            .padding(.top, 8)
            .padding(.horizontal, Theme.screenPadding)
        }
        .scrollIndicators(.hidden)
        .scrollTopBlur()
        .sheet(isPresented: $showLimits) {
            CategoryLimitsSheet()
        }
        .sheet(isPresented: $showCurrencyPicker) {
            CurrencyPickerSheet(selection: $preferences.lastUsedCurrencyCode)
                .presentationDetents([.medium, .large])
        }
        .confirmationDialog("Delete every operation?", isPresented: $showResetConfirmation, titleVisibility: .visible) {
            Button("Reset", role: .destructive) {
                store.clearAll()
                preferences.success()
            }
            Button("Cancel", role: .cancel) {}
        }
        .confirmationDialog("Sign out of this device?", isPresented: $showSignOutConfirmation, titleVisibility: .visible) {
            Button("Sign out", role: .destructive) {
                Task { await session.signOut() }
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    /// The dot alone tells the state; its words stay for VoiceOver.
    private var syncBadge: some View {
        Group {
            switch session.syncState {
            case .syncing:
                ProgressView()
                    .controlSize(.mini)
                    .tint(Theme.muted)
                    .accessibilityLabel("Syncing")
            case .idle:
                StatusDot(color: Theme.positive)
                    .accessibilityLabel("Synced")
            case .offline:
                StatusDot(color: Theme.warning)
                    .accessibilityLabel("Offline")
            case .error:
                StatusDot(color: Theme.negative)
                    .accessibilityLabel("Error")
            }
        }
    }

    /// Picking a language redraws every screen in it on the spot, so a menu is enough: no sheet to come back from.
    private var languageRow: some View {
        let selection = Binding(
            get: { preferences.language },
            set: { language in
                preferences.tap()
                preferences.language = language
            }
        )

        return Menu {
            Picker(selection: selection) {
                ForEach(InterfaceLanguage.allCases) { language in
                    Text(verbatim: language.title).tag(language)
                }
            } label: {
                Text("Language")
            }
            .pickerStyle(.inline)
        } label: {
            HStack(spacing: 12) {
                IconTile(symbol: "character.bubble", color: Theme.accent)
                Text("Language")
                    .font(Theme.font(14))
                    .foregroundStyle(Theme.text)
                Spacer(minLength: 8)
                Text(verbatim: preferences.language.title)
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.faint)
            }
            .padding(.vertical, 11)
            .padding(.horizontal, 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var applicationVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
    }

    private func valueRow(
        symbol: String,
        color: Color,
        title: String,
        value: String,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            preferences.tap()
            action()
        } label: {
            HStack(spacing: 12) {
                IconTile(symbol: symbol, color: color)
                Text(title)
                    .font(Theme.font(14))
                    .foregroundStyle(Theme.text)
                Spacer(minLength: 8)
                Text(value)
                    .font(Theme.font(13))
                    .foregroundStyle(Theme.muted)
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.faint)
            }
            .padding(.vertical, 11)
            .padding(.horizontal, 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func infoRow(symbol: String, title: String, value: String) -> some View {
        HStack(spacing: 12) {
            IconTile(symbol: symbol, color: Theme.accent)
            Text(title)
                .font(Theme.font(14))
                .foregroundStyle(Theme.text)
            Spacer(minLength: 8)
            Text(value)
                .font(Theme.font(13))
                .foregroundStyle(Theme.muted)
        }
        .padding(.vertical, 11)
        .padding(.horizontal, 14)
    }
}
