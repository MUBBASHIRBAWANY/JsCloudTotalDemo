export const theme = {
  colors: {
    primary: '#4338CA',
    primaryDark: '#312E81',
    primarySoft: '#EEF2FF',
    ink: '#0F172A',
    text: '#1E293B',
    muted: '#64748B',
    line: '#E2E8F0',
    background: '#F4F6FB',
    card: '#FFFFFF',
    danger: '#B91C1C',
    dangerSoft: '#FEF2F2',
    success: '#047857',
    successSoft: '#ECFDF5',
    warning: '#B45309',
    warningSoft: '#FFFBEB',
    info: '#1D4ED8',
    infoSoft: '#EFF6FF',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
  },
};

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
};

export const ui = {
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 28,
  },
  lead: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...shadow.card,
  },
  cardTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 4,
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    color: theme.colors.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
  search: {
    height: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingHorizontal: 14,
    marginBottom: 12,
    color: theme.colors.ink,
    fontSize: 15,
  },
} as const;
