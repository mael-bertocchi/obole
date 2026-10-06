import SwiftUI

private struct ExpandedTapTarget: ViewModifier {
    var vertical: CGFloat
    var horizontal: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(.vertical, vertical)
            .padding(.horizontal, horizontal)
            .contentShape(Rectangle())
            .padding(.vertical, -vertical)
            .padding(.horizontal, -horizontal)
    }
}

extension View {
    func expandedTapTarget(vertical: CGFloat = 10, horizontal: CGFloat = 8) -> some View {
        modifier(ExpandedTapTarget(vertical: vertical, horizontal: horizontal))
    }
}

struct PrimaryButton: View {
    let title: String
    var systemImage: String?
    var height: CGFloat = Theme.primaryButtonHeight
    var isDisabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 15, weight: .medium))
                }
                Text(title)
                    .font(Theme.font(15, .medium))
            }
            .foregroundStyle(isDisabled ? Theme.faint : Theme.accent)
            .frame(maxWidth: .infinity)
            .frame(height: height)
            .background(
                (isDisabled ? Color.white.opacity(0.04) : Theme.accent.opacity(0.16)),
                in: RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.controlRadius, style: .continuous)
                    .strokeBorder(isDisabled ? Theme.divider : Theme.accent, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
    }
}

struct SecondaryButton: View {
    let title: String
    var systemImage: String?
    var height: CGFloat = Theme.primaryButtonHeight
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 15, weight: .medium))
                }
                Text(title)
                    .font(Theme.font(15, .medium))
            }
            .foregroundStyle(Theme.text)
            .frame(maxWidth: .infinity)
            .frame(height: height)
            .glassInput(radius: Theme.controlRadius)
        }
        .buttonStyle(.plain)
    }
}

struct StepperButton: View {
    let title: String
    var onBack: () -> Void
    var onForward: () -> Void
    var forwardEnabled: Bool

    var body: some View {
        HStack(spacing: 8) {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.text)
                    .expandedTapTarget(vertical: 11, horizontal: 6)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Previous month")

            Text(title)
                .font(Theme.font(13))
                .foregroundStyle(Theme.text)
                .frame(minWidth: 74)

            Button(action: onForward) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(forwardEnabled ? Theme.text : Theme.text.opacity(0.4))
                    .expandedTapTarget(vertical: 11, horizontal: 6)
            }
            .buttonStyle(.plain)
            .disabled(!forwardEnabled)
            .accessibilityLabel("Next month")
        }
        .padding(.horizontal, 12)
        .frame(height: 34)
        .glassInput(radius: Theme.inputRadius)
    }
}

struct FilterChip: View {
    let title: String
    var systemImage: String?
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 11, weight: .medium))
                }
                Text(title)
                    .font(Theme.font(12, .medium))
            }
            .foregroundStyle(isActive ? Theme.accent : Theme.muted)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(
                isActive ? AnyShapeStyle(Theme.accent.opacity(0.12)) : AnyShapeStyle(Theme.neutral900),
                in: RoundedRectangle(cornerRadius: 6, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .strokeBorder(isActive ? Theme.accent : Color.clear, lineWidth: 1)
            )
            .expandedTapTarget(vertical: 6, horizontal: 2)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? [.isSelected] : [])
    }
}

struct SearchField: View {
    @Binding var text: String
    var prompt: String = String(appLocalized: "Search")

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14, weight: .regular))
                .foregroundStyle(Theme.muted)
            TextField(
                "",
                text: $text,
                prompt: Text(prompt).foregroundStyle(Theme.muted)
            )
            .font(Theme.font(14))
            .foregroundStyle(Theme.text)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .accessibilityLabel(prompt)
            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.faint)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(minHeight: 38)
        .glassCard(radius: Theme.controlRadius)
    }
}

struct InlineLink: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Theme.font(12))
                .foregroundStyle(Theme.accent)
                .expandedTapTarget(vertical: 12, horizontal: 8)
        }
        .buttonStyle(.plain)
    }
}

struct SheetHeader: View {
    let title: String
    var onClose: () -> Void

    var body: some View {
        HStack(alignment: .center) {
            Text(title)
                .font(Theme.font(26, .medium))
                .tracking(-0.39)
                .foregroundStyle(Theme.text)
            Spacer(minLength: 12)
            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 18, weight: .regular))
                    .foregroundStyle(Theme.muted)
                    .expandedTapTarget(vertical: 12, horizontal: 12)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close")
        }
    }
}

struct ScreenTitle: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text)
            .font(Theme.font(26, .medium))
            .tracking(-0.39)
            .foregroundStyle(Theme.text)
    }
}

struct HeaderAddButton: View {
    var accessibilityLabel: String = String(appLocalized: "New operation")
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "plus")
                .font(.system(size: 17, weight: .semibold))
                .frame(width: 22, height: 22)
        }
        .buttonStyle(.glassProminent)
        .buttonBorderShape(.circle)
        .tint(Theme.accent)
        .accessibilityLabel(accessibilityLabel)
    }
}
