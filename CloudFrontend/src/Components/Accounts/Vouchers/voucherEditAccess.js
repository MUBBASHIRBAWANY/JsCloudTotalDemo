import { PERMISSIONS } from '../../../utils/permission';

const V = PERMISSIONS.TRANSACTION.VOUCHER;

/** Per voucher-type edit metadata */
export const VOUCHER_EDIT_META = {
  CR: {
    type: 'CR',
    label: 'Cash Receipt',
    editPermission: V.CASH_BOOK.RECEIPT.EDIT,
    listPermission: V.CASH_BOOK.RECEIPT.LIST,
    editPath: (id) => `/CashReciptVoucherEdit/${id}`,
    viewPath: (id) => `/CashReciptVoucherView/${id}`,
    listPath: '/CashReciptVoucherList',
  },
  BR: {
    type: 'BR',
    label: 'Bank Receipt',
    editPermission: V.BANK_BOOK.RECEIPT.EDIT,
    listPermission: V.BANK_BOOK.RECEIPT.LIST,
    editPath: (id) => `/BankReciptVoucherEdit/${id}`,
    viewPath: (id) => `/BankReciptVoucherView/${id}`,
    listPath: '/BankReciptVoucherList',
  },
  CP: {
    type: 'CP',
    label: 'Cash Payment',
    editPermission: V.CASH_BOOK.PAYMENT.EDIT,
    listPermission: V.CASH_BOOK.PAYMENT.LIST,
    editPath: (id) => `/CashPaymentVoucherEdit/${id}`,
    viewPath: (id) => `/CashPaymentVoucherView/${id}`,
    listPath: '/CashPaymentVoucherList',
  },
  BP: {
    type: 'BP',
    label: 'Bank Payment',
    editPermission: V.BANK_BOOK.PAYMENT.EDIT,
    listPermission: V.BANK_BOOK.PAYMENT.LIST,
    editPath: (id) => `/BankPaymentVoucherEdit/${id}`,
    viewPath: (id) => `/BankPaymentVoucherView/${id}`,
    listPath: '/BankPaymentVoucherList',
  },
  JV: {
    type: 'JV',
    label: 'Journal Voucher',
    editPermission: V.JOURNAL_VOUCHER.EDIT,
    listPermission: V.JOURNAL_VOUCHER.LIST,
    editPath: (id) => `/JournalVoucherEdit/${id}`,
    viewPath: (id) => `/JournalVoucherView/${id}`,
    listPath: '/JournalVoucherList',
  },
};

export const normalizeVoucherType = (type) => {
  const t = String(type || '').trim().toUpperCase();
  if (t === 'JV' || t === 'JOURNAL') return 'JV';
  if (VOUCHER_EDIT_META[t]) return t;
  return t;
};

export const getVoucherEditMeta = (type) =>
  VOUCHER_EDIT_META[normalizeVoucherType(type)] || null;

export const hasRight = (userRights, permission) => {
  if (!permission) return false;
  const rights = Array.isArray(userRights) ? userRights : [];
  return rights.includes(permission);
};

export const canEditVoucherType = (userRights, type) => {
  const meta = getVoucherEditMeta(type);
  if (!meta) return false;
  return hasRight(userRights, meta.editPermission);
};

export const getVoucherEditPath = (type, id) => {
  const meta = getVoucherEditMeta(type);
  if (!meta || !id) return null;
  return meta.editPath(id);
};

export const parseVoucherByIdResponse = (res) => {
  if (!res) return null;
  const voucher = res.voucher || (!Array.isArray(res.data) ? res.data : null);
  if (!voucher || Array.isArray(voucher)) return null;
  if (!voucher.VoucherNumber && !voucher.VoucharData && !voucher.VoucherData) return null;
  return voucher;
};

/**
 * Ensure voucher can be edited on this page.
 * - Wrong type → redirect to correct edit (if allowed) or list
 * - Missing edit right → block
 */
export const assertEditableVoucher = ({
  voucher,
  expectedType,
  userRights,
  navigate,
  toast,
}) => {
  if (!voucher) {
    toast?.error?.('Voucher not found');
    return false;
  }

  const type = normalizeVoucherType(voucher.VoucherType);
  const meta = getVoucherEditMeta(type);

  if (!meta) {
    toast?.error?.('Unknown voucher type');
    navigate?.('/', { replace: true });
    return false;
  }

  const expected = normalizeVoucherType(expectedType);
  if (expected && type !== expected) {
    if (canEditVoucherType(userRights, type)) {
      toast?.info?.(`Ye ${meta.label} hai — sahi edit page khol rahe hain`);
      navigate?.(meta.editPath(voucher._id), { replace: true });
    } else {
      toast?.error?.(`Aap ke pass ${meta.label} edit right nahi hai`);
      navigate?.(meta.listPath, { replace: true });
    }
    return false;
  }

  if (!canEditVoucherType(userRights, type)) {
    toast?.error?.(`Aap ke pass ${meta.label} edit right nahi hai`);
    navigate?.(meta.listPath, { replace: true });
    return false;
  }

  return true;
};
