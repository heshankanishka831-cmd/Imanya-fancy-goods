export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val || 0);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export const getStatusBadgeClass = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'CONFIRMED':
    case 'ORDERED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PROCESSING':
    case 'PARTIALLY_RECEIVED':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'PENDING':
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};
