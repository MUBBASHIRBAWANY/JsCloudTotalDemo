export type LoginServer = 'snd' | 'cloud';

export type CustomerValues = Record<string, string>;

export type CustomerOption = { value: string; label: string };

export type CustomerField = {
  key: string;
  label: string;
  required?: boolean;
  input?: 'text' | 'email' | 'phone' | 'cnic' | 'date' | 'number' | 'select';
  optionsKey?: 'orderBookers' | 'cities' | 'transporters' | 'types' | 'transportTypes' | 'activeStatus';
  when?: (values: CustomerValues) => boolean;
};

export type CustomerSection = {
  title: string;
  fields: CustomerField[];
};

export const CNIC_PATTERN = /^\d{5}-\d{7}-\d{1}$/;

export const isPendingCustomer = (row: Record<string, unknown>) => row.pendingCustomer === true;

export const localCustomerId = () => `local-customer-${Date.now()}`;

export const TYPE_OPTIONS: CustomerOption[] = [
  { value: 'Cust', label: 'Customer' },
  { value: 'Distr', label: 'Distributor' },
];

export const TRANSPORT_OPTIONS: CustomerOption[] = [
  { value: 'LTP', label: 'LTP' },
  { value: 'BTP', label: 'BTP' },
];

export const STATUS_OPTIONS: CustomerOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'Nonactive', label: 'NonActive' },
];

const today = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const formatCnic = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  const parts = [digits.slice(0, 5), digits.slice(5, 12), digits.slice(12, 13)].filter(Boolean);
  return parts.join('-');
};

export const nextCustomerCode = (lastCode: unknown) => {
  const code = typeof lastCode === 'string' ? lastCode.trim() : '';
  if (!code) return '00000001';
  const next = Number.parseInt(code, 10);
  if (!Number.isFinite(next)) return '00000001';
  return String(next + 1).padStart(Math.max(code.length, 8), '0');
};

const blank = (keys: string[], extra: CustomerValues = {}): CustomerValues => {
  const values: CustomerValues = {};
  for (const key of keys) values[key] = '';
  return { ...values, ...extra };
};

const cloudKeys = [
  'DistrbutorName',
  'OwnerName',
  'OwnerCnic',
  'Type',
  'OrderBooker',
  'ContactPerson1',
  'ContactPerson2',
  'ContactPerson3',
  'Designation',
  'Address1',
  'Address2',
  'Address3',
  'CNICNo',
  'Country',
  'Province',
  'City',
  'MobilePhoneNo',
  'TransportType',
  'Transporter',
  'MobileNo',
  'MobileNo2',
  'CountryCode',
  'PostalCode',
  'Fax',
  'PrimaryEmail',
  'SecondaryEmail',
  'WebSite',
  'LoginID',
  'Password',
  'ShopRegisterDate',
  'NTN',
  'STN',
  'NTNStatus',
  'STNStatus',
  'CompanyType',
  'CreditDays',
  'CreditLimit',
  'BankName',
  'BranchName',
  'BranchCode',
  'BusinessAccountNumber',
  'BranchAddress',
  'BranchTelNo',
  'BranchCity',
  'IBAN',
];

const sndKeys = [
  'CustomorName',
  'phone',
  'email',
  'Address',
  'NTN',
  'STN',
  'Fax',
  'WebSite',
  'ShopOwner',
  'OwnerCnic',
  'ShopRegisterDate',
  'OrderBooker',
];

export const cloudDefaults = (): CustomerValues => blank(cloudKeys, {
  Type: 'Cust',
  TransportType: 'LTP',
  NTNStatus: 'active',
  STNStatus: 'active',
  ShopRegisterDate: today(),
});

export const sndDefaults = (): CustomerValues => blank(sndKeys, {
  ShopRegisterDate: today(),
});

const nicError = (value: string, label: string) => {
  if (!value.trim()) return `${label} is required.`;
  if (!CNIC_PATTERN.test(value.trim())) return `${label} format should be like 42301-68438451-1`;
  return '';
};

export type CustomerFieldErrors = Record<string, string>;

export type CustomerValidation = {
  fields: CustomerFieldErrors;
  message: string;
  firstKey: string;
};

export const customerValidation = (
  server: LoginServer,
  values: CustomerValues,
  distributorId: string,
): CustomerValidation => {
  const fields: CustomerFieldErrors = {};

  if (server === 'snd') {
    if (!values.CustomorName?.trim()) fields.CustomorName = 'Customer name is required.';
    const nic = nicError(values.OwnerCnic || '', 'NIC');
    if (nic) fields.OwnerCnic = nic;
    if (!distributorId) {
      return {
        fields,
        message: 'Distributor is missing. Sign in again.',
        firstKey: Object.keys(fields)[0] || '',
      };
    }
  } else {
    if (!values.DistrbutorName?.trim()) fields.DistrbutorName = 'Customer name is required.';
    const ownerNic = nicError(values.OwnerCnic || '', 'Owner CNIC');
    if (ownerNic) fields.OwnerCnic = ownerNic;
    const cnic = nicError(values.CNICNo || '', 'CNIC No.');
    if (cnic) fields.CNICNo = cnic;
    if (!values.MobileNo?.trim()) fields.MobileNo = 'Mobile No. is required.';
  }

  const keys = Object.keys(fields);
  const firstKey = keys[0] || '';
  const message = keys.length === 0
    ? ''
    : keys.length === 1
      ? fields[firstKey]
      : `Please fix ${keys.length} fields below.`;

  return { fields, message, firstKey };
};

/** @deprecated Prefer customerValidation for field-level errors. */
export const customerError = (server: LoginServer, values: CustomerValues, distributorId: string) =>
  customerValidation(server, values, distributorId).message;

const trimValues = (values: CustomerValues) => {
  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === 'PriceList') continue;
    payload[key] = typeof value === 'string' ? value.trim() : '';
  }
  return payload;
};

export const cloudPayload = (values: CustomerValues) => {
  const payload = trimValues(values);
  if (payload.Type === 'Cust') {
    delete payload.LoginID;
    delete payload.Password;
  }
  return payload;
};

export const sndPayload = (
  values: CustomerValues,
  extras: { code: string; distributorId: string; orderBookerId: string },
) => {
  const payload = trimValues(values);
  payload.code = extras.code;
  payload.Distributor = extras.distributorId;
  payload.OrderBooker = payload.OrderBooker || extras.orderBookerId;
  return payload;
};

const distributorOnly = (values: CustomerValues) => values.Type === 'Distr';

export const cloudSections: CustomerSection[] = [
  {
    title: 'Customer information',
    fields: [
      { key: 'DistrbutorName', label: 'Customer Name', required: true },
      { key: 'OwnerName', label: 'Owner Name' },
      { key: 'OwnerCnic', label: 'Owner CNIC', required: true, input: 'cnic' },
      { key: 'Type', label: 'Type', input: 'select', optionsKey: 'types' },
      { key: 'OrderBooker', label: 'Order Booker', input: 'select', optionsKey: 'orderBookers' },
      { key: 'ContactPerson1', label: 'Contact Person 1' },
      { key: 'ContactPerson2', label: 'Contact Person 2' },
      { key: 'ContactPerson3', label: 'Contact Person 3' },
      { key: 'Designation', label: 'Designation' },
      { key: 'Address1', label: 'Address 1' },
      { key: 'Address2', label: 'Address 2' },
      { key: 'Address3', label: 'Address 3' },
      { key: 'CNICNo', label: 'CNIC No.', required: true, input: 'cnic' },
      { key: 'Country', label: 'Country' },
      { key: 'Province', label: 'Province' },
      { key: 'City', label: 'City', input: 'select', optionsKey: 'cities' },
      { key: 'MobilePhoneNo', label: 'Mobile Phone No.', input: 'phone' },
      { key: 'TransportType', label: 'TRP Type', input: 'select', optionsKey: 'transportTypes' },
      { key: 'Transporter', label: 'Transporter', input: 'select', optionsKey: 'transporters' },
      { key: 'MobileNo', label: 'Mobile No. 1', required: true, input: 'phone' },
      { key: 'MobileNo2', label: 'Mobile No. 2', input: 'phone' },
      { key: 'CountryCode', label: 'Country Code' },
      { key: 'PostalCode', label: 'Postal Code' },
      { key: 'Fax', label: 'Fax', input: 'phone' },
      { key: 'PrimaryEmail', label: 'Primary Email', input: 'email' },
      { key: 'SecondaryEmail', label: 'Secondary Email', input: 'email' },
      { key: 'WebSite', label: 'WebSite' },
      { key: 'LoginID', label: 'Login Id', when: distributorOnly },
      { key: 'Password', label: 'Password', when: distributorOnly },
      { key: 'ShopRegisterDate', label: 'Shop Register Date', input: 'date' },
    ],
  },
  {
    title: 'Financial / Tax',
    fields: [
      { key: 'NTN', label: 'NTN' },
      { key: 'STN', label: 'STN' },
      { key: 'NTNStatus', label: 'NTN Active', input: 'select', optionsKey: 'activeStatus' },
      { key: 'STNStatus', label: 'STN Active', input: 'select', optionsKey: 'activeStatus' },
      { key: 'CompanyType', label: 'Company Type' },
      { key: 'CreditDays', label: 'Credit Days', input: 'number' },
      { key: 'CreditLimit', label: 'Credit Limit', input: 'number' },
    ],
  },
  {
    title: 'Banking',
    fields: [
      { key: 'BankName', label: 'Bank Name' },
      { key: 'BranchName', label: 'Branch Name' },
      { key: 'BranchCode', label: 'Branch Code' },
      { key: 'BusinessAccountNumber', label: 'Business Account Number' },
      { key: 'BranchAddress', label: 'Branch Address' },
      { key: 'BranchTelNo', label: 'Branch Tel. No', input: 'phone' },
      { key: 'BranchCity', label: 'Branch City' },
      { key: 'IBAN', label: 'IBAN' },
    ],
  },
];

export const sndSections: CustomerSection[] = [
  {
    title: 'Customer information',
    fields: [
      { key: 'CustomorName', label: 'Customer Name', required: true },
      { key: 'phone', label: 'Phone', input: 'phone' },
      { key: 'email', label: 'Email', input: 'email' },
      { key: 'Address', label: 'Address' },
      { key: 'NTN', label: 'NTN' },
      { key: 'STN', label: 'STN' },
      { key: 'Fax', label: 'Fax', input: 'phone' },
      { key: 'WebSite', label: 'WebSite' },
      { key: 'ShopOwner', label: 'Owner Name' },
      { key: 'OwnerCnic', label: 'Owner CNIC', required: true, input: 'cnic' },
      { key: 'ShopRegisterDate', label: 'Shop Register Date', input: 'date' },
      { key: 'OrderBooker', label: 'Order Booker', input: 'select', optionsKey: 'orderBookers' },
    ],
  },
];
