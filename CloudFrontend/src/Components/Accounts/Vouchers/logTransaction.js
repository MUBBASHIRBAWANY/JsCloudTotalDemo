import { createDataFunction } from '../../../Api/CRUDFunctions';

const buildLogPayload = ({ data, loginVendor, type }) => ({
  VoucherNumber: data?.VoucherNumber ?? null,
  createdBy: loginVendor?.firstname ?? 'Unknown',
  type,
  changes: data ?? {},
});

export const logTransaction = async ({ data, loginVendor, type }) => {
  const payload = buildLogPayload({ data, loginVendor, type });

  try {
    await createDataFunction('/Log', payload);
  } catch (error) {
    console.error('Logging failed:', error);
  }
};
